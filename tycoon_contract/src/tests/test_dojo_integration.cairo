// Dojo integration tests (register, create_ai_game, create_game, end_ai_game, exit_game).
//
// The registry dojo_cairo_test 1.8.0 expects spawn_test_world(namespaces, world_class_hash).
// The world class hash is not exposed in-crate, so in-repo integration tests that spawn a world
// are not wired here. Use the following instead:
//
// 1. Unit tests (sozo test): test_world.cairo (enums), game.cairo (game_type_from_felt, player_symbol_from_felt).
//
// 2. Manual integration test (with Katana + migrated world): see docs/INTEGRATION_TEST.md.
//    Flow: init_player_config, init_game_config, register_player, create_ai_game, end_ai_game;
//    or create_game (0 stake), leave_pending_game; or create, join, exit_game.
//
// IGame and IPlayer are pub so dispatchers can be used from integration tests when spawn_test_world API is available.
