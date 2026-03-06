// Cairo unit tests for tycoon (Solidity-aligned). Dojo integration tests in test_dojo_integration.cairo.
#[cfg(test)]
mod tests {
    use tycoon::model::game_model::{GameStatus, GameType};
    use tycoon::model::game_player_model::PlayerSymbol;
    use tycoon::model::reward_model::CollectiblePerk;

    #[test]
    fn test_game_status_felt() {
        assert(GameStatus::Pending.into() == 'PENDING', 'Pending');
        assert(GameStatus::Ongoing.into() == 'ONGOING', 'Ongoing');
        assert(GameStatus::Ended.into() == 'ENDED', 'Ended');
    }

    #[test]
    fn test_game_type_felt() {
        assert(GameType::PublicGame.into() == 'PUBLICGAME', 'Public');
        assert(GameType::PrivateGame.into() == 'PRIVATEGAME', 'Private');
    }

    #[test]
    fn test_player_symbol_felt() {
        assert(PlayerSymbol::Hat.into() == 'HAT', 'Hat');
        assert(PlayerSymbol::Car.into() == 'CAR', 'Car');
        assert(PlayerSymbol::Dog.into() == 'DOG', 'Dog');
        assert(PlayerSymbol::Thimble.into() == 'THIMBLE', 'Thimble');
        assert(PlayerSymbol::Iron.into() == 'IRON', 'Iron');
        assert(PlayerSymbol::Battleship.into() == 'BATTLESHIP', 'Battleship');
        assert(PlayerSymbol::Boot.into() == 'BOOT', 'Boot');
        assert(PlayerSymbol::Wheelbarrow.into() == 'WHEELBARROW', 'Wheelbarrow');
    }

    #[test]
    fn test_collectible_perk_felt() {
        assert(CollectiblePerk::None.into() == 0, 'None');
        assert(CollectiblePerk::ExtraTurn.into() == 1, 'ExtraTurn');
        assert(CollectiblePerk::JailFree.into() == 2, 'JailFree');
        assert(CollectiblePerk::CashTiered.into() == 5, 'CashTiered');
        assert(CollectiblePerk::RollExact.into() == 10, 'RollExact');
    }

    #[test]
    fn test_collectible_perk_all() {
        assert(CollectiblePerk::DoubleRent.into() == 3, 'DoubleRent');
        assert(CollectiblePerk::RollBoost.into() == 4, 'RollBoost');
        assert(CollectiblePerk::Teleport.into() == 6, 'Teleport');
        assert(CollectiblePerk::Shield.into() == 7, 'Shield');
        assert(CollectiblePerk::PropertyDiscount.into() == 8, 'PropertyDiscount');
        assert(CollectiblePerk::TaxRefund.into() == 9, 'TaxRefund');
    }

    #[test]
    fn test_game_status_distinct() {
        let p: felt252 = GameStatus::Pending.into();
        let o: felt252 = GameStatus::Ongoing.into();
        let e: felt252 = GameStatus::Ended.into();
        assert(p != o && o != e && p != e, 'distinct');
    }
}
