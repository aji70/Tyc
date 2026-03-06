// TYC token - ERC20-like. Implements tycoon::interfaces::IToken for cross-contract calls.
use tycoon::model::token_model::{TycAllowance, TycBalance, TokenConfig, TotalSupply};
use tycoon::interfaces::IToken;

#[dojo::contract]
mod token {
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_caller_address, contract_address_const};
    use tycoon::model::token_model::{TycAllowance, TycBalance, TokenConfig, TotalSupply};
    use tycoon::interfaces::IToken;

    #[abi(embed_v0)]
    impl TokenImpl of IToken<ContractState> {
        /// Call with owner == 0 once to seed the world (no prior state needed). Then call with real owner to set owner. No external seed required.
        fn init_token(ref self: ContractState, owner: ContractAddress) {
            let mut world = self.world_default();
            let zero = contract_address_const::<0>();
            if owner == zero {
                world.write_model(@TokenConfig { id: 'config', owner: zero });
                world.write_model(@TotalSupply { id: 'total_supply', value: 0 });
            } else {
                let cfg: TokenConfig = world.read_model('config');
                assert(cfg.owner == zero, 'already inited');
                world.write_model(@TokenConfig { id: 'config', owner });
                world.write_model(@TotalSupply { id: 'total_supply', value: 0 });
            }
        }

        fn balance_of(self: @ContractState, owner: ContractAddress) -> u256 {
            let world = self.world_default();
            let b: TycBalance = world.read_model(owner);
            b.balance
        }

        fn total_supply(self: @ContractState) -> u256 {
            let world = self.world_default();
            let t: TotalSupply = world.read_model('total_supply');
            t.value
        }

        fn name(self: @ContractState) -> felt252 {
            'Tycoon'
        }

        fn symbol(self: @ContractState) -> felt252 {
            'TYC'
        }

        fn decimals(self: @ContractState) -> u8 {
            18
        }

        fn transfer(ref self: ContractState, to: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            if amount == 0 {
                return true;
            }
            let mut world = self.world_default();
            let mut from_bal: TycBalance = world.read_model(caller);
            assert(from_bal.balance >= amount, 'insufficient balance');
            from_bal.balance -= amount;
            world.write_model(@from_bal);

            let mut to_bal: TycBalance = world.read_model(to);
            to_bal.balance += amount;
            world.write_model(@to_bal);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            let mut world = self.world_default();
            let mut allow: TycAllowance = world.read_model((caller, spender));
            allow.owner = caller;
            allow.spender = spender;
            allow.amount = amount;
            world.write_model(@allow);
            true
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            let world = self.world_default();
            let allow: TycAllowance = world.read_model((owner, spender));
            allow.amount
        }

        fn transfer_from(ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256) -> bool {
            if amount == 0 {
                return true;
            }
            let caller = get_caller_address();
            let mut world = self.world_default();
            let mut allow: TycAllowance = world.read_model((from, caller));
            assert(allow.amount >= amount, 'insufficient allowance');
            allow.amount -= amount;
            world.write_model(@allow);

            let mut from_bal: TycBalance = world.read_model(from);
            assert(from_bal.balance >= amount, 'insufficient balance');
            from_bal.balance -= amount;
            world.write_model(@from_bal);

            let mut to_bal: TycBalance = world.read_model(to);
            to_bal.balance += amount;
            world.write_model(@to_bal);
            true
        }

        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            let mut world = self.world_default();
            let cfg: TokenConfig = world.read_model('config');
            assert(cfg.owner != contract_address_const::<0>(), 'token not inited');
            assert(caller == cfg.owner, 'only owner can mint');
            let mut to_bal: TycBalance = world.read_model(to);
            to_bal.balance += amount;
            world.write_model(@to_bal);
            let mut ts: TotalSupply = world.read_model('total_supply');
            ts.value += amount;
            world.write_model(@ts);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"tycoon")
        }
    }
}
