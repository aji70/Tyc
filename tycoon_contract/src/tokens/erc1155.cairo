// Standalone ERC1155 for vouchers + collectibles. Only the Dojo reward system can mint/burn.
// Deploy with reward_contract = tycoon-reward system address; reward system stores this contract via init_reward.
use starknet::ContractAddress;

#[starknet::interface]
pub trait ITycoonERC1155<TContractState> {
    fn balance_of(self: @TContractState, account: ContractAddress, token_id: u256) -> u256;
    fn balance_of_batch(
        self: @TContractState, accounts: Span<ContractAddress>, token_ids: Span<u256>,
    ) -> Array<u256>;
    fn set_approval_for_all(ref self: TContractState, operator: ContractAddress, approved: bool);
    fn is_approved_for_all(
        self: @TContractState, account: ContractAddress, operator: ContractAddress,
    ) -> bool;
    fn safe_transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
        amount: u256,
    );
    fn safe_batch_transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        token_ids: Span<u256>,
        amounts: Span<u256>,
    );
    fn mint(ref self: TContractState, to: ContractAddress, token_id: u256, amount: u256);
    fn burn(ref self: TContractState, from: ContractAddress, token_id: u256, amount: u256);
    fn uri(self: @TContractState, token_id: u256) -> ByteArray;
}

#[starknet::contract]
pub mod TycoonRewardERC1155 {
    use core::num::traits::Zero;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address};

    #[storage]
    struct Storage {
        balances: Map<(u256, ContractAddress), u256>,
        operator_approvals: Map<(ContractAddress, ContractAddress), bool>,
        reward_contract: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        TransferSingle: TransferSingle,
        TransferBatch: TransferBatch,
        ApprovalForAll: ApprovalForAll,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TransferSingle {
        #[key]
        pub operator: ContractAddress,
        #[key]
        pub from: ContractAddress,
        #[key]
        pub to: ContractAddress,
        pub token_id: u256,
        pub value: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct TransferBatch {
        #[key]
        pub operator: ContractAddress,
        #[key]
        pub from: ContractAddress,
        #[key]
        pub to: ContractAddress,
        pub token_ids: Array<u256>,
        pub values: Array<u256>,
    }

    #[derive(Drop, starknet::Event)]
    pub struct ApprovalForAll {
        #[key]
        pub account: ContractAddress,
        #[key]
        pub operator: ContractAddress,
        pub approved: bool,
    }

    #[constructor]
    fn constructor(ref self: ContractState, reward_contract: ContractAddress) {
        self.reward_contract.write(reward_contract);
    }

    #[abi(embed_v0)]
    impl ERC1155Impl of super::ITycoonERC1155<ContractState> {
        fn balance_of(self: @ContractState, account: ContractAddress, token_id: u256) -> u256 {
            self.balances.read((token_id, account))
        }

        fn balance_of_batch(
            self: @ContractState, accounts: Span<ContractAddress>, token_ids: Span<u256>,
        ) -> Array<u256> {
            assert(accounts.len() == token_ids.len(), 'Length mismatch');

            let mut balances = ArrayTrait::new();
            let mut i: u32 = 0;

            while i < accounts.len() {
                let balance = self.balance_of(*accounts.at(i), *token_ids.at(i));
                balances.append(balance);
                i += 1;
            }

            balances
        }

        fn set_approval_for_all(
            ref self: ContractState, operator: ContractAddress, approved: bool,
        ) {
            let caller = get_caller_address();
            assert(caller != operator, 'Self approval');

            self.operator_approvals.write((caller, operator), approved);

            self.emit(ApprovalForAll { account: caller, operator, approved });
        }

        fn is_approved_for_all(
            self: @ContractState, account: ContractAddress, operator: ContractAddress,
        ) -> bool {
            self.operator_approvals.read((account, operator))
        }

        fn safe_transfer_from(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
            amount: u256,
        ) {
            let caller = get_caller_address();
            assert(caller == from || self.is_approved_for_all(from, caller), 'Not authorized');

            self._transfer(from, to, token_id, amount);
        }

        fn safe_batch_transfer_from(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_ids: Span<u256>,
            amounts: Span<u256>,
        ) {
            let caller = get_caller_address();
            assert(caller == from || self.is_approved_for_all(from, caller), 'Not authorized');

            assert(token_ids.len() == amounts.len(), 'Length mismatch');

            let mut i: u32 = 0;
            while i < token_ids.len() {
                self._transfer(from, to, *token_ids.at(i), *amounts.at(i));
                i += 1;
            }

            self
                .emit(
                    TransferBatch {
                        operator: caller,
                        from,
                        to,
                        token_ids: token_ids.into(),
                        values: amounts.into(),
                    },
                );
        }

        fn mint(ref self: ContractState, to: ContractAddress, token_id: u256, amount: u256) {
            assert(get_caller_address() == self.reward_contract.read(), 'Only reward can mint');
            assert(!to.is_zero(), 'Mint to zero address');

            let balance = self.balances.read((token_id, to));
            self.balances.write((token_id, to), balance + amount);

            self
                .emit(
                    TransferSingle {
                        operator: get_caller_address(),
                        from: Zero::zero(),
                        to,
                        token_id,
                        value: amount,
                    },
                );
        }

        fn burn(ref self: ContractState, from: ContractAddress, token_id: u256, amount: u256) {
            assert(get_caller_address() == self.reward_contract.read(), 'Only reward can burn');

            let balance = self.balances.read((token_id, from));
            assert(balance >= amount, 'Insufficient balance');

            self.balances.write((token_id, from), balance - amount);

            self
                .emit(
                    TransferSingle {
                        operator: get_caller_address(),
                        from,
                        to: Zero::zero(),
                        token_id,
                        value: amount,
                    },
                );
        }

        fn uri(self: @ContractState, token_id: u256) -> ByteArray {
            if token_id >= 2000000000 {
                format!("https://tycoon.game/api/collectible/{}", token_id)
            } else if token_id >= 1000000000 {
                format!("https://tycoon.game/api/voucher/{}", token_id)
            } else {
                "https://tycoon.game/api/unknown"
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(
            ref self: ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token_id: u256,
            amount: u256,
        ) {
            assert(!to.is_zero(), 'Transfer to zero address');

            let from_balance = self.balances.read((token_id, from));
            assert(from_balance >= amount, 'Insufficient balance');

            self.balances.write((token_id, from), from_balance - amount);

            let to_balance = self.balances.read((token_id, to));
            self.balances.write((token_id, to), to_balance + amount);

            self
                .emit(
                    TransferSingle {
                        operator: get_caller_address(), from, to, token_id, value: amount,
                    },
                );
        }
    }
}
