// Standalone EGS (Embeddable Game Standard) adapter for Tycoon.
// Deploy separately from the Dojo world. Implements IMinigameTokenData so EGS platforms
// can read score/game_over. Tycoon game system calls record_result when a game ends.
// Interface IDs: set to match EGS registry (see docs.provable.games/embeddable-game-standard).

const IMINIGAME_ID: felt252 = 0x4d494e4947414d45; // placeholder; replace with official EGS ID when registering
const ISRC5_ID: felt252 = 0x53524335; // placeholder

#[starknet::interface]
trait IMinigameTokenData<TState> {
    fn score(self: @TState, token_id: felt252) -> u64;
    fn game_over(self: @TState, token_id: felt252) -> bool;
    fn score_batch(self: @TState, token_ids: Span<felt252>) -> Array<u64>;
    fn game_over_batch(self: @TState, token_ids: Span<felt252>) -> Array<bool>;
}

#[starknet::interface]
trait ISRC5<TState> {
    fn supports_interface(self: @TState, interface_id: felt252) -> bool;
}

#[starknet::contract]
mod TycoonEGS {
    use core::array::{ArrayTrait, Span};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, contract_address_const};
    use tycoon::interfaces::IEgsAdapter;

    #[storage]
    struct Storage {
        scores: Map<felt252, u64>,
        game_overs: Map<felt252, bool>,
        supported_interfaces: Map<felt252, bool>,
        owner: ContractAddress,
        authorized_caller: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ScoreUpdate: ScoreUpdate,
        GameOver: GameOver,
    }

    #[derive(Drop, starknet::Event)]
    struct ScoreUpdate {
        #[key]
        token_id: felt252,
        score: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct GameOver {
        #[key]
        token_id: felt252,
        final_score: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.authorized_caller.write(contract_address_const::<0>());
        self.supported_interfaces.write(super::IMINIGAME_ID, true);
        self.supported_interfaces.write(super::ISRC5_ID, true);
    }

    #[abi(embed_v0)]
    impl TycoonEGSImpl of IEgsAdapter<ContractState> {
        fn record_result(ref self: ContractState, game_id: felt252, score: u64) {
            let caller = get_caller_address();
            let auth = self.authorized_caller.read();
            assert(auth != contract_address_const::<0>(), 'adapter not configured');
            assert(caller == auth || caller == self.owner.read(), 'unauthorized');
            assert(!self.game_overs.read(game_id), 'already recorded');
            self.scores.write(game_id, score);
            self.game_overs.write(game_id, true);
            self.emit(ScoreUpdate { token_id: game_id, score });
            self.emit(GameOver { token_id: game_id, final_score: score });
        }

        fn set_authorized_caller(ref self: ContractState, caller: ContractAddress) {
            assert(get_caller_address() == self.owner.read(), 'not owner');
            self.authorized_caller.write(caller);
        }
    }

    #[abi(embed_v0)]
    impl MinigameTokenDataImpl of super::IMinigameTokenData<ContractState> {
        fn score(self: @ContractState, token_id: felt252) -> u64 {
            self.scores.read(token_id)
        }

        fn game_over(self: @ContractState, token_id: felt252) -> bool {
            self.game_overs.read(token_id)
        }

        fn score_batch(self: @ContractState, token_ids: Span<felt252>) -> Array<u64> {
            let mut out = ArrayTrait::new();
            let mut i: u32 = 0;
            loop {
                if i >= token_ids.len() {
                    break;
                }
                out.append(self.scores.read(*token_ids.at(i)));
                i += 1;
            };
            out
        }

        fn game_over_batch(self: @ContractState, token_ids: Span<felt252>) -> Array<bool> {
            let mut out = ArrayTrait::new();
            let mut i: u32 = 0;
            loop {
                if i >= token_ids.len() {
                    break;
                }
                out.append(self.game_overs.read(*token_ids.at(i)));
                i += 1;
            };
            out
        }
    }

    #[abi(embed_v0)]
    impl SRC5Impl of super::ISRC5<ContractState> {
        fn supports_interface(self: @ContractState, interface_id: felt252) -> bool {
            self.supported_interfaces.read(interface_id)
        }
    }
}
