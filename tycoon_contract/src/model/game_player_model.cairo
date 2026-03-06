// TycoonLib.GamePlayer
use starknet::ContractAddress;

#[derive(Drop, Serde, Clone, Copy)]
#[dojo::model]
pub struct GamePlayer {
    #[key]
    pub game_id: u256,
    #[key]
    pub player_address: ContractAddress,
    pub balance: u256,
    pub position: u8,
    pub order: u8,
    pub symbol: felt252,  // PlayerSymbol as felt
    pub username: felt252,
}

#[derive(Serde, Copy, Introspect, Drop, PartialEq)]
pub enum PlayerSymbol {
    Hat,
    Car,
    Dog,
    Thimble,
    Iron,
    Battleship,
    Boot,
    Wheelbarrow,
}

impl PlayerSymbolIntoFelt252 of Into<PlayerSymbol, felt252> {
    fn into(self: PlayerSymbol) -> felt252 {
        match self {
            PlayerSymbol::Hat => 'HAT',
            PlayerSymbol::Car => 'CAR',
            PlayerSymbol::Dog => 'DOG',
            PlayerSymbol::Thimble => 'THIMBLE',
            PlayerSymbol::Iron => 'IRON',
            PlayerSymbol::Battleship => 'BATTLESHIP',
            PlayerSymbol::Boot => 'BOOT',
            PlayerSymbol::Wheelbarrow => 'WHEELBARROW',
        }
    }
}

impl Felt252TryIntoPlayerSymbol of TryInto<felt252, PlayerSymbol> {
    fn try_into(self: felt252) -> Option<PlayerSymbol> {
        if self == 'HAT' {
            Option::Some(PlayerSymbol::Hat)
        } else if self == 'CAR' {
            Option::Some(PlayerSymbol::Car)
        } else if self == 'DOG' {
            Option::Some(PlayerSymbol::Dog)
        } else if self == 'THIMBLE' {
            Option::Some(PlayerSymbol::Thimble)
        } else if self == 'IRON' {
            Option::Some(PlayerSymbol::Iron)
        } else if self == 'BATTLESHIP' {
            Option::Some(PlayerSymbol::Battleship)
        } else if self == 'BOOT' {
            Option::Some(PlayerSymbol::Boot)
        } else if self == 'WHEELBARROW' {
            Option::Some(PlayerSymbol::Wheelbarrow)
        } else {
            Option::None
        }
    }
}
