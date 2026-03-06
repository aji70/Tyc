// TycoonLib.User + registered + addressToUsername
use starknet::ContractAddress;

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct User {
    #[key]
    pub username: felt252,
    pub id: u256,
    pub player_address: ContractAddress,
    pub registered_at: u64,
    pub games_played: u256,
    pub games_won: u256,
    pub games_lost: u256,
    pub total_staked: u256,
    pub total_earned: u256,
    pub total_withdrawn: u256,
    pub properties_bought: u256,
    pub properties_sold: u256,
}

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct Registered {
    #[key]
    pub address: ContractAddress,
    pub is_registered: bool,
}

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct AddressToUsername {
    #[key]
    pub address: ContractAddress,
    pub username: felt252,
}

// totalUsers, totalGames (Tycoon.sol)
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct Stats {
    #[key]
    pub id: felt252,
    pub total_users: u256,
    pub total_games: u256,
}
