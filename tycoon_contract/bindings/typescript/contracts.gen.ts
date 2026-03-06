import { DojoProvider, DojoCall } from "@dojoengine/core";
import { Account, AccountInterface, BigNumberish, CairoOption, CairoCustomEnum } from "starknet";
import * as models from "./models.gen";

export function setupWorld(provider: DojoProvider) {

	const build_game_createAiGame_calldata = (creatorUsername: BigNumberish, gameType: BigNumberish, playerSymbol: BigNumberish, numberOfAi: BigNumberish, code: BigNumberish, startingBalance: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "create_ai_game",
			calldata: [creatorUsername, gameType, playerSymbol, numberOfAi, code, startingBalance],
		};
	};

	const game_createAiGame = async (snAccount: Account | AccountInterface, creatorUsername: BigNumberish, gameType: BigNumberish, playerSymbol: BigNumberish, numberOfAi: BigNumberish, code: BigNumberish, startingBalance: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_createAiGame_calldata(creatorUsername, gameType, playerSymbol, numberOfAi, code, startingBalance),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_createGame_calldata = (creatorUsername: BigNumberish, gameType: BigNumberish, playerSymbol: BigNumberish, numberOfPlayers: BigNumberish, code: BigNumberish, startingBalance: BigNumberish, stakeAmount: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "create_game",
			calldata: [creatorUsername, gameType, playerSymbol, numberOfPlayers, code, startingBalance, stakeAmount],
		};
	};

	const game_createGame = async (snAccount: Account | AccountInterface, creatorUsername: BigNumberish, gameType: BigNumberish, playerSymbol: BigNumberish, numberOfPlayers: BigNumberish, code: BigNumberish, startingBalance: BigNumberish, stakeAmount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_createGame_calldata(creatorUsername, gameType, playerSymbol, numberOfPlayers, code, startingBalance, stakeAmount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_drainContract_calldata = (): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "drain_contract",
			calldata: [],
		};
	};

	const game_drainContract = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_drainContract_calldata(),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_endAiGame_calldata = (gameId: BigNumberish, finalPosition: BigNumberish, finalBalance: BigNumberish, isWin: boolean): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "end_ai_game",
			calldata: [gameId, finalPosition, finalBalance, isWin],
		};
	};

	const game_endAiGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish, finalPosition: BigNumberish, finalBalance: BigNumberish, isWin: boolean) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_endAiGame_calldata(gameId, finalPosition, finalBalance, isWin),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_exitGame_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "exit_game",
			calldata: [gameId],
		};
	};

	const game_exitGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_exitGame_calldata(gameId),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_getGame_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "get_game",
			calldata: [gameId],
		};
	};

	const game_getGame = async (gameId: BigNumberish) => {
		try {
			return await provider.call("tycoon", build_game_getGame_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_getGameByCode_calldata = (code: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "get_game_by_code",
			calldata: [code],
		};
	};

	const game_getGameByCode = async (code: BigNumberish) => {
		try {
			return await provider.call("tycoon", build_game_getGameByCode_calldata(code));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_getGamePlayer_calldata = (gameId: BigNumberish, player: string): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "get_game_player",
			calldata: [gameId, player],
		};
	};

	const game_getGamePlayer = async (gameId: BigNumberish, player: string) => {
		try {
			return await provider.call("tycoon", build_game_getGamePlayer_calldata(gameId, player));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_getGameSettings_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "get_game_settings",
			calldata: [gameId],
		};
	};

	const game_getGameSettings = async (gameId: BigNumberish) => {
		try {
			return await provider.call("tycoon", build_game_getGameSettings_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_getLastGameCode_calldata = (account: string): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "get_last_game_code",
			calldata: [account],
		};
	};

	const game_getLastGameCode = async (account: string) => {
		try {
			return await provider.call("tycoon", build_game_getLastGameCode_calldata(account));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_getPlayersInGame_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "get_players_in_game",
			calldata: [gameId],
		};
	};

	const game_getPlayersInGame = async (gameId: BigNumberish) => {
		try {
			return await provider.call("tycoon", build_game_getPlayersInGame_calldata(gameId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_initGameConfig_calldata = (minStake: BigNumberish, stakeToken: string, rewardContract: string, owner: string): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "init_game_config",
			calldata: [minStake, stakeToken, rewardContract, owner],
		};
	};

	const game_initGameConfig = async (snAccount: Account | AccountInterface, minStake: BigNumberish, stakeToken: string, rewardContract: string, owner: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_initGameConfig_calldata(minStake, stakeToken, rewardContract, owner),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_joinGame_calldata = (gameId: BigNumberish, playerUsername: BigNumberish, playerSymbol: BigNumberish, joinCode: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "join_game",
			calldata: [gameId, playerUsername, playerSymbol, joinCode],
		};
	};

	const game_joinGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish, playerUsername: BigNumberish, playerSymbol: BigNumberish, joinCode: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_joinGame_calldata(gameId, playerUsername, playerSymbol, joinCode),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_leavePendingGame_calldata = (gameId: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "leave_pending_game",
			calldata: [gameId],
		};
	};

	const game_leavePendingGame = async (snAccount: Account | AccountInterface, gameId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_leavePendingGame_calldata(gameId),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_setBackendController_calldata = (newController: string): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "set_backend_controller",
			calldata: [newController],
		};
	};

	const game_setBackendController = async (snAccount: Account | AccountInterface, newController: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_setBackendController_calldata(newController),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_setMinStake_calldata = (newMinStake: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "set_min_stake",
			calldata: [newMinStake],
		};
	};

	const game_setMinStake = async (snAccount: Account | AccountInterface, newMinStake: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_setMinStake_calldata(newMinStake),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_setMinTurnsForPerks_calldata = (newMin: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "set_min_turns_for_perks",
			calldata: [newMin],
		};
	};

	const game_setMinTurnsForPerks = async (snAccount: Account | AccountInterface, newMin: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_setMinTurnsForPerks_calldata(newMin),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_setTurnCount_calldata = (gameId: BigNumberish, player: string, count: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "set_turn_count",
			calldata: [gameId, player, count],
		};
	};

	const game_setTurnCount = async (snAccount: Account | AccountInterface, gameId: BigNumberish, player: string, count: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_setTurnCount_calldata(gameId, player, count),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_transferPropertyOwnership_calldata = (sellerUsername: BigNumberish, buyerUsername: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "transfer_property_ownership",
			calldata: [sellerUsername, buyerUsername],
		};
	};

	const game_transferPropertyOwnership = async (snAccount: Account | AccountInterface, sellerUsername: BigNumberish, buyerUsername: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_transferPropertyOwnership_calldata(sellerUsername, buyerUsername),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_game_withdrawHouse_calldata = (amount: BigNumberish): DojoCall => {
		return {
			contractName: "game",
			entrypoint: "withdraw_house",
			calldata: [amount],
		};
	};

	const game_withdrawHouse = async (snAccount: Account | AccountInterface, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_game_withdrawHouse_calldata(amount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_player_getUser_calldata = (username: BigNumberish): DojoCall => {
		return {
			contractName: "player",
			entrypoint: "get_user",
			calldata: [username],
		};
	};

	const player_getUser = async (username: BigNumberish) => {
		try {
			return await provider.call("tycoon", build_player_getUser_calldata(username));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_player_getUsername_calldata = (address: string): DojoCall => {
		return {
			contractName: "player",
			entrypoint: "get_username",
			calldata: [address],
		};
	};

	const player_getUsername = async (address: string) => {
		try {
			return await provider.call("tycoon", build_player_getUsername_calldata(address));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_player_initPlayerConfig_calldata = (rewardContract: string): DojoCall => {
		return {
			contractName: "player",
			entrypoint: "init_player_config",
			calldata: [rewardContract],
		};
	};

	const player_initPlayerConfig = async (snAccount: Account | AccountInterface, rewardContract: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_player_initPlayerConfig_calldata(rewardContract),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_player_isRegistered_calldata = (address: string): DojoCall => {
		return {
			contractName: "player",
			entrypoint: "is_registered",
			calldata: [address],
		};
	};

	const player_isRegistered = async (address: string) => {
		try {
			return await provider.call("tycoon", build_player_isRegistered_calldata(address));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_player_registerPlayer_calldata = (username: BigNumberish): DojoCall => {
		return {
			contractName: "player",
			entrypoint: "register_player",
			calldata: [username],
		};
	};

	const player_registerPlayer = async (snAccount: Account | AccountInterface, username: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_player_registerPlayer_calldata(username),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_balanceOf_calldata = (owner: string, tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "balance_of",
			calldata: [owner, tokenId],
		};
	};

	const reward_balanceOf = async (owner: string, tokenId: BigNumberish) => {
		try {
			return await provider.call("tycoon", build_reward_balanceOf_calldata(owner, tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_burnCollectibleForPerk_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "burn_collectible_for_perk",
			calldata: [tokenId],
		};
	};

	const reward_burnCollectibleForPerk = async (snAccount: Account | AccountInterface, tokenId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_burnCollectibleForPerk_calldata(tokenId),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_buyCollectible_calldata = (tokenId: BigNumberish, useUsdc: boolean): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "buy_collectible",
			calldata: [tokenId, useUsdc],
		};
	};

	const reward_buyCollectible = async (snAccount: Account | AccountInterface, tokenId: BigNumberish, useUsdc: boolean) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_buyCollectible_calldata(tokenId, useUsdc),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_buyCollectibleBatch_calldata = (tokenIds: Array<BigNumberish>, useUsdc: boolean): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "buy_collectible_batch",
			calldata: [tokenIds, useUsdc],
		};
	};

	const reward_buyCollectibleBatch = async (snAccount: Account | AccountInterface, tokenIds: Array<BigNumberish>, useUsdc: boolean) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_buyCollectibleBatch_calldata(tokenIds, useUsdc),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_getCashTierValue_calldata = (tier: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "get_cash_tier_value",
			calldata: [tier],
		};
	};

	const reward_getCashTierValue = async (tier: BigNumberish) => {
		try {
			return await provider.call("tycoon", build_reward_getCashTierValue_calldata(tier));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_getCollectibleInfo_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "get_collectible_info",
			calldata: [tokenId],
		};
	};

	const reward_getCollectibleInfo = async (tokenId: BigNumberish) => {
		try {
			return await provider.call("tycoon", build_reward_getCollectibleInfo_calldata(tokenId));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_initReward_calldata = (gameContract: string, playerContract: string, owner: string, tycToken: string, usdcToken: string, erc1155Contract: string): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "init_reward",
			calldata: [gameContract, playerContract, owner, tycToken, usdcToken, erc1155Contract],
		};
	};

	const reward_initReward = async (snAccount: Account | AccountInterface, gameContract: string, playerContract: string, owner: string, tycToken: string, usdcToken: string, erc1155Contract: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_initReward_calldata(gameContract, playerContract, owner, tycToken, usdcToken, erc1155Contract),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_mintCollectible_calldata = (to: string, perk: BigNumberish, strength: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "mint_collectible",
			calldata: [to, perk, strength],
		};
	};

	const reward_mintCollectible = async (snAccount: Account | AccountInterface, to: string, perk: BigNumberish, strength: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_mintCollectible_calldata(to, perk, strength),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_mintVoucher_calldata = (to: string, tycValue: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "mint_voucher",
			calldata: [to, tycValue],
		};
	};

	const reward_mintVoucher = async (snAccount: Account | AccountInterface, to: string, tycValue: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_mintVoucher_calldata(to, tycValue),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_pause_calldata = (): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "pause",
			calldata: [],
		};
	};

	const reward_pause = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_pause_calldata(),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_redeemVoucher_calldata = (tokenId: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "redeem_voucher",
			calldata: [tokenId],
		};
	};

	const reward_redeemVoucher = async (snAccount: Account | AccountInterface, tokenId: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_redeemVoucher_calldata(tokenId),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_restockCollectible_calldata = (tokenId: BigNumberish, amount: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "restock_collectible",
			calldata: [tokenId, amount],
		};
	};

	const reward_restockCollectible = async (snAccount: Account | AccountInterface, tokenId: BigNumberish, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_restockCollectible_calldata(tokenId, amount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_stockShop_calldata = (amount: BigNumberish, perk: BigNumberish, strength: BigNumberish, tycPrice: BigNumberish, usdcPrice: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "stock_shop",
			calldata: [amount, perk, strength, tycPrice, usdcPrice],
		};
	};

	const reward_stockShop = async (snAccount: Account | AccountInterface, amount: BigNumberish, perk: BigNumberish, strength: BigNumberish, tycPrice: BigNumberish, usdcPrice: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_stockShop_calldata(amount, perk, strength, tycPrice, usdcPrice),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_unpause_calldata = (): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "unpause",
			calldata: [],
		};
	};

	const reward_unpause = async (snAccount: Account | AccountInterface) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_unpause_calldata(),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_updateCollectiblePrices_calldata = (tokenId: BigNumberish, tycPrice: BigNumberish, usdcPrice: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "update_collectible_prices",
			calldata: [tokenId, tycPrice, usdcPrice],
		};
	};

	const reward_updateCollectiblePrices = async (snAccount: Account | AccountInterface, tokenId: BigNumberish, tycPrice: BigNumberish, usdcPrice: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_updateCollectiblePrices_calldata(tokenId, tycPrice, usdcPrice),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_withdrawFunds_calldata = (to: string, amount: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "withdraw_funds",
			calldata: [to, amount],
		};
	};

	const reward_withdrawFunds = async (snAccount: Account | AccountInterface, to: string, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_withdrawFunds_calldata(to, amount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_reward_withdrawFundsUsdc_calldata = (to: string, amount: BigNumberish): DojoCall => {
		return {
			contractName: "reward",
			entrypoint: "withdraw_funds_usdc",
			calldata: [to, amount],
		};
	};

	const reward_withdrawFundsUsdc = async (snAccount: Account | AccountInterface, to: string, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_reward_withdrawFundsUsdc_calldata(to, amount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_allowance_calldata = (owner: string, spender: string): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "allowance",
			calldata: [owner, spender],
		};
	};

	const token_allowance = async (owner: string, spender: string) => {
		try {
			return await provider.call("tycoon", build_token_allowance_calldata(owner, spender));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_approve_calldata = (spender: string, amount: BigNumberish): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "approve",
			calldata: [spender, amount],
		};
	};

	const token_approve = async (snAccount: Account | AccountInterface, spender: string, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_token_approve_calldata(spender, amount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_balanceOf_calldata = (owner: string): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "balance_of",
			calldata: [owner],
		};
	};

	const token_balanceOf = async (owner: string) => {
		try {
			return await provider.call("tycoon", build_token_balanceOf_calldata(owner));
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_decimals_calldata = (): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "decimals",
			calldata: [],
		};
	};

	const token_decimals = async () => {
		try {
			return await provider.call("tycoon", build_token_decimals_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_initToken_calldata = (owner: string): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "init_token",
			calldata: [owner],
		};
	};

	const token_initToken = async (snAccount: Account | AccountInterface, owner: string) => {
		try {
			return await provider.execute(
				snAccount,
				build_token_initToken_calldata(owner),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_mint_calldata = (to: string, amount: BigNumberish): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "mint",
			calldata: [to, amount],
		};
	};

	const token_mint = async (snAccount: Account | AccountInterface, to: string, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_token_mint_calldata(to, amount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_name_calldata = (): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "name",
			calldata: [],
		};
	};

	const token_name = async () => {
		try {
			return await provider.call("tycoon", build_token_name_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_symbol_calldata = (): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "symbol",
			calldata: [],
		};
	};

	const token_symbol = async () => {
		try {
			return await provider.call("tycoon", build_token_symbol_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_totalSupply_calldata = (): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "total_supply",
			calldata: [],
		};
	};

	const token_totalSupply = async () => {
		try {
			return await provider.call("tycoon", build_token_totalSupply_calldata());
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_transfer_calldata = (to: string, amount: BigNumberish): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "transfer",
			calldata: [to, amount],
		};
	};

	const token_transfer = async (snAccount: Account | AccountInterface, to: string, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_token_transfer_calldata(to, amount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const build_token_transferFrom_calldata = (from: string, to: string, amount: BigNumberish): DojoCall => {
		return {
			contractName: "token",
			entrypoint: "transfer_from",
			calldata: [from, to, amount],
		};
	};

	const token_transferFrom = async (snAccount: Account | AccountInterface, from: string, to: string, amount: BigNumberish) => {
		try {
			return await provider.execute(
				snAccount,
				build_token_transferFrom_calldata(from, to, amount),
				"tycoon",
			);
		} catch (error) {
			console.error(error);
			throw error;
		}
	};



	return {
		game: {
			createAiGame: game_createAiGame,
			buildCreateAiGameCalldata: build_game_createAiGame_calldata,
			createGame: game_createGame,
			buildCreateGameCalldata: build_game_createGame_calldata,
			drainContract: game_drainContract,
			buildDrainContractCalldata: build_game_drainContract_calldata,
			endAiGame: game_endAiGame,
			buildEndAiGameCalldata: build_game_endAiGame_calldata,
			exitGame: game_exitGame,
			buildExitGameCalldata: build_game_exitGame_calldata,
			getGame: game_getGame,
			buildGetGameCalldata: build_game_getGame_calldata,
			getGameByCode: game_getGameByCode,
			buildGetGameByCodeCalldata: build_game_getGameByCode_calldata,
			getGamePlayer: game_getGamePlayer,
			buildGetGamePlayerCalldata: build_game_getGamePlayer_calldata,
			getGameSettings: game_getGameSettings,
			buildGetGameSettingsCalldata: build_game_getGameSettings_calldata,
			getLastGameCode: game_getLastGameCode,
			buildGetLastGameCodeCalldata: build_game_getLastGameCode_calldata,
			getPlayersInGame: game_getPlayersInGame,
			buildGetPlayersInGameCalldata: build_game_getPlayersInGame_calldata,
			initGameConfig: game_initGameConfig,
			buildInitGameConfigCalldata: build_game_initGameConfig_calldata,
			joinGame: game_joinGame,
			buildJoinGameCalldata: build_game_joinGame_calldata,
			leavePendingGame: game_leavePendingGame,
			buildLeavePendingGameCalldata: build_game_leavePendingGame_calldata,
			setBackendController: game_setBackendController,
			buildSetBackendControllerCalldata: build_game_setBackendController_calldata,
			setMinStake: game_setMinStake,
			buildSetMinStakeCalldata: build_game_setMinStake_calldata,
			setMinTurnsForPerks: game_setMinTurnsForPerks,
			buildSetMinTurnsForPerksCalldata: build_game_setMinTurnsForPerks_calldata,
			setTurnCount: game_setTurnCount,
			buildSetTurnCountCalldata: build_game_setTurnCount_calldata,
			transferPropertyOwnership: game_transferPropertyOwnership,
			buildTransferPropertyOwnershipCalldata: build_game_transferPropertyOwnership_calldata,
			withdrawHouse: game_withdrawHouse,
			buildWithdrawHouseCalldata: build_game_withdrawHouse_calldata,
		},
		player: {
			getUser: player_getUser,
			buildGetUserCalldata: build_player_getUser_calldata,
			getUsername: player_getUsername,
			buildGetUsernameCalldata: build_player_getUsername_calldata,
			initPlayerConfig: player_initPlayerConfig,
			buildInitPlayerConfigCalldata: build_player_initPlayerConfig_calldata,
			isRegistered: player_isRegistered,
			buildIsRegisteredCalldata: build_player_isRegistered_calldata,
			registerPlayer: player_registerPlayer,
			buildRegisterPlayerCalldata: build_player_registerPlayer_calldata,
		},
		reward: {
			balanceOf: reward_balanceOf,
			buildBalanceOfCalldata: build_reward_balanceOf_calldata,
			burnCollectibleForPerk: reward_burnCollectibleForPerk,
			buildBurnCollectibleForPerkCalldata: build_reward_burnCollectibleForPerk_calldata,
			buyCollectible: reward_buyCollectible,
			buildBuyCollectibleCalldata: build_reward_buyCollectible_calldata,
			buyCollectibleBatch: reward_buyCollectibleBatch,
			buildBuyCollectibleBatchCalldata: build_reward_buyCollectibleBatch_calldata,
			getCashTierValue: reward_getCashTierValue,
			buildGetCashTierValueCalldata: build_reward_getCashTierValue_calldata,
			getCollectibleInfo: reward_getCollectibleInfo,
			buildGetCollectibleInfoCalldata: build_reward_getCollectibleInfo_calldata,
			initReward: reward_initReward,
			buildInitRewardCalldata: build_reward_initReward_calldata,
			mintCollectible: reward_mintCollectible,
			buildMintCollectibleCalldata: build_reward_mintCollectible_calldata,
			mintVoucher: reward_mintVoucher,
			buildMintVoucherCalldata: build_reward_mintVoucher_calldata,
			pause: reward_pause,
			buildPauseCalldata: build_reward_pause_calldata,
			redeemVoucher: reward_redeemVoucher,
			buildRedeemVoucherCalldata: build_reward_redeemVoucher_calldata,
			restockCollectible: reward_restockCollectible,
			buildRestockCollectibleCalldata: build_reward_restockCollectible_calldata,
			stockShop: reward_stockShop,
			buildStockShopCalldata: build_reward_stockShop_calldata,
			unpause: reward_unpause,
			buildUnpauseCalldata: build_reward_unpause_calldata,
			updateCollectiblePrices: reward_updateCollectiblePrices,
			buildUpdateCollectiblePricesCalldata: build_reward_updateCollectiblePrices_calldata,
			withdrawFunds: reward_withdrawFunds,
			buildWithdrawFundsCalldata: build_reward_withdrawFunds_calldata,
			withdrawFundsUsdc: reward_withdrawFundsUsdc,
			buildWithdrawFundsUsdcCalldata: build_reward_withdrawFundsUsdc_calldata,
		},
		token: {
			allowance: token_allowance,
			buildAllowanceCalldata: build_token_allowance_calldata,
			approve: token_approve,
			buildApproveCalldata: build_token_approve_calldata,
			balanceOf: token_balanceOf,
			buildBalanceOfCalldata: build_token_balanceOf_calldata,
			decimals: token_decimals,
			buildDecimalsCalldata: build_token_decimals_calldata,
			initToken: token_initToken,
			buildInitTokenCalldata: build_token_initToken_calldata,
			mint: token_mint,
			buildMintCalldata: build_token_mint_calldata,
			name: token_name,
			buildNameCalldata: build_token_name_calldata,
			symbol: token_symbol,
			buildSymbolCalldata: build_token_symbol_calldata,
			totalSupply: token_totalSupply,
			buildTotalSupplyCalldata: build_token_totalSupply_calldata,
			transfer: token_transfer,
			buildTransferCalldata: build_token_transfer_calldata,
			transferFrom: token_transferFrom,
			buildTransferFromCalldata: build_token_transferFrom_calldata,
		},
	};
}