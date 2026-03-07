use starknet::ContractAddress;

#[derive(Drop, Serde, PartialEq, starknet::Store)]
pub struct UserProfile {
    pub tag: felt252,
    pub owner: ContractAddress,
    pub user_wallet: ContractAddress,
    pub exists: bool,
}

#[starknet::interface]
pub trait IPayCrypt<TContractState> {
    fn register_tag(ref self: TContractState, tag: felt252) -> ContractAddress;
    fn deposit_to_tag(ref self: TContractState, tag: felt252, senders_tag: felt252, amount: u256, token: ContractAddress);
    fn get_tag_wallet_address(self: @TContractState, tag: felt252) -> ContractAddress;
    fn get_tag_wallet_balance(self: @TContractState, tag: felt252, token: ContractAddress) -> u256;
    fn get_contract_token_balance(self: @TContractState, token: ContractAddress) -> u256;
    fn withdraw_from_wallet(ref self: TContractState, token: ContractAddress, tag: felt252, recipient_address: ContractAddress, amount: u256);
    fn withdraw(ref self: TContractState, token: ContractAddress, recipient_address: ContractAddress, amount: u256) -> bool;
    fn get_user_profile(self: @TContractState, tag: felt252) -> UserProfile;
    fn get_admin_address(self: @TContractState) -> ContractAddress;
    fn set_token_address(ref self: TContractState, token_key: felt252, token_address: ContractAddress);
}

#[starknet::contract]
pub mod PayCrypt {
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use staknet::contracts::wallet::{IWalletDispatcher, IWalletDispatcherTrait};
    use starknet::class_hash::ClassHash;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::syscalls::deploy_syscall;
    use starknet::{
        ContractAddress, SyscallResultTrait, contract_address_const, get_block_timestamp,
        get_caller_address, get_contract_address,
    };
    use super::UserProfile;

