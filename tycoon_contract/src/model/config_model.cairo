// Tycoon.sol: houseUSDC, minStake, backendGameController, minTurnsForPerks, previousGameCode, claims, turnsPlayed
use starknet::ContractAddress;

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct HouseBalance {
    #[key]
    pub id: felt252,
    pub amount: u256,
}

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct GameConfig {
    #[key]
    pub id: felt252,
    pub min_stake: u256,
    /// Token contract address for stakes (TYC or other). Stakes held by game contract.
    pub stake_token: ContractAddress,
    pub backend_controller: ContractAddress,
    pub min_turns_for_perks: u256,
    /// Owner for withdraw_house / drain_contract.
    pub owner: ContractAddress,
    /// Reward system contract (game is the only minter there for exit/AI payouts).
    pub reward_contract: ContractAddress,
}

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct PreviousGameCode {
    #[key]
    pub player: ContractAddress,
    pub code: felt252,
}

// claims[gameId][player] = rank (or removal marker)
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct Claim {
    #[key]
    pub game_id: u256,
    #[key]
    pub player: ContractAddress,
    pub rank: u256,
}

// turnsPlayed[gameId][player]
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct TurnsPlayed {
    #[key]
    pub game_id: u256,
    #[key]
    pub player: ContractAddress,
    pub count: u256,
}

#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct PlayerConfig {
    #[key]
    pub id: felt252,
    pub reward_contract: ContractAddress,
}
