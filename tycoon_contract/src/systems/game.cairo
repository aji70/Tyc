// Self-service only: no backend signing. Stakes, house, exit payouts, AI games.
use tycoon::model::game_model::{
    CodeToGame, Game, GameCounter, GameOrderToPlayer, GameSettings, GameStatus, GameType,
};
use tycoon::model::game_player_model::{GamePlayer, PlayerSymbol};
use tycoon::model::player_model::{AddressToUsername, User};
use tycoon::model::config_model::{Claim, GameConfig, HouseBalance, PreviousGameCode, TurnsPlayed};
use tycoon::model::player_model::Stats;
use starknet::ContractAddress;

// TycoonLib payout constants
const HOUSE_PERCENT: u256 = 5;
const RANK1_PERCENT: u256 = 50;
const RANK2_PERCENT: u256 = 30;
const RANK3_PERCENT: u256 = 20;
const TOKEN_REWARD: u256 = 1000000000000000000; // 1e18
const CONSOLATION_VOUCHER: u256 = 100000000000000000; // TOKEN_REWARD/10
// Validation (Solidity TycoonLib; frontend should enforce length; felt252 has no on-chain byte length)
const USERNAME_MAX_LENGTH: u256 = 32;
const CODE_MAX_LENGTH: u256 = 16;

#[starknet::interface]
pub trait IGame<T> {
    /// One-time init: set min_stake, stake_token, reward_contract, owner. No backend.
    fn init_game_config(
        ref self: T,
        min_stake: u256,
        stake_token: ContractAddress,
        reward_contract: ContractAddress,
        owner: ContractAddress,
    );
    fn set_min_stake(ref self: T, new_min_stake: u256);
    /// Owner sets the address allowed to call set_turn_count (e.g. backend/oracle). Pass 0 to clear.
    fn set_backend_controller(ref self: T, new_controller: ContractAddress);
    /// Owner sets min turns required for full perks on exit. 0 = disabled.
    fn set_min_turns_for_perks(ref self: T, new_min: u256);
    /// Owner or game controller sets player turn count (only increase). For perk eligibility on exit.
    fn set_turn_count(ref self: T, game_id: u256, player: ContractAddress, count: u256);
    /// Owner withdraws accumulated house cut (5% of pots).
    fn withdraw_house(ref self: T, amount: u256);
    /// Owner drains all stake token held by this contract.
    fn drain_contract(ref self: T);
    /// Create a game as yourself. Stakes held by game contract.
    fn create_game(
        ref self: T,
        creator_username: felt252,
        game_type: felt252,
        player_symbol: felt252,
        number_of_players: u8,
        code: felt252,
        starting_balance: u256,
        stake_amount: u256,
    ) -> u256;
    fn join_game(
        ref self: T,
        game_id: u256,
        player_username: felt252,
        player_symbol: felt252,
        join_code: felt252,
    ) -> u8;
    fn leave_pending_game(ref self: T, game_id: u256) -> bool;
    /// Exit ongoing game; rank-based payout (stake token + voucher/collectible via reward contract).
    fn exit_game(ref self: T, game_id: u256) -> bool;
    /// Create AI game (no stake). Creator is sole human; AI slots are placeholder addresses.
    fn create_ai_game(
        ref self: T,
        creator_username: felt252,
        game_type: felt252,
        player_symbol: felt252,
        number_of_ai: u8,
        code: felt252,
        starting_balance: u256,
    ) -> u256;
    /// Creator ends AI game; receives voucher (+ optional collectible if win).
    fn end_ai_game(ref self: T, game_id: u256, final_position: u8, final_balance: u256, is_win: bool) -> bool;
    /// Buyer calls to record property sale (seller_username, buyer_username). Updates properties_sold / properties_bought.
    fn transfer_property_ownership(ref self: T, seller_username: felt252, buyer_username: felt252);
    fn get_game(self: @T, game_id: u256) -> Game;
    fn get_game_player(self: @T, game_id: u256, player: ContractAddress) -> GamePlayer;
    fn get_game_settings(self: @T, game_id: u256) -> GameSettings;
    fn get_players_in_game(self: @T, game_id: u256) -> Array<ContractAddress>;
    fn get_game_by_code(self: @T, code: felt252) -> Game;
    fn get_last_game_code(self: @T, account: ContractAddress) -> felt252;
}

