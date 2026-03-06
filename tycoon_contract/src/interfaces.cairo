// Shared interfaces for cross-contract calls. Dispatchers (ITokenDispatcher, IRewardDispatcher)
// are generated here and used by the game system to call token and reward contracts.
use starknet::ContractAddress;

#[starknet::interface]
pub trait IToken<T> {
    fn init_token(ref self: T, owner: ContractAddress);
    fn balance_of(self: @T, owner: ContractAddress) -> u256;
    fn total_supply(self: @T) -> u256;
    fn name(self: @T) -> felt252;
    fn symbol(self: @T) -> felt252;
    fn decimals(self: @T) -> u8;
    fn transfer(ref self: T, to: ContractAddress, amount: u256) -> bool;
    fn approve(ref self: T, spender: ContractAddress, amount: u256) -> bool;
    fn allowance(self: @T, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer_from(ref self: T, from: ContractAddress, to: ContractAddress, amount: u256) -> bool;
    fn mint(ref self: T, to: ContractAddress, amount: u256);
}

#[starknet::interface]
pub trait IReward<T> {
    fn init_reward(
        ref self: T,
        game_contract: ContractAddress,
        player_contract: ContractAddress,
        owner: ContractAddress,
        tyc_token: ContractAddress,
        usdc_token: ContractAddress,
        erc1155_contract: ContractAddress,
    );
    fn pause(ref self: T);
    fn unpause(ref self: T);
    fn mint_voucher(ref self: T, to: ContractAddress, tyc_value: u256) -> u256;
    fn redeem_voucher(ref self: T, token_id: u256);
    fn mint_collectible(ref self: T, to: ContractAddress, perk: u8, strength: u256) -> u256;
    fn stock_shop(
        ref self: T,
        amount: u256,
        perk: u8,
        strength: u256,
        tyc_price: u256,
        usdc_price: u256,
    ) -> u256;
    fn restock_collectible(ref self: T, token_id: u256, amount: u256);
    fn update_collectible_prices(ref self: T, token_id: u256, tyc_price: u256, usdc_price: u256);
    fn buy_collectible(ref self: T, token_id: u256, use_usdc: bool);
    /// Buy multiple collectibles in one tx (bundle). Frontend defines bundles as lists of token IDs.
    fn buy_collectible_batch(ref self: T, token_ids: Array<u256>, use_usdc: bool);
    fn burn_collectible_for_perk(ref self: T, token_id: u256);
    fn balance_of(self: @T, owner: ContractAddress, token_id: u256) -> u256;
    fn get_collectible_info(self: @T, token_id: u256) -> (felt252, u256, u256, u256, u256);
    fn get_cash_tier_value(self: @T, tier: u8) -> u256;
    fn withdraw_funds(ref self: T, to: ContractAddress, amount: u256);
    fn withdraw_funds_usdc(ref self: T, to: ContractAddress, amount: u256);
}
