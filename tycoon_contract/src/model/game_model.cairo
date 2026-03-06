// TycoonLib.Game - only fields from Solidity
use starknet::ContractAddress;

#[derive(Serde, Copy, Drop, Introspect, PartialEq)]
#[dojo::model]
pub struct GameCounter {
    #[key]
    pub id: felt252,
    pub current_val: u256,
}

#[derive(Drop, Clone, Serde, Copy)]
#[dojo::model]
pub struct Game {
    #[key]
    pub id: u256,
    pub code: felt252,
    pub creator: ContractAddress,
    pub status: felt252,       // GameStatus
    pub winner: ContractAddress,
    pub number_of_players: u8,
    pub joined_players: u8,
    pub mode: felt252,         // GameType
    pub ai: bool,
    pub stake_per_player: u256,
    pub total_staked: u256,
    pub created_at: u64,
    pub ended_at: u64,
}

#[derive(Drop, Clone, Serde, Copy)]
#[dojo::model]
pub struct GameSettings {
    #[key]
    pub game_id: u256,
    pub max_players: u8,
    pub auction: bool,
    pub rent_in_prison: bool,
    pub mortgage: bool,
    pub even_build: bool,
    pub starting_cash: u256,
    pub private_room_code: felt252,
}

#[derive(Drop, Clone, Serde, Copy)]
#[dojo::model]
pub struct CodeToGame {
    #[key]
    pub code: felt252,
    pub game_id: u256,
}

// gameOrderToPlayer[gameId][order] = address
#[derive(Drop, Copy, Serde)]
#[dojo::model]
pub struct GameOrderToPlayer {
    #[key]
    pub game_id: u256,
    #[key]
    pub order: u8,
    pub player: ContractAddress,
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq)]
pub enum GameStatus {
    Pending,
    Ongoing,
    Ended,
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq)]
pub enum GameType {
    PublicGame,
    PrivateGame,
}

impl GameStatusIntoFelt252 of Into<GameStatus, felt252> {
    fn into(self: GameStatus) -> felt252 {
        match self {
            GameStatus::Pending => 'PENDING',
            GameStatus::Ongoing => 'ONGOING',
            GameStatus::Ended => 'ENDED',
        }
    }
}

impl Felt252TryIntoGameStatus of TryInto<felt252, GameStatus> {
    fn try_into(self: felt252) -> Option<GameStatus> {
        if self == 'PENDING' {
            Option::Some(GameStatus::Pending)
        } else if self == 'ONGOING' {
            Option::Some(GameStatus::Ongoing)
        } else if self == 'ENDED' {
            Option::Some(GameStatus::Ended)
        } else {
            Option::None
        }
    }
}

impl GameTypeIntoFelt252 of Into<GameType, felt252> {
    fn into(self: GameType) -> felt252 {
        match self {
            GameType::PublicGame => 'PUBLICGAME',
            GameType::PrivateGame => 'PRIVATEGAME',
        }
    }
}

impl Felt252TryIntoGameType of TryInto<felt252, GameType> {
    fn try_into(self: felt252) -> Option<GameType> {
        if self == 'PUBLICGAME' {
            Option::Some(GameType::PublicGame)
        } else if self == 'PRIVATEGAME' {
            Option::Some(GameType::PrivateGame)
        } else {
            Option::None
        }
    }
}
