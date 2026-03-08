pub mod egs_adapter;
pub mod interfaces;
pub mod tokens;

pub mod model {
    pub mod game_model;
    pub mod game_player_model;
    pub mod player_model;
    pub mod config_model;
    pub mod reward_model;
    pub mod token_model;
}

pub mod systems {
    pub mod game;
    pub mod player;
    pub mod reward;
    pub mod token;
}

pub mod tests {
    mod test_world;
}