    #[storage]
    struct Storage {
        is_tag_registered: Map<felt252, bool>,
        admin_address: ContractAddress,
        wallet_class_hash: ClassHash,
        user_profiles: Map<felt252, UserProfile>,
        token_addresses: Map<felt252, ContractAddress>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        TagRegistered: TagRegistered,
        DepositReceived: DepositReceived,
        WithdrawalCompleted: WithdrawalCompleted,
        TokenAddressUpdated: TokenAddressUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct TagRegistered {
        tag: felt252,
        wallet_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct DepositReceived {
        sender: ContractAddress,
        recipient: ContractAddress,
        amount: u256,
        token: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct WithdrawalCompleted {
        sender: ContractAddress,
        amount: u256,
        token: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct TokenAddressUpdated {
        token_key: felt252,
        token_address: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, admin_address: ContractAddress, wallet_class_hash: ClassHash,
    ) {
        let zero_address: ContractAddress = contract_address_const::<'0x0'>();
        assert(admin_address != zero_address, 'Invalid admin address');
        self.admin_address.write(admin_address);
        self.wallet_class_hash.write(wallet_class_hash);
    }

    #[abi(embed_v0)]
    impl PayCryptImpl of super::IPayCrypt<ContractState> {
        fn register_tag(ref self: ContractState, tag: felt252) -> ContractAddress {
            let zero_address: ContractAddress = contract_address_const::<'0x0'>();
            let is_tag_registered = self.is_tag_registered.read(tag);
            assert(!is_tag_registered, 'Tag already taken');
            self.is_tag_registered.write(tag, true);

            let owner_address = get_caller_address();
            assert(owner_address != zero_address, 'Invalid owner address');

            let wallet_class_hash = self.wallet_class_hash.read();
            let strk_token_address = self.token_addresses.read('STRK');
            let usdc_token_address = self.token_addresses.read('USDC');
            assert(strk_token_address != zero_address, 'STRK address not set');
            assert(usdc_token_address != zero_address, 'USDC address not set');

            let mut wallet_constructor_calldata = array![
                owner_address.into(),
                get_contract_address().into(),
                usdc_token_address.into(),
                strk_token_address.into(),
            ];
            let salt: felt252 = get_block_timestamp().into();
            let (wallet_address, _) = deploy_syscall(
                wallet_class_hash, salt, wallet_constructor_calldata.span(), true,
            )
                .unwrap_syscall();
            assert(wallet_address != zero_address, 'Wallet deployment failed');

            let user_profile = UserProfile {
                tag, owner: owner_address, user_wallet: wallet_address, exists: true,
            };
            self.user_profiles.write(tag, user_profile);
            self.emit(TagRegistered { tag, wallet_address });

            wallet_address
        }

        fn deposit_to_tag(
            ref self: ContractState,
            tag: felt252,
            senders_tag: felt252,
            amount: u256,
            token: ContractAddress,
        ) {
            let zero_address: ContractAddress = contract_address_const::<'0x0'>();
            // Validate inputs
            assert(token != zero_address, 'Invalid token address');
            assert(amount > 0, 'Amount must be positive');

            // Check recipient profile
            let user_profile = self.user_profiles.read(tag);
            assert(user_profile.exists, 'User profile does not exist');
            let recipient_wallet = user_profile.user_wallet;

            // Check sender profile
            let sender_profile = self.user_profiles.read(senders_tag);
            assert(sender_profile.exists, 'Sender profile does not exist');
            let sender_wallet = sender_profile.user_wallet;

            // Check sender's balance and allowance
            let erc20_dispatcher = IERC20Dispatcher { contract_address: token };
            let wallet_balance = erc20_dispatcher.balance_of(sender_wallet);
            assert(wallet_balance >= amount, 'Insufficient sender balance');

            // Perform withdrawal from sender's wallet to recipient's wallet
            self.withdraw_from_wallet(token, senders_tag, recipient_wallet, amount);

            // Emit event with both sender and recipient details
            self.emit(DepositReceived {
                sender: sender_wallet,
                recipient: recipient_wallet,
                amount,
                token,
            });
        }

        fn withdraw_from_wallet(
            ref self: ContractState,
            token: ContractAddress,
            tag: felt252,
            recipient_address: ContractAddress,
            amount: u256,
        ) {
            let zero_address: ContractAddress = contract_address_const::<'0x0'>();
            let caller = get_caller_address();
            let admin = self.admin_address.read();

            assert(token != zero_address, 'Invalid token address');
            assert(recipient_address != zero_address, 'Invalid recipient address');
            assert(amount > 0, 'Amount must be positive');

            let user_profile = self.user_profiles.read(tag);
            assert(user_profile.exists, 'Tag not registered');
            // Allow admin or tag owner to withdraw
            assert(caller == user_profile.owner || caller == admin, 'Unauthorized');

            let wallet_dispatcher = IWalletDispatcher {
                contract_address: user_profile.user_wallet,
            };
            let wallet_balance = IERC20Dispatcher { contract_address: token }
                .balance_of(user_profile.user_wallet);
            assert(wallet_balance >= amount, 'Insufficient wallet balance');

            let success = wallet_dispatcher.withdraw(token, recipient_address, amount);
            assert(success, 'Wallet withdrawal failed');

            self.emit(WithdrawalCompleted { sender: caller, amount, token });
        }

        fn withdraw(
            ref self: ContractState,
            token: ContractAddress,
            recipient_address: ContractAddress,
            amount: u256,
        ) -> bool {
            let zero_address: ContractAddress = contract_address_const::<'0x0'>();
            assert(token != zero_address, 'Invalid token address');
            assert(recipient_address != zero_address, 'Invalid recipient address');
            assert(amount > 0, 'Amount must be positive');

            let sender_address = get_caller_address();
            let admin_address: ContractAddress = self.admin_address.read();
            assert(sender_address == admin_address, 'Unauthorized: Not admin');

            let erc20_dispatcher = IERC20Dispatcher { contract_address: token };
            let contract_balance = erc20_dispatcher.balance_of(get_contract_address());
            assert(contract_balance >= amount, 'Insufficient contract balance');

            let success = erc20_dispatcher.transfer(recipient_address, amount);
            assert(success, 'Token transfer failed');

            self.emit(WithdrawalCompleted { sender: sender_address, amount, token });
            true
        }

        fn set_token_address(
            ref self: ContractState, token_key: felt252, token_address: ContractAddress,
        ) {
            let zero_address: ContractAddress = contract_address_const::<'0x0'>();
            let sender_address = get_caller_address();
            let admin_address = self.admin_address.read();
            assert(sender_address == admin_address, 'Unauthorized: Not admin');
            assert(token_address != zero_address, 'Invalid token address');
            // Restrict to known token keys to prevent malicious tokens
            assert(token_key == 'STRK' || token_key == 'USDC', 'Invalid token key');

            self.token_addresses.write(token_key, token_address);
            self.emit(TokenAddressUpdated { token_key, token_address });
        }

        fn get_tag_wallet_address(self: @ContractState, tag: felt252) -> ContractAddress {
            let user_profile = self.user_profiles.read(tag);
            assert(user_profile.exists, 'User profile does not exist');
            user_profile.user_wallet
        }

        fn get_tag_wallet_balance(
            self: @ContractState, tag: felt252, token: ContractAddress,
        ) -> u256 {
            let zero_address: ContractAddress = contract_address_const::<'0x0'>();
            assert(token != zero_address, 'Invalid token address');
            let user_profile = self.user_profiles.read(tag);
            assert(user_profile.exists, 'User profile does not exist');

            let erc20_dispatcher = IERC20Dispatcher { contract_address: token };
            erc20_dispatcher.balance_of(user_profile.user_wallet)
        }

        fn get_contract_token_balance(self: @ContractState, token: ContractAddress) -> u256 {
            let zero_address: ContractAddress = contract_address_const::<'0x0'>();
            assert(token != zero_address, 'Invalid token address');
            let erc20_dispatcher = IERC20Dispatcher { contract_address: token };
            erc20_dispatcher.balance_of(get_contract_address())
        }

        fn get_user_profile(self: @ContractState, tag: felt252) -> UserProfile {
            let user_profile = self.user_profiles.read(tag);
            assert(user_profile.exists, 'User profile does not exist');
            user_profile
        }

        fn get_admin_address(self: @ContractState) -> ContractAddress {
            self.admin_address.read()
        }
    }
}
