// TYC token - ERC20-like: balance, allowance, total_supply, config
use starknet::ContractAddress;

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct TycBalance {
    #[key]
    pub owner: ContractAddress,
    pub balance: u256,
}

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct TycAllowance {
    #[key]
    pub owner: ContractAddress,
    #[key]
    pub spender: ContractAddress,
    pub amount: u256,
}

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct TokenConfig {
    #[key]
    pub id: felt252,
    pub owner: ContractAddress,
}

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct TotalSupply {
    #[key]
    pub id: felt252,
    pub value: u256,
}
