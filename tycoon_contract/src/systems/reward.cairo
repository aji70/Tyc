// Reward system. Uses standalone ERC1155 (TycoonRewardERC1155) for balances; metadata in Dojo.
use tycoon::model::reward_model::{
    CollectibleMeta, CollectiblePrices, RewardConfig, RewardCounters, ShopListing, VoucherRedeemValue,
};
use tycoon::interfaces::IReward;
use tycoon::tokens::erc1155::{ITycoonERC1155Dispatcher, ITycoonERC1155DispatcherTrait};

const VOUCHER_ID_START: u256 = 1000000000;
const COLLECTIBLE_ID_START: u256 = 2000000000;
const CASH_TIER_1: u256 = 10;
const CASH_TIER_2: u256 = 25;
const CASH_TIER_3: u256 = 50;
const CASH_TIER_4: u256 = 100;
const CASH_TIER_5: u256 = 250;

#[dojo::contract]
mod reward {
    use dojo::model::ModelStorage;
    use starknet::{ContractAddress, get_caller_address, get_contract_address, contract_address_const};
    use tycoon::model::reward_model::{
        CollectibleMeta, CollectiblePrices, RewardConfig, RewardCounters, ShopListing, VoucherRedeemValue,
    };
    use tycoon::interfaces::{IReward, ITokenDispatcher, ITokenDispatcherTrait};
    use tycoon::tokens::erc1155::{ITycoonERC1155Dispatcher, ITycoonERC1155DispatcherTrait};
    use super::{
        VOUCHER_ID_START, COLLECTIBLE_ID_START,
        CASH_TIER_1, CASH_TIER_2, CASH_TIER_3, CASH_TIER_4, CASH_TIER_5,
    };

    #[abi(embed_v0)]
    impl RewardImpl of IReward<ContractState> {
        fn init_reward(
            ref self: ContractState,
            game_contract: ContractAddress,
            player_contract: ContractAddress,
            owner: ContractAddress,
            tyc_token: ContractAddress,
            usdc_token: ContractAddress,
            erc1155_contract: ContractAddress,
        ) {
            let mut world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(cfg.game_contract == contract_address_const::<0>(), 'already inited');
            let config = RewardConfig {
                id: 'config',
                game_contract,
                player_contract,
                owner,
                paused: false,
                tyc_token,
                usdc_token,
                erc1155_contract,
            };
            world.write_model(@config);
            let counters = RewardCounters {
                id: 'counters',
                next_voucher_id: VOUCHER_ID_START,
                next_collectible_id: COLLECTIBLE_ID_START,
            };
            world.write_model(@counters);
        }

        fn pause(ref self: ContractState) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut cfg: RewardConfig = world.read_model('config');
            assert(caller == cfg.owner, 'only owner');
            cfg.paused = true;
            world.write_model(@cfg);
        }

