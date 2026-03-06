import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import { BigNumberish } from 'starknet';

// Type definition for `tycoon::model::config_model::Claim` struct
export interface Claim {
	game_id: BigNumberish;
	player: string;
	rank: BigNumberish;
}

// Type definition for `tycoon::model::config_model::GameConfig` struct
export interface GameConfig {
	id: BigNumberish;
	min_stake: BigNumberish;
	stake_token: string;
	backend_controller: string;
	min_turns_for_perks: BigNumberish;
	owner: string;
	reward_contract: string;
}

// Type definition for `tycoon::model::config_model::HouseBalance` struct
export interface HouseBalance {
	id: BigNumberish;
	amount: BigNumberish;
}

// Type definition for `tycoon::model::config_model::PlayerConfig` struct
export interface PlayerConfig {
	id: BigNumberish;
	reward_contract: string;
}

// Type definition for `tycoon::model::config_model::PreviousGameCode` struct
export interface PreviousGameCode {
	player: string;
	code: BigNumberish;
}

// Type definition for `tycoon::model::config_model::TurnsPlayed` struct
export interface TurnsPlayed {
	game_id: BigNumberish;
	player: string;
	count: BigNumberish;
}

// Type definition for `tycoon::model::game_model::CodeToGame` struct
export interface CodeToGame {
	code: BigNumberish;
	game_id: BigNumberish;
}

// Type definition for `tycoon::model::game_model::Game` struct
export interface Game {
	id: BigNumberish;
	code: BigNumberish;
	creator: string;
	status: BigNumberish;
	winner: string;
	number_of_players: BigNumberish;
	joined_players: BigNumberish;
	mode: BigNumberish;
	ai: boolean;
	stake_per_player: BigNumberish;
	total_staked: BigNumberish;
	created_at: BigNumberish;
	ended_at: BigNumberish;
}

// Type definition for `tycoon::model::game_model::GameCounter` struct
export interface GameCounter {
	id: BigNumberish;
	current_val: BigNumberish;
}

// Type definition for `tycoon::model::game_model::GameOrderToPlayer` struct
export interface GameOrderToPlayer {
	game_id: BigNumberish;
	order: BigNumberish;
	player: string;
}

// Type definition for `tycoon::model::game_model::GameSettings` struct
export interface GameSettings {
	game_id: BigNumberish;
	max_players: BigNumberish;
	auction: boolean;
	rent_in_prison: boolean;
	mortgage: boolean;
	even_build: boolean;
	starting_cash: BigNumberish;
	private_room_code: BigNumberish;
}

// Type definition for `tycoon::model::game_player_model::GamePlayer` struct
export interface GamePlayer {
	game_id: BigNumberish;
	player_address: string;
	balance: BigNumberish;
	position: BigNumberish;
	order: BigNumberish;
	symbol: BigNumberish;
	username: BigNumberish;
}

// Type definition for `tycoon::model::player_model::AddressToUsername` struct
export interface AddressToUsername {
	address: string;
	username: BigNumberish;
}

// Type definition for `tycoon::model::player_model::Registered` struct
export interface Registered {
	address: string;
	is_registered: boolean;
}

// Type definition for `tycoon::model::player_model::Stats` struct
export interface Stats {
	id: BigNumberish;
	total_users: BigNumberish;
	total_games: BigNumberish;
}

// Type definition for `tycoon::model::player_model::User` struct
export interface User {
	username: BigNumberish;
	id: BigNumberish;
	player_address: string;
	registered_at: BigNumberish;
	games_played: BigNumberish;
	games_won: BigNumberish;
	games_lost: BigNumberish;
	total_staked: BigNumberish;
	total_earned: BigNumberish;
	total_withdrawn: BigNumberish;
	properties_bought: BigNumberish;
	properties_sold: BigNumberish;
}

// Type definition for `tycoon::model::reward_model::CollectibleMeta` struct
export interface CollectibleMeta {
	token_id: BigNumberish;
	perk: BigNumberish;
	strength: BigNumberish;
}

// Type definition for `tycoon::model::reward_model::CollectiblePrices` struct
export interface CollectiblePrices {
	token_id: BigNumberish;
	tyc_price: BigNumberish;
	usdc_price: BigNumberish;
}

// Type definition for `tycoon::model::reward_model::RewardConfig` struct
export interface RewardConfig {
	id: BigNumberish;
	game_contract: string;
	player_contract: string;
	owner: string;
	paused: boolean;
	tyc_token: string;
	usdc_token: string;
	erc1155_contract: string;
}

// Type definition for `tycoon::model::reward_model::RewardCounters` struct
export interface RewardCounters {
	id: BigNumberish;
	next_voucher_id: BigNumberish;
	next_collectible_id: BigNumberish;
}

// Type definition for `tycoon::model::reward_model::ShopListing` struct
export interface ShopListing {
	token_id: BigNumberish;
	in_shop: boolean;
}

// Type definition for `tycoon::model::reward_model::VoucherRedeemValue` struct
export interface VoucherRedeemValue {
	token_id: BigNumberish;
	tyc_value: BigNumberish;
}

// Type definition for `tycoon::model::token_model::TokenConfig` struct
export interface TokenConfig {
	id: BigNumberish;
	owner: string;
}

// Type definition for `tycoon::model::token_model::TotalSupply` struct
export interface TotalSupply {
	id: BigNumberish;
	value: BigNumberish;
}

// Type definition for `tycoon::model::token_model::TycAllowance` struct
export interface TycAllowance {
	owner: string;
	spender: string;
	amount: BigNumberish;
}

// Type definition for `tycoon::model::token_model::TycBalance` struct
export interface TycBalance {
	owner: string;
	balance: BigNumberish;
}

