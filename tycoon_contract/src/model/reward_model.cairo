// TycoonRewardSystem state - only what's in Solidity
use starknet::ContractAddress;

// voucherRedeemValue[tokenId] = tyc value
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct VoucherRedeemValue {
    #[key]
    pub token_id: u256,
    pub tyc_value: u256,
}

// collectiblePerk[tokenId], collectiblePerkStrength[tokenId]
// Perk is extensible: any value 1–255 is valid. Owner can stock_shop(perk=11, …) for future perks (e.g. Rent Cashback, Interest, Lucky 7, Free Parking). Only 5 and 9 have tier validation (strength 1–5).
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct CollectibleMeta {
    #[key]
    pub token_id: u256,
    pub perk: felt252,   // 1–255; see CollectiblePerk for known values
    pub strength: u256,
}

// collectibleTycPrice, collectibleUsdcPrice
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct CollectiblePrices {
    #[key]
    pub token_id: u256,
    pub tyc_price: u256,
    pub usdc_price: u256,
}

// No backend. game_contract = mint voucher/collectible (payouts). player_contract = mint voucher (registration only). owner = pause + stock_shop.
// erc1155_contract = standalone ERC1155 (TycoonRewardERC1155) that holds voucher/collectible balances; only this reward system can mint/burn.
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct RewardConfig {
    #[key]
    pub id: felt252,
    pub game_contract: ContractAddress,
    pub player_contract: ContractAddress,
    pub owner: ContractAddress,
    pub paused: bool,
    pub tyc_token: ContractAddress,
    pub usdc_token: ContractAddress,
    pub erc1155_contract: ContractAddress,
}

// Return type for get_collectible_info
#[derive(Drop, Copy, Serde)]
pub struct CollectibleInfo {
    pub perk: felt252,
    pub strength: u256,
    pub tyc_price: u256,
    pub usdc_price: u256,
    pub shop_stock: u256,
}

// One entity per token_id that is listed in the shop. Query world for ShopListing to get all shop token IDs (e.g. via Torii/indexer).
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct ShopListing {
    #[key]
    pub token_id: u256,
    pub in_shop: bool, // true = listed; Dojo models require at least one non-key member
}

// Next IDs: 1_000_000_000+ vouchers, 2_000_000_000+ collectibles
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct RewardCounters {
    #[key]
    pub id: felt252,
    pub next_voucher_id: u256,
    pub next_collectible_id: u256,
}

// TycoonLib.CollectiblePerk
#[derive(Serde, Copy, Drop, Introspect, PartialEq)]
pub enum CollectiblePerk {
    None,
    ExtraTurn,
    JailFree,
    DoubleRent,
    RollBoost,
    CashTiered,
    Teleport,
    Shield,
    PropertyDiscount,
    TaxRefund,
    RollExact,
}

impl CollectiblePerkIntoFelt252 of Into<CollectiblePerk, felt252> {
    fn into(self: CollectiblePerk) -> felt252 {
        match self {
            CollectiblePerk::None => 0,
            CollectiblePerk::ExtraTurn => 1,
            CollectiblePerk::JailFree => 2,
            CollectiblePerk::DoubleRent => 3,
            CollectiblePerk::RollBoost => 4,
            CollectiblePerk::CashTiered => 5,
            CollectiblePerk::Teleport => 6,
            CollectiblePerk::Shield => 7,
            CollectiblePerk::PropertyDiscount => 8,
            CollectiblePerk::TaxRefund => 9,
            CollectiblePerk::RollExact => 10,
        }
    }
}

impl Felt252TryIntoCollectiblePerk of TryInto<felt252, CollectiblePerk> {
    fn try_into(self: felt252) -> Option<CollectiblePerk> {
        if self == 0 {
            Option::Some(CollectiblePerk::None)
        } else if self == 1 {
            Option::Some(CollectiblePerk::ExtraTurn)
        } else if self == 2 {
            Option::Some(CollectiblePerk::JailFree)
        } else if self == 3 {
            Option::Some(CollectiblePerk::DoubleRent)
        } else if self == 4 {
            Option::Some(CollectiblePerk::RollBoost)
        } else if self == 5 {
            Option::Some(CollectiblePerk::CashTiered)
        } else if self == 6 {
            Option::Some(CollectiblePerk::Teleport)
        } else if self == 7 {
            Option::Some(CollectiblePerk::Shield)
        } else if self == 8 {
            Option::Some(CollectiblePerk::PropertyDiscount)
        } else if self == 9 {
            Option::Some(CollectiblePerk::TaxRefund)
        } else if self == 10 {
            Option::Some(CollectiblePerk::RollExact)
        } else {
            Option::None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{CollectiblePerk, Felt252TryIntoCollectiblePerk};

    #[test]
    fn test_collectible_perk_try_into_some() {
        let one: felt252 = 1;
        let opt: Option<CollectiblePerk> = one.try_into();
        assert(opt.is_some(), '1 some');
        assert(opt.unwrap() == CollectiblePerk::ExtraTurn, '1 -> ExtraTurn');
        let zero: felt252 = 0;
        assert(zero.try_into().unwrap() == CollectiblePerk::None, '0 -> None');
        let ten: felt252 = 10;
        assert(ten.try_into().unwrap() == CollectiblePerk::RollExact, '10 -> RollExact');
    }

    #[test]
    fn test_collectible_perk_try_into_none() {
        let bad: felt252 = 99;
        let opt: Option<CollectiblePerk> = bad.try_into();
        assert(opt.is_none(), '99 -> None');
        let eleven: felt252 = 11;
        let opt2: Option<CollectiblePerk> = eleven.try_into();
        assert(opt2.is_none(), '11 -> None');
    }
}
