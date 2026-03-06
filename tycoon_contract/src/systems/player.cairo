// Self-service only: everyone registers himself. Registration bonus voucher minted via reward contract.
// Username: non-empty (enforced); max length 32 (TycoonLib.USERNAME_MAX_LENGTH) — frontend should enforce.
use tycoon::model::player_model::{AddressToUsername, Registered, User, Stats};
use tycoon::model::config_model::PlayerConfig;
use starknet::ContractAddress;

const REGISTRATION_VOUCHER: u256 = 2000000000000000000; // 2 * 1e18

#[starknet::interface]
pub trait IPlayer<T> {
    fn init_player_config(ref self: T, reward_contract: ContractAddress);
    /// Register yourself. Caller gets registration bonus voucher (2*TYC) from reward contract.
    fn register_player(ref self: T, username: felt252) -> u256;
    fn get_user(self: @T, username: felt252) -> User;
    fn is_registered(self: @T, address: ContractAddress) -> bool;
    fn get_username(self: @T, address: ContractAddress) -> felt252;
}

#[dojo::contract]
mod player {
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, contract_address_const};
    use tycoon::model::player_model::{AddressToUsername, Registered, User, Stats};
    use tycoon::model::config_model::PlayerConfig;
    use tycoon::interfaces::{IRewardDispatcher, IRewardDispatcherTrait};
    use super::{IPlayer, REGISTRATION_VOUCHER};

    #[abi(embed_v0)]
    impl PlayerImpl of IPlayer<ContractState> {
        fn init_player_config(ref self: ContractState, reward_contract: ContractAddress) {
            let mut world = self.world_default();
            let cfg: PlayerConfig = world.read_model('player_config');
            assert(cfg.reward_contract == contract_address_const::<0>(), 'already inited');
            world.write_model(@PlayerConfig { id: 'player_config', reward_contract });
        }

        fn register_player(ref self: ContractState, username: felt252) -> u256 {
            let mut world = self.world_default();
            let caller = get_caller_address();
            assert(username != 0, 'username empty');
            let existing: User = world.read_model(username);
            assert(existing.player_address == contract_address_const::<0>(), 'username taken');
            let reg: Registered = world.read_model(caller);
            assert(!reg.is_registered, 'already registered');

            let mut stats: Stats = world.read_model('stats');
            stats.total_users += 1;
            let user_id = stats.total_users;
            world.write_model(@stats);

            let ts = get_block_timestamp();
            let new_user = User {
                username,
                id: user_id,
                player_address: caller,
                registered_at: ts,
                games_played: 0,
                games_won: 0,
                games_lost: 0,
                total_staked: 0,
                total_earned: 0,
                total_withdrawn: 0,
                properties_bought: 0,
                properties_sold: 0,
            };
            world.write_model(@new_user);

            let reg_new = Registered { address: caller, is_registered: true };
            world.write_model(@reg_new);
            let addr_to_user = AddressToUsername { address: caller, username };
            world.write_model(@addr_to_user);

            let cfg: PlayerConfig = world.read_model('player_config');
            if cfg.reward_contract != contract_address_const::<0>() {
                let reward = IRewardDispatcher { contract_address: cfg.reward_contract };
                reward.mint_voucher(caller, REGISTRATION_VOUCHER);
            }

            user_id
        }

        fn get_user(self: @ContractState, username: felt252) -> User {
            let world = self.world_default();
            let u: User = world.read_model(username);
            u
        }

        fn is_registered(self: @ContractState, address: ContractAddress) -> bool {
            let world = self.world_default();
            let r: Registered = world.read_model(address);
            r.is_registered
        }

        fn get_username(self: @ContractState, address: ContractAddress) -> felt252 {
            let world = self.world_default();
            let a: AddressToUsername = world.read_model(address);
            a.username
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"tycoon")
        }
    }
}