export interface SchemaType extends ISchemaType {
	tycoon: {
		Claim: Claim,
		GameConfig: GameConfig,
		HouseBalance: HouseBalance,
		PlayerConfig: PlayerConfig,
		PreviousGameCode: PreviousGameCode,
		TurnsPlayed: TurnsPlayed,
		CodeToGame: CodeToGame,
		Game: Game,
		GameCounter: GameCounter,
		GameOrderToPlayer: GameOrderToPlayer,
		GameSettings: GameSettings,
		GamePlayer: GamePlayer,
		AddressToUsername: AddressToUsername,
		Registered: Registered,
		Stats: Stats,
		User: User,
		CollectibleMeta: CollectibleMeta,
		CollectiblePrices: CollectiblePrices,
		RewardConfig: RewardConfig,
		RewardCounters: RewardCounters,
		ShopListing: ShopListing,
		VoucherRedeemValue: VoucherRedeemValue,
		TokenConfig: TokenConfig,
		TotalSupply: TotalSupply,
		TycAllowance: TycAllowance,
		TycBalance: TycBalance,
	},
}
export const schema: SchemaType = {
	tycoon: {
		Claim: {
		game_id: 0,
			player: "",
		rank: 0,
		},
		GameConfig: {
			id: 0,
		min_stake: 0,
			stake_token: "",
			backend_controller: "",
		min_turns_for_perks: 0,
			owner: "",
			reward_contract: "",
		},
		HouseBalance: {
			id: 0,
		amount: 0,
		},
		PlayerConfig: {
			id: 0,
			reward_contract: "",
		},
		PreviousGameCode: {
			player: "",
			code: 0,
		},
		TurnsPlayed: {
		game_id: 0,
			player: "",
		count: 0,
		},
		CodeToGame: {
			code: 0,
		game_id: 0,
		},
		Game: {
		id: 0,
			code: 0,
			creator: "",
			status: 0,
			winner: "",
			number_of_players: 0,
			joined_players: 0,
			mode: 0,
			ai: false,
		stake_per_player: 0,
		total_staked: 0,
			created_at: 0,
			ended_at: 0,
		},
		GameCounter: {
			id: 0,
		current_val: 0,
		},
		GameOrderToPlayer: {
		game_id: 0,
			order: 0,
			player: "",
		},
		GameSettings: {
		game_id: 0,
			max_players: 0,
			auction: false,
			rent_in_prison: false,
			mortgage: false,
			even_build: false,
		starting_cash: 0,
			private_room_code: 0,
		},
		GamePlayer: {
		game_id: 0,
			player_address: "",
		balance: 0,
			position: 0,
			order: 0,
			symbol: 0,
			username: 0,
		},
		AddressToUsername: {
			address: "",
			username: 0,
		},
		Registered: {
			address: "",
			is_registered: false,
		},
		Stats: {
			id: 0,
		total_users: 0,
		total_games: 0,
		},
		User: {
			username: 0,
		id: 0,
			player_address: "",
			registered_at: 0,
		games_played: 0,
		games_won: 0,
		games_lost: 0,
		total_staked: 0,
		total_earned: 0,
		total_withdrawn: 0,
		properties_bought: 0,
		properties_sold: 0,
		},
		CollectibleMeta: {
		token_id: 0,
			perk: 0,
		strength: 0,
		},
		CollectiblePrices: {
		token_id: 0,
		tyc_price: 0,
		usdc_price: 0,
		},
		RewardConfig: {
			id: 0,
			game_contract: "",
			player_contract: "",
			owner: "",
			paused: false,
			tyc_token: "",
			usdc_token: "",
			erc1155_contract: "",
		},
		RewardCounters: {
			id: 0,
		next_voucher_id: 0,
		next_collectible_id: 0,
		},
		ShopListing: {
		token_id: 0,
			in_shop: false,
		},
		VoucherRedeemValue: {
		token_id: 0,
		tyc_value: 0,
		},
		TokenConfig: {
			id: 0,
			owner: "",
		},
		TotalSupply: {
			id: 0,
		value: 0,
		},
		TycAllowance: {
			owner: "",
			spender: "",
		amount: 0,
		},
		TycBalance: {
			owner: "",
		balance: 0,
		},
	},
};
export enum ModelsMapping {
	Claim = 'tycoon-Claim',
	GameConfig = 'tycoon-GameConfig',
	HouseBalance = 'tycoon-HouseBalance',
	PlayerConfig = 'tycoon-PlayerConfig',
	PreviousGameCode = 'tycoon-PreviousGameCode',
	TurnsPlayed = 'tycoon-TurnsPlayed',
	CodeToGame = 'tycoon-CodeToGame',
	Game = 'tycoon-Game',
	GameCounter = 'tycoon-GameCounter',
	GameOrderToPlayer = 'tycoon-GameOrderToPlayer',
	GameSettings = 'tycoon-GameSettings',
	GamePlayer = 'tycoon-GamePlayer',
	AddressToUsername = 'tycoon-AddressToUsername',
	Registered = 'tycoon-Registered',
	Stats = 'tycoon-Stats',
	User = 'tycoon-User',
	CollectibleMeta = 'tycoon-CollectibleMeta',
	CollectiblePrices = 'tycoon-CollectiblePrices',
	RewardConfig = 'tycoon-RewardConfig',
	RewardCounters = 'tycoon-RewardCounters',
	ShopListing = 'tycoon-ShopListing',
	VoucherRedeemValue = 'tycoon-VoucherRedeemValue',
	TokenConfig = 'tycoon-TokenConfig',
	TotalSupply = 'tycoon-TotalSupply',
	TycAllowance = 'tycoon-TycAllowance',
	TycBalance = 'tycoon-TycBalance',
}