fn game_type_from_felt(g: felt252) -> GameType {
    if g == 'PUBLICGAME' || g == 'PUBLIC' {
        GameType::PublicGame
    } else if g == 'PRIVATEGAME' || g == 'PRIVATE' {
        GameType::PrivateGame
    } else {
        panic!("invalid game type")
    }
}

fn player_symbol_from_felt(s: felt252) -> PlayerSymbol {
    if s == 'HAT' || s == 'hat' {
        PlayerSymbol::Hat
    } else if s == 'CAR' || s == 'car' {
        PlayerSymbol::Car
    } else if s == 'DOG' || s == 'dog' {
        PlayerSymbol::Dog
    } else if s == 'THIMBLE' || s == 'thimble' {
        PlayerSymbol::Thimble
    } else if s == 'IRON' || s == 'iron' {
        PlayerSymbol::Iron
    } else if s == 'BATTLESHIP' || s == 'battleship' {
        PlayerSymbol::Battleship
    } else if s == 'BOOT' || s == 'boot' {
        PlayerSymbol::Boot
    } else if s == 'WHEELBARROW' || s == 'wheelbarrow' {
        PlayerSymbol::Wheelbarrow
    } else {
        panic!("invalid player symbol")
    }
}

#[dojo::contract]
mod game {
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_caller_address, get_contract_address, get_block_timestamp, contract_address_const};
    use tycoon::interfaces::{
        ITokenDispatcher, ITokenDispatcherTrait, IRewardDispatcher, IRewardDispatcherTrait,
    };
    use tycoon::model::game_model::{
        CodeToGame, Game, GameCounter, GameOrderToPlayer, GameSettings, GameStatus, GameType,
    };
    use tycoon::model::game_player_model::{GamePlayer, PlayerSymbol};
    use tycoon::model::player_model::{AddressToUsername, User, Stats};
    use tycoon::model::config_model::{Claim, GameConfig, HouseBalance, PreviousGameCode, TurnsPlayed};
    use super::{
        IGame, game_type_from_felt, player_symbol_from_felt,
        HOUSE_PERCENT, RANK1_PERCENT, RANK2_PERCENT, RANK3_PERCENT,
        TOKEN_REWARD, CONSOLATION_VOUCHER,
    };

    #[abi(embed_v0)]
    impl GameImpl of IGame<ContractState> {
        fn init_game_config(
            ref self: ContractState,
            min_stake: u256,
            stake_token: ContractAddress,
            reward_contract: ContractAddress,
            owner: ContractAddress,
        ) {
            let mut world = self.world_default();
            let cfg: GameConfig = world.read_model('config');
            assert(cfg.stake_token == contract_address_const::<0>(), 'already inited');
            let config = GameConfig {
                id: 'config',
                min_stake,
                stake_token,
                backend_controller: contract_address_const::<0>(),
                min_turns_for_perks: 0,
                owner,
                reward_contract,
            };
            world.write_model(@config);
            let house = HouseBalance { id: 'house', amount: 0 };
            world.write_model(@house);
        }

        fn set_min_stake(ref self: ContractState, new_min_stake: u256) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut cfg: GameConfig = world.read_model('config');
            assert(caller == cfg.owner, 'not owner');
            cfg.min_stake = new_min_stake;
            world.write_model(@cfg);
        }

        fn set_backend_controller(ref self: ContractState, new_controller: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut cfg: GameConfig = world.read_model('config');
            assert(caller == cfg.owner, 'not owner');
            cfg.backend_controller = new_controller;
            world.write_model(@cfg);
        }

        fn set_min_turns_for_perks(ref self: ContractState, new_min: u256) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut cfg: GameConfig = world.read_model('config');
            assert(caller == cfg.owner, 'not owner');
            cfg.min_turns_for_perks = new_min;
            world.write_model(@cfg);
        }

        fn set_turn_count(ref self: ContractState, game_id: u256, player: ContractAddress, count: u256) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let cfg: GameConfig = world.read_model('config');
            assert(caller == cfg.owner || caller == cfg.backend_controller, 'not game controller');
            let gp: GamePlayer = world.read_model((game_id, player));
            assert(gp.order != 0, 'not in game');
            let tp: TurnsPlayed = world.read_model((game_id, player));
            assert(count > tp.count, 'can only increase');
            let new_tp = TurnsPlayed { game_id, player, count };
            world.write_model(@new_tp);
        }

        fn withdraw_house(ref self: ContractState, amount: u256) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let cfg: GameConfig = world.read_model('config');
            assert(caller == cfg.owner, 'not owner');
            let mut house: HouseBalance = world.read_model('house');
            assert(house.amount >= amount, 'insufficient house balance');
            house.amount -= amount;
            world.write_model(@house);
            let stake_token = cfg.stake_token;
            let token = ITokenDispatcher { contract_address: stake_token };
            token.transfer(caller, amount);
        }

        fn drain_contract(ref self: ContractState) {
            let world = self.world_default();
            let caller = get_caller_address();
            let cfg: GameConfig = world.read_model('config');
            assert(caller == cfg.owner, 'not owner');
            let game_addr = get_contract_address();
            let token = ITokenDispatcher { contract_address: cfg.stake_token };
            let bal = token.balance_of(game_addr);
            if bal > 0 {
                token.transfer(caller, bal);
            }
        }

        fn create_game(
            ref self: ContractState,
            creator_username: felt252,
            game_type: felt252,
            player_symbol: felt252,
            number_of_players: u8,
            code: felt252,
            starting_balance: u256,
            stake_amount: u256,
        ) -> u256 {
            let mut world = self.world_default();
            let caller = get_caller_address();
            assert(creator_username != 0, 'username empty');
            assert(number_of_players >= 2 && number_of_players <= 8, 'players 2-8');
            assert(starting_balance > 0, 'invalid balance');

            let cfg: GameConfig = world.read_model('config');
            if stake_amount > 0 {
                assert(stake_amount >= cfg.min_stake, 'stake too low');
                assert(cfg.stake_token != contract_address_const::<0>(), 'stake token not set');
                let token = ITokenDispatcher { contract_address: cfg.stake_token };
                token.transfer_from(caller, get_contract_address(), stake_amount);
            }

            let user: User = world.read_model(creator_username);
            assert(user.player_address == caller, 'use your own username');
            assert(user.id > 0, 'not registered');

            let g_type = game_type_from_felt(game_type);
            if g_type == GameType::PrivateGame {
                assert(code != 0, 'code required for private');
            }

            let mut counter: GameCounter = world.read_model('v0');
            counter.current_val += 1;
            let game_id = counter.current_val;
            world.write_model(@counter);

            let mut stats: Stats = world.read_model('stats');
            stats.total_games += 1;
            world.write_model(@stats);

            let ts = get_block_timestamp();
            let settings = GameSettings {
                game_id,
                max_players: number_of_players,
                auction: true,
                rent_in_prison: true,
                mortgage: true,
                even_build: true,
                starting_cash: starting_balance,
                private_room_code: code,
            };
            world.write_model(@settings);

            let sym = player_symbol_from_felt(player_symbol);
            let game = Game {
                id: game_id,
                code,
                creator: caller,
                status: GameStatus::Pending.into(),
                winner: contract_address_const::<0>(),
                number_of_players,
                joined_players: 1,
                mode: g_type.into(),
                ai: false,
                stake_per_player: stake_amount,
                total_staked: stake_amount,
                created_at: ts,
                ended_at: 0,
            };
            world.write_model(@game);

            let gp = GamePlayer {
                game_id,
                player_address: caller,
                balance: starting_balance,
                position: 0,
                order: 1,
                symbol: sym.into(),
                username: creator_username,
            };
            world.write_model(@gp);

            let order_to_player = GameOrderToPlayer { game_id, order: 1, player: caller };
            world.write_model(@order_to_player);

            world.write_model(@TurnsPlayed { game_id, player: caller, count: 0 });

            if code != 0 {
                let ctg = CodeToGame { code, game_id };
                world.write_model(@ctg);
            }
            let prev_code = PreviousGameCode { player: caller, code };
            world.write_model(@prev_code);

            // Update user stats (games_played, total_staked)
            let mut u: User = world.read_model(creator_username);
            u.games_played += 1;
            u.total_staked += stake_amount;
            world.write_model(@u);

            game_id
        }

        fn join_game(
            ref self: ContractState,
            game_id: u256,
            player_username: felt252,
            player_symbol: felt252,
            join_code: felt252,
        ) -> u8 {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut game: Game = world.read_model(game_id);
            assert(game.creator != contract_address_const::<0>(), 'game not found');
            assert(!game.ai, 'cannot join AI game');
            assert(game.status == GameStatus::Pending.into(), 'game not open');
            assert(game.joined_players < game.number_of_players, 'game full');

            if game.stake_per_player > 0 {
                let cfg: GameConfig = world.read_model('config');
                let token = ITokenDispatcher { contract_address: cfg.stake_token };
                token.transfer_from(caller, get_contract_address(), game.stake_per_player);
            }

            let user: User = world.read_model(player_username);
            assert(user.player_address == caller, 'use your own username');
            let existing_gp: GamePlayer = world.read_model((game_id, caller));
            assert(existing_gp.order == 0, 'already joined');

            if game.mode == GameType::PrivateGame.into() {
                assert(join_code == game.code, 'wrong code');
            }

            game.joined_players += 1;
            let order = game.joined_players;
            game.total_staked += game.stake_per_player;
            let settings: GameSettings = world.read_model(game_id);
            world.write_model(@game);

            let sym = player_symbol_from_felt(player_symbol);
            let gp = GamePlayer {
                game_id,
                player_address: caller,
                balance: settings.starting_cash,
                position: 0,
                order,
                symbol: sym.into(),
                username: player_username,
            };
            world.write_model(@gp);

            let order_to_player = GameOrderToPlayer { game_id, order, player: caller };
            world.write_model(@order_to_player);

            world.write_model(@TurnsPlayed { game_id, player: caller, count: 0 });

            let mut u: User = world.read_model(player_username);
            u.games_played += 1;
            u.total_staked += game.stake_per_player;
            world.write_model(@u);

            let prev_code = PreviousGameCode { player: caller, code: game.code };
            world.write_model(@prev_code);

            if game.joined_players == game.number_of_players {
                let mut g2: Game = world.read_model(game_id);
                g2.status = GameStatus::Ongoing.into();
                world.write_model(@g2);
            }

            order
        }

        fn leave_pending_game(ref self: ContractState, game_id: u256) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut game: Game = world.read_model(game_id);
            assert(game.creator != contract_address_const::<0>(), 'game not found');
            assert(game.status == GameStatus::Pending.into(), 'game already started');
            assert(!game.ai, 'not for AI games');

            let gp: GamePlayer = world.read_model((game_id, caller));
            assert(gp.order != 0, 'not in game');

            let stake_amount = game.stake_per_player;
            game.total_staked -= stake_amount;
            game.joined_players -= 1;
            if game.joined_players == 0 {
                game.status = GameStatus::Ended.into();
            }
            world.write_model(@game);

            let mut u: User = world.read_model(gp.username);
            u.games_played -= 1;
            u.total_staked -= stake_amount;
            world.write_model(@u);

            if stake_amount > 0 {
                let cfg: GameConfig = world.read_model('config');
                let token = ITokenDispatcher { contract_address: cfg.stake_token };
                token.transfer(caller, stake_amount);
            }

            let zero = contract_address_const::<0>();
            let gp_out = GamePlayer {
                game_id,
                player_address: caller,
                balance: 0,
                position: 0,
                order: 0,
                symbol: 0,
                username: 0,
            };
            world.write_model(@gp_out);
            let gop_clear = GameOrderToPlayer { game_id, order: gp.order, player: zero };
            world.write_model(@gop_clear);
            true
        }

        fn exit_game(ref self: ContractState, game_id: u256) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut game: Game = world.read_model(game_id);
            assert(game.status == GameStatus::Ongoing.into(), 'game not ongoing');
            assert(!game.ai, 'cannot exit AI game');
            let gp: GamePlayer = world.read_model((game_id, caller));
            assert(gp.order != 0, 'not in game');

            let rank: u256 = game.joined_players.into();
            let cfg: GameConfig = world.read_model('config');
            let stake_token = cfg.stake_token;
            let reward_addr = cfg.reward_contract;
            let pot = game.total_staked;

            let tp: TurnsPlayed = world.read_model((game_id, caller));
            let consolation_only = cfg.min_turns_for_perks > 0 && tp.count < cfg.min_turns_for_perks;

            // Remove player first
            let mut u: User = world.read_model(gp.username);
            u.games_lost += 1;
            world.write_model(@u);

            let zero = contract_address_const::<0>();
            let gp_del = GamePlayer {
                game_id,
                player_address: caller,
                balance: 0,
                position: 0,
                order: 0,
                symbol: 0,
                username: 0,
            };
            world.write_model(@gp_del);
            let gop_clear = GameOrderToPlayer { game_id, order: gp.order, player: zero };
            world.write_model(@gop_clear);

            game.joined_players -= 1;

            // Payout exiting player: rank share of 95% of pot (5% house when game ends)
            if pot > 0 && stake_token != zero {
                let distributable = pot * (100 - HOUSE_PERCENT) / 100;
                let reward_amount = if rank == 1 {
                    distributable * RANK1_PERCENT / 100
                } else if rank == 2 {
                    distributable * RANK2_PERCENT / 100
                } else if rank == 3 {
                    distributable * RANK3_PERCENT / 100
                } else {
                    0
                };
                if reward_amount > 0 {
                    let token = ITokenDispatcher { contract_address: stake_token };
                    token.transfer(caller, reward_amount);
                }
            }

            // Voucher + collectible via reward contract (game_contract is only minter)
            if reward_addr != zero {
                let reward = IRewardDispatcher { contract_address: reward_addr };
                let voucher_amount = if consolation_only || rank > 3 {
                    CONSOLATION_VOUCHER
                } else {
                    TOKEN_REWARD
                };
                reward.mint_voucher(caller, voucher_amount);
                if !consolation_only && rank >= 1 && rank <= 3 {
                    let strength: u256 = if rank == 1 { 2 } else { 1 };
                    reward.mint_collectible(caller, 1, strength); // 1 = ExtraTurn
                }
            }

            world.write_model(@Claim { game_id, player: caller, rank });

            if game.joined_players == 1 {
                // Winner: remaining player gets rank 1 payout, game ends
                let mut i: u8 = 1;
                let mut winner = zero;
                while i <= game.number_of_players {
                    let gop: GameOrderToPlayer = world.read_model((game_id, i));
                    if gop.player != zero && gop.player != caller {
                        winner = gop.player;
                        break;
                    }
                    i += 1;
                };
                if winner != zero {
                    let mut g2: Game = world.read_model(game_id);
                    g2.status = GameStatus::Ended.into();
                    g2.winner = winner;
                    g2.ended_at = get_block_timestamp();
                    world.write_model(@g2);

                    let winner_gp: GamePlayer = world.read_model((game_id, winner));
                    let mut winner_user: User = world.read_model(winner_gp.username);
                    winner_user.games_won += 1;
                    world.write_model(@winner_user);

                    if pot > 0 && stake_token != zero {
                        let house_cut = pot * HOUSE_PERCENT / 100;
                        let mut house: HouseBalance = world.read_model('house');
                        house.amount += house_cut;
                        world.write_model(@house);
                        let distributable = pot * (100 - HOUSE_PERCENT) / 100;
                        let winner_amount = distributable * RANK1_PERCENT / 100;
                        let token = ITokenDispatcher { contract_address: stake_token };
                        token.transfer(winner, winner_amount);
                    }
                    if reward_addr != zero {
                        let reward = IRewardDispatcher { contract_address: reward_addr };
                        reward.mint_voucher(winner, TOKEN_REWARD);
                        reward.mint_collectible(winner, 1, 2); // ExtraTurn strength 2
                    }
                    world.write_model(@Claim { game_id, player: winner, rank: 1 });
                }
            } else {
                world.write_model(@game);
            }
            true
        }

        fn create_ai_game(
            ref self: ContractState,
            creator_username: felt252,
            game_type: felt252,
            player_symbol: felt252,
            number_of_ai: u8,
            code: felt252,
            starting_balance: u256,
        ) -> u256 {
            let mut world = self.world_default();
            let caller = get_caller_address();
            assert(creator_username != 0, 'username empty');
            assert(number_of_ai >= 1 && number_of_ai <= 7, 'AI players 1-7');
            assert(starting_balance > 0, 'invalid balance');

            let user: User = world.read_model(creator_username);
            assert(user.player_address == caller, 'use your own username');
            assert(user.id > 0, 'not registered');

            let g_type = game_type_from_felt(game_type);
            let mut counter: GameCounter = world.read_model('v0');
            counter.current_val += 1;
            let game_id = counter.current_val;
            world.write_model(@counter);

            let mut stats: Stats = world.read_model('stats');
            stats.total_games += 1;
            world.write_model(@stats);

            let total_players = 1 + number_of_ai;
            let ts = get_block_timestamp();
            let settings = GameSettings {
                game_id,
                max_players: total_players,
                auction: true,
                rent_in_prison: true,
                mortgage: true,
                even_build: true,
                starting_cash: starting_balance,
                private_room_code: code,
            };
            world.write_model(@settings);

            let sym = player_symbol_from_felt(player_symbol);
            let zero = contract_address_const::<0>();
            let game = Game {
                id: game_id,
                code,
                creator: caller,
                status: GameStatus::Ongoing.into(),
                winner: zero,
                number_of_players: total_players,
                joined_players: 1,
                mode: g_type.into(),
                ai: true,
                stake_per_player: 0,
                total_staked: 0,
                created_at: ts,
                ended_at: 0,
            };
            world.write_model(@game);

            let gp = GamePlayer {
                game_id,
                player_address: caller,
                balance: starting_balance,
                position: 0,
                order: 1,
                symbol: sym.into(),
                username: creator_username,
            };
            world.write_model(@gp);
            world.write_model(@GameOrderToPlayer { game_id, order: 1, player: caller });

            // Placeholder AI addresses: use const 1..7 so each AI has distinct key (game_id, addr)
            let mut order: u8 = 2;
            while order <= total_players {
                let ai_addr = if order == 2 { contract_address_const::<1>() }
                    else if order == 3 { contract_address_const::<2>() }
                    else if order == 4 { contract_address_const::<3>() }
                    else if order == 5 { contract_address_const::<4>() }
                    else if order == 6 { contract_address_const::<5>() }
                    else if order == 7 { contract_address_const::<6>() }
                    else { contract_address_const::<7>() };
                world.write_model(@GameOrderToPlayer { game_id, order, player: ai_addr });
                let ai_username = order.into();
                let ai_gp = GamePlayer {
                    game_id,
                    player_address: ai_addr,
                    balance: starting_balance,
                    position: 0,
                    order,
                    symbol: 0,
                    username: ai_username,
                };
                world.write_model(@ai_gp);
                order += 1;
            }

            if code != 0 {
                world.write_model(@CodeToGame { code, game_id });
            }
            world.write_model(@PreviousGameCode { player: caller, code });

            let mut u: User = world.read_model(creator_username);
            u.games_played += 1;
            world.write_model(@u);

            game_id
        }

        fn end_ai_game(
            ref self: ContractState,
            game_id: u256,
            final_position: u8,
            final_balance: u256,
            is_win: bool,
        ) -> bool {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut game: Game = world.read_model(game_id);
            assert(game.ai, 'not AI game');
            assert(game.status == GameStatus::Ongoing.into(), 'game already ended');
            assert(game.creator == caller, 'only creator can end');

            let mut gp: GamePlayer = world.read_model((game_id, caller));
            gp.position = final_position;
            gp.balance = final_balance;
            world.write_model(@gp);

            game.status = GameStatus::Ended.into();
            game.ended_at = get_block_timestamp();
            if is_win {
                game.winner = caller;
                let mut u: User = world.read_model(gp.username);
                u.games_won += 1;
                world.write_model(@u);
            } else {
                let mut u: User = world.read_model(gp.username);
                u.games_lost += 1;
                world.write_model(@u);
            }
            world.write_model(@game);

            let cfg: GameConfig = world.read_model('config');
            if cfg.reward_contract != contract_address_const::<0>() {
                let reward = IRewardDispatcher { contract_address: cfg.reward_contract };
                let voucher_amount = if is_win { 2 * TOKEN_REWARD } else { CONSOLATION_VOUCHER };
                reward.mint_voucher(caller, voucher_amount);
                if is_win {
                    reward.mint_collectible(caller, 1, 1); // ExtraTurn
                }
            }
            true
        }

        fn get_game(self: @ContractState, game_id: u256) -> Game {
            let world = self.world_default();
            world.read_model(game_id)
        }

        fn get_game_player(self: @ContractState, game_id: u256, player: ContractAddress) -> GamePlayer {
            let world = self.world_default();
            world.read_model((game_id, player))
        }

        fn get_game_settings(self: @ContractState, game_id: u256) -> GameSettings {
            let world = self.world_default();
            world.read_model(game_id)
        }

        fn get_players_in_game(self: @ContractState, game_id: u256) -> Array<ContractAddress> {
            let world = self.world_default();
            let game: Game = world.read_model(game_id);
            let mut out: Array<ContractAddress> = array![];
            let mut i: u8 = 1;
            while i <= game.number_of_players {
                let gop: GameOrderToPlayer = world.read_model((game_id, i));
                out.append(gop.player);
                i += 1;
            };
            out
        }

        fn transfer_property_ownership(
            ref self: ContractState,
            seller_username: felt252,
            buyer_username: felt252,
        ) {
            let mut world = self.world_default();
            assert(seller_username != 0 && buyer_username != 0, 'usernames required');
            let mut seller: User = world.read_model(seller_username);
            let mut buyer: User = world.read_model(buyer_username);
            assert(seller.player_address != contract_address_const::<0>(), 'seller not registered');
            assert(buyer.player_address != contract_address_const::<0>(), 'buyer not registered');
            assert(seller.player_address != buyer.player_address, 'seller and buyer must differ');
            seller.properties_sold += 1;
            world.write_model(@seller);
            buyer.properties_bought += 1;
            world.write_model(@buyer);
        }

        fn get_game_by_code(self: @ContractState, code: felt252) -> Game {
            let world = self.world_default();
            let ctg: CodeToGame = world.read_model(code);
            assert(ctg.game_id != 0, 'not found');
            world.read_model(ctg.game_id)
        }

        fn get_last_game_code(self: @ContractState, account: ContractAddress) -> felt252 {
            let world = self.world_default();
            let prev: PreviousGameCode = world.read_model(account);
            prev.code
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"tycoon")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{game_type_from_felt, player_symbol_from_felt};
    use tycoon::model::game_model::GameType;
    use tycoon::model::game_player_model::PlayerSymbol;

    #[test]
    fn test_game_type_from_felt() {
        assert(game_type_from_felt('PUBLICGAME') == GameType::PublicGame, 'PUBLICGAME');
        assert(game_type_from_felt('PUBLIC') == GameType::PublicGame, 'PUBLIC');
        assert(game_type_from_felt('PRIVATEGAME') == GameType::PrivateGame, 'PRIVATEGAME');
        assert(game_type_from_felt('PRIVATE') == GameType::PrivateGame, 'PRIVATE');
    }

    #[test]
    fn test_player_symbol_from_felt() {
        assert(player_symbol_from_felt('HAT') == PlayerSymbol::Hat, 'HAT');
        assert(player_symbol_from_felt('hat') == PlayerSymbol::Hat, 'hat');
        assert(player_symbol_from_felt('CAR') == PlayerSymbol::Car, 'CAR');
        assert(player_symbol_from_felt('WHEELBARROW') == PlayerSymbol::Wheelbarrow, 'WHEELBARROW');
    }

    #[test]
    fn test_player_symbol_from_felt_all() {
        assert(player_symbol_from_felt('DOG') == PlayerSymbol::Dog, 'DOG');
        assert(player_symbol_from_felt('dog') == PlayerSymbol::Dog, 'dog');
        assert(player_symbol_from_felt('THIMBLE') == PlayerSymbol::Thimble, 'THIMBLE');
        assert(player_symbol_from_felt('IRON') == PlayerSymbol::Iron, 'IRON');
        assert(player_symbol_from_felt('BATTLESHIP') == PlayerSymbol::Battleship, 'BATTLESHIP');
        assert(player_symbol_from_felt('BOOT') == PlayerSymbol::Boot, 'BOOT');
        assert(player_symbol_from_felt('boot') == PlayerSymbol::Boot, 'boot');
    }
}