        fn unpause(ref self: ContractState) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let mut cfg: RewardConfig = world.read_model('config');
            assert(caller == cfg.owner, 'only owner');
            cfg.paused = false;
            world.write_model(@cfg);
        }

        fn mint_voucher(ref self: ContractState, to: ContractAddress, tyc_value: u256) -> u256 {
            assert(tyc_value > 0, 'value must be positive');
            assert(to != contract_address_const::<0>(), 'invalid recipient');
            let caller = get_caller_address();
            let mut world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(cfg.erc1155_contract != contract_address_const::<0>(), 'erc1155 not set');
            assert(caller == cfg.game_contract || caller == cfg.player_contract, 'only game or player contract');

            let mut counters: RewardCounters = world.read_model('counters');
            let token_id = counters.next_voucher_id;
            counters.next_voucher_id += 1;
            world.write_model(@counters);

            let voucher_val = VoucherRedeemValue { token_id, tyc_value };
            world.write_model(@voucher_val);

            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
            erc1155.mint(to, token_id, 1);

            token_id
        }

        fn redeem_voucher(ref self: ContractState, token_id: u256) {
            let caller = get_caller_address();
            let world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(!cfg.paused, 'paused');
            assert(cfg.erc1155_contract != contract_address_const::<0>(), 'erc1155 not set');

            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
            erc1155.burn(caller, token_id, 1);

            let voucher: VoucherRedeemValue = world.read_model(token_id);
            assert(voucher.tyc_value > 0, 'invalid voucher');

            if cfg.tyc_token != contract_address_const::<0>() && voucher.tyc_value > 0 {
                let token = ITokenDispatcher { contract_address: cfg.tyc_token };
                token.transfer(caller, voucher.tyc_value);
            }
        }

        fn mint_collectible(ref self: ContractState, to: ContractAddress, perk: u8, strength: u256) -> u256 {
            assert(perk != 0, 'invalid perk');
            assert(to != contract_address_const::<0>(), 'invalid recipient');
            let caller = get_caller_address();
            let mut world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(cfg.erc1155_contract != contract_address_const::<0>(), 'erc1155 not set');
            assert(caller == cfg.game_contract, 'only game can mint collectible');

            let mut counters: RewardCounters = world.read_model('counters');
            let token_id = counters.next_collectible_id;
            counters.next_collectible_id += 1;
            world.write_model(@counters);

            let perk_felt: felt252 = perk.into();
            let meta = CollectibleMeta { token_id, perk: perk_felt, strength };
            world.write_model(@meta);

            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
            erc1155.mint(to, token_id, 1);

            token_id
        }

        fn stock_shop(
            ref self: ContractState,
            amount: u256,
            perk: u8,
            strength: u256,
            tyc_price: u256,
            usdc_price: u256,
        ) -> u256 {
            assert(amount > 0, 'amount > 0');
            assert(perk != 0, 'invalid perk');
            let caller = get_caller_address();
            let mut world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(caller == cfg.owner, 'only owner can stock shop');
            assert(cfg.erc1155_contract != contract_address_const::<0>(), 'erc1155 not set');

            let mut counters: RewardCounters = world.read_model('counters');
            let token_id = counters.next_collectible_id;
            counters.next_collectible_id += 1;
            world.write_model(@counters);

            let perk_felt: felt252 = perk.into();
            let meta = CollectibleMeta { token_id, perk: perk_felt, strength };
            world.write_model(@meta);
            let prices = CollectiblePrices { token_id, tyc_price, usdc_price };
            world.write_model(@prices);

            let self_addr = get_contract_address();
            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
            erc1155.mint(self_addr, token_id, amount);

            world.write_model(@ShopListing { token_id, in_shop: true });

            token_id
        }

        fn restock_collectible(ref self: ContractState, token_id: u256, amount: u256) {
            assert(amount > 0, 'amount > 0');
            let caller = get_caller_address();
            let world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(caller == cfg.owner, 'only owner');
            assert(cfg.erc1155_contract != contract_address_const::<0>(), 'erc1155 not set');

            let _meta: CollectibleMeta = world.read_model(token_id);
            let self_addr = get_contract_address();
            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
            erc1155.mint(self_addr, token_id, amount);
        }

        fn update_collectible_prices(
            ref self: ContractState, token_id: u256, tyc_price: u256, usdc_price: u256,
        ) {
            let caller = get_caller_address();
            let mut world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(caller == cfg.owner, 'only owner');

            let _prices: CollectiblePrices = world.read_model(token_id);
            let new_prices = CollectiblePrices {
                token_id,
                tyc_price,
                usdc_price,
            };
            world.write_model(@new_prices);
        }

        fn buy_collectible(ref self: ContractState, token_id: u256, use_usdc: bool) {
            let caller = get_caller_address();
            let world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(!cfg.paused, 'paused');
            assert(cfg.erc1155_contract != contract_address_const::<0>(), 'erc1155 not set');

            let prices: CollectiblePrices = world.read_model(token_id);
            let price = if use_usdc { prices.usdc_price } else { prices.tyc_price };
            assert(price > 0, 'not for sale');

            let self_addr = get_contract_address();
            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
            let shop_stock: u256 = erc1155.balance_of(self_addr, token_id);
            assert(shop_stock >= 1, 'out of stock');

            if use_usdc {
                assert(cfg.usdc_token != contract_address_const::<0>(), 'USDC not set');
                let usdc = ITokenDispatcher { contract_address: cfg.usdc_token };
                usdc.transfer_from(caller, self_addr, price);
            } else {
                assert(cfg.tyc_token != contract_address_const::<0>(), 'TYC not set');
                let token = ITokenDispatcher { contract_address: cfg.tyc_token };
                token.transfer_from(caller, self_addr, price);
            };

            erc1155.safe_transfer_from(self_addr, caller, token_id, 1);
        }

        fn buy_collectible_batch(ref self: ContractState, token_ids: Array<u256>, use_usdc: bool) {
            let caller = get_caller_address();
            let world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(!cfg.paused, 'paused');
            assert(cfg.erc1155_contract != contract_address_const::<0>(), 'erc1155 not set');

            let len = token_ids.len();
            assert(len > 0, 'empty batch');

            let self_addr = get_contract_address();
            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };

            let mut total_price: u256 = 0;
            let mut i: u32 = 0;
            while i < len {
                let token_id = *token_ids.at(i);
                let prices: CollectiblePrices = world.read_model(token_id);
                let price = if use_usdc { prices.usdc_price } else { prices.tyc_price };
                assert(price > 0, 'not for sale');
                let shop_stock: u256 = erc1155.balance_of(self_addr, token_id);
                assert(shop_stock >= 1, 'out of stock');
                total_price += price;
                i += 1;
            }

            if use_usdc {
                assert(cfg.usdc_token != contract_address_const::<0>(), 'USDC not set');
                let usdc = ITokenDispatcher { contract_address: cfg.usdc_token };
                usdc.transfer_from(caller, self_addr, total_price);
            } else {
                assert(cfg.tyc_token != contract_address_const::<0>(), 'TYC not set');
                let token = ITokenDispatcher { contract_address: cfg.tyc_token };
                token.transfer_from(caller, self_addr, total_price);
            };

            let mut j: u32 = 0;
            while j < len {
                let token_id = *token_ids.at(j);
                erc1155.safe_transfer_from(self_addr, caller, token_id, 1);
                j += 1;
            }
        }

        fn burn_collectible_for_perk(ref self: ContractState, token_id: u256) {
            let caller = get_caller_address();
            let world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(!cfg.paused, 'paused');
            assert(cfg.erc1155_contract != contract_address_const::<0>(), 'erc1155 not set');

            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
            let bal: u256 = erc1155.balance_of(caller, token_id);
            assert(bal >= 1, 'insufficient balance');

            let meta: CollectibleMeta = world.read_model(token_id);
            assert(meta.perk != 0, 'no perk');
            if meta.perk == 5 || meta.perk == 9 {
                assert(meta.strength >= 1 && meta.strength <= 5, 'invalid tier 1-5');
            };

            erc1155.burn(caller, token_id, 1);
        }

        fn balance_of(self: @ContractState, owner: ContractAddress, token_id: u256) -> u256 {
            let world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            if cfg.erc1155_contract == contract_address_const::<0>() {
                return 0;
            }
            let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
            erc1155.balance_of(owner, token_id)
        }

        fn get_collectible_info(
            self: @ContractState,
            token_id: u256,
        ) -> (felt252, u256, u256, u256, u256) {
            let world = self.world_default();
            let meta: CollectibleMeta = world.read_model(token_id);
            let prices: CollectiblePrices = world.read_model(token_id);
            let cfg: RewardConfig = world.read_model('config');
            let self_addr = get_contract_address();
            let shop_stock = if cfg.erc1155_contract == contract_address_const::<0>() {
                0
            } else {
                let erc1155 = ITycoonERC1155Dispatcher { contract_address: cfg.erc1155_contract };
                erc1155.balance_of(self_addr, token_id)
            };
            (meta.perk, meta.strength, prices.tyc_price, prices.usdc_price, shop_stock)
        }

        fn get_cash_tier_value(self: @ContractState, tier: u8) -> u256 {
            assert(tier >= 1 && tier <= 5, 'tier 1-5');
            if tier == 1 { CASH_TIER_1 }
            else if tier == 2 { CASH_TIER_2 }
            else if tier == 3 { CASH_TIER_3 }
            else if tier == 4 { CASH_TIER_4 }
            else { CASH_TIER_5 }
        }

        fn withdraw_funds(ref self: ContractState, to: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            let world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(caller == cfg.owner, 'only owner');
            assert(to != contract_address_const::<0>(), 'invalid to');
            assert(amount > 0, 'amount > 0');
            assert(cfg.tyc_token != contract_address_const::<0>(), 'TYC not set');
            let token = ITokenDispatcher { contract_address: cfg.tyc_token };
            token.transfer(to, amount);
        }

        fn withdraw_funds_usdc(ref self: ContractState, to: ContractAddress, amount: u256) {
            let caller = get_caller_address();
            let world = self.world_default();
            let cfg: RewardConfig = world.read_model('config');
            assert(caller == cfg.owner, 'only owner');
            assert(to != contract_address_const::<0>(), 'invalid to');
            assert(amount > 0, 'amount > 0');
            assert(cfg.usdc_token != contract_address_const::<0>(), 'USDC not set');
            let usdc = ITokenDispatcher { contract_address: cfg.usdc_token };
            usdc.transfer(to, amount);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"tycoon")
        }
    }
}
