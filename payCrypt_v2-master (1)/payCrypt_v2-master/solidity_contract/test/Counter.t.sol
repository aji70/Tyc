// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {Tagged, Wallet} from "../src/Tagged.sol";
import {USDC, USDT} from "../src/MockUsdc.sol";

contract TaggedTest is Test {
    Tagged public tagged;
    USDC public usdc;
    USDT public usdt;

    address owner = makeAddr("owner");
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");
    address treasury = makeAddr("treasury");

    event SwappedFromWallet(
        address indexed wallet, address indexed token, uint256 ethAmount, uint256 tokenAmount, string tag
    );
    event SwappedFromToken(
        address indexed wallet, address indexed token, uint256 tokenAmount, uint256 ethAmount, string tag
    );
    event FeeCollected(address indexed user, uint256 fee, address indexed token);
    event OwnerETHWithdrawn(uint256 amount);
    event OwnerERC20Withdrawn(address indexed token, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);
    event SwapFeeUpdated(uint256 newFee);
    event WithdrawFeeUpdated(uint256 newFee);

    function setUp() public {
        vm.startPrank(owner);
        tagged = new Tagged();
        usdc = new USDC(owner);
        usdt = new USDT(owner);
        vm.stopPrank();

        vm.deal(address(tagged), 1000 ether); // Fund router liquidity
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);

        // Update treasury for fee tests
        vm.prank(owner);
        tagged.updateTreasury(treasury);
    }

    /* ---------------------------- TAG REGISTRATION ---------------------------- */

    function test_registerTag() public {
        string memory tag = "testTag";
        vm.expectEmit(true, true, false, false);
        emit Tagged.TagRegistered(tag, user1);

        address userWallet = tagged.register(tag, user1);
        address expectedWallet = tagged.getUserChainAddress(tag);

        assertEq(userWallet, expectedWallet);
    }

    function test_registerTagTwiceReverts() public {
        string memory tag = "dupTag";
        tagged.register(tag, user1);

        vm.expectRevert("Tag already taken");
        tagged.register(tag, user2);
    }

    function test_registerShortTagReverts() public {
        string memory tag = "a"; // too short
        vm.expectRevert("Tag too short");
        tagged.register(tag, user1);
    }

    /* ---------------------------- DEPOSITS ---------------------------- */

    function test_depositEthToTag() public {
        string memory tag = "ethTag";
        address userWallet = tagged.register(tag, user1);

        vm.expectEmit(true, true, false, true);
        emit Tagged.DepositReceived(tag, user1, 1 ether);

        vm.prank(user1);
        tagged.deposit{value: 1 ether}(tag, address(0), 1 ether);

        assertEq(userWallet.balance, 1 ether);
    }

    function test_depositZeroEthReverts() public {
        string memory tag = "zeroEth";
        tagged.register(tag, user1);

        vm.expectRevert("No ETH sent");
        vm.prank(user1);
        tagged.deposit{value: 0}(tag, address(0), 0);
    }

    function test_depositERC20ToTag() public {
        string memory tag = "erc20Tag";
        address userWallet = tagged.register(tag, user1);

        // Mint 1000 USDC to user1 (6 decimals)
        vm.prank(owner);
        usdc.mint(user1, 1000e6);

        vm.startPrank(user1);
        usdc.approve(address(tagged), 1000e6);

        vm.expectEmit(true, true, false, true);
        emit Tagged.DepositReceived(tag, user1, 1000e6);

        tagged.deposit(tag, address(usdc), 1000e6);
        vm.stopPrank();

        assertEq(usdc.balanceOf(userWallet), 1000e6);
    }

    function test_depositERC20InvalidAmountReverts() public {
        string memory tag = "erc20Invalid";
        tagged.register(tag, user1);

        vm.expectRevert("No tokens sent");
        tagged.deposit(tag, address(usdc), 0);
    }

    function test_depositToUnregisteredTagReverts() public {
        vm.expectRevert("Tag not registered");
        vm.prank(user1);
        tagged.deposit{value: 1 ether}("ghostTag", address(0), 1 ether);
    }

    function test_depositERC20ToUnregisteredTagReverts() public {
        vm.expectRevert("Tag not registered");
        tagged.deposit("ghostTag", address(usdc), 100);
    }

    /* ---------------------------- SWAPS ---------------------------- */

    function test_swapEthForToken() public {
        string memory tag = "testTag";

        // Register tag
        address userWallet = tagged.register(tag, user1);

        // Fund user wallet with ETH
        vm.deal(userWallet, 1 ether);

        // Fund router with token liquidity
        vm.prank(owner);
        usdc.mint(address(tagged), 1_000_000e6); // 6 decimals for USDC

        // Expect event (net amount after fee)
        uint256 rate = 3500 * 1e6; // Adjusted for USDC decimals
        uint256 swapAmt = 1 ether;
        uint256 expectedTokens = (swapAmt * rate) / 1 ether; // 3500e6
        uint256 feeBp = tagged.swapFeeBasisPoints(); // 50 bp
        uint256 fee = (expectedTokens * feeBp) / 10000;
        uint256 netTokens = expectedTokens - fee;

        vm.expectEmit(true, true, false, true);
        emit SwappedFromWallet(userWallet, address(usdc), swapAmt, netTokens, tag);

        vm.prank(user1); // Tag owner calls swap
        tagged.swapEthForToken(address(usdc), rate, tag, swapAmt);

        // Check balances
        uint256 userWalletUSDC = usdc.balanceOf(userWallet);
        assertEq(userWalletUSDC, netTokens, "User wallet should receive correct USDC after swap");
        assertEq(usdc.balanceOf(treasury), fee, "Treasury should receive fee");
    }

    function test_swapEthForTokenInsufficientLiquidityReverts() public {
        string memory tag = "swapEthFail";
        address userWallet = tagged.register(tag, user1);
        vm.deal(userWallet, 1 ether);

        uint256 rate = 2000 * 1e6;

        vm.expectRevert("Insufficient token liquidity");
        vm.prank(user1);
        tagged.swapEthForToken(address(usdc), rate, tag, 1 ether);
    }

    function test_swapEthForTokenZeroEthReverts() public {
        string memory tag = "zeroSwapEth";
        tagged.register(tag, user1);

        vm.expectRevert("No ETH amount");
        tagged.swapEthForToken(address(usdc), 3500 * 1e6, tag, 0);
    }

    function test_swapEthForTokenTagNotRegisteredReverts() public {
        vm.expectRevert("Tag not registered");
        vm.prank(user1);
        tagged.swapEthForToken(address(usdc), 3500 * 1e6, "ghostTag", 1 ether);
    }

    function test_swapTokenForEth() public {
        string memory tag = "swapToken";
        address userWallet = tagged.register(tag, user1);

        // Fund router with ETH
        vm.deal(address(tagged), 100 ether);

        // Fund user wallet with tokens
        vm.prank(owner);
        usdc.mint(userWallet, 2000 * 1e6);

        uint256 rate = 2000 * 1e6; // Adjusted for USDC decimals: 2000 tokens = 1 ETH
        uint256 tokenAmount = 2000 * 1e6;
        uint256 expectedEth = (tokenAmount * 1 ether) / rate; // 1 ETH
        uint256 feeBp = tagged.swapFeeBasisPoints();
        uint256 fee = (expectedEth * feeBp) / 10000;
        uint256 netEth = expectedEth - fee;

        vm.expectEmit(true, true, false, true);
        emit SwappedFromToken(userWallet, address(usdc), tokenAmount, netEth, tag);

        vm.prank(user1);
        tagged.swapTokenForEth(address(usdc), tokenAmount, rate, tag);

        assertEq(userWallet.balance, netEth);
        assertEq(usdc.balanceOf(address(tagged)), tokenAmount);
        assertEq(treasury.balance, fee);
    }

    function test_swapTokenForEthInsufficientLiquidityReverts() public {
        string memory tag = "testTag";
        address userWallet = tagged.register(tag, user1);

        // Clear ETH from router to force revert
        vm.deal(address(tagged), 0);

        // Fund wallet with USDC
        vm.prank(owner);
        usdc.mint(userWallet, 10000 * 1e6);

        // Expect revert
        vm.expectRevert("Insufficient ETH liquidity");
        vm.prank(user1);
        tagged.swapTokenForEth(address(usdc), 1000 * 1e6, 1000 * 1e6, tag);
    }

    function test_swapTokenForEthZeroAmountReverts() public {
        string memory tag = "zeroSwapToken";
        tagged.register(tag, user1);

        vm.expectRevert("No token amount");
        tagged.swapTokenForEth(address(usdc), 0, 2000 * 1e6, tag);
    }

    function test_swapTokenForEthTagNotRegisteredReverts() public {
        vm.expectRevert("Tag not registered");
        tagged.swapTokenForEth(address(usdc), 1000 * 1e6, 2000 * 1e6, "ghostTag");
    }

    /* ---------------------------- WITHDRAWALS ---------------------------- */

    function test_withdrawFromWalletWithFee() public {
        string memory tag = "withdrawTag";
        address userWallet = tagged.register(tag, user1);

        // Fund wallet
        vm.deal(userWallet, 2 ether);

        uint256 withdrawAmt = 1 ether;
        uint256 feeBp = tagged.withdrawFeeBasisPoints(); // 100 bp = 1%
        uint256 fee = (withdrawAmt * feeBp) / 10000; // 0.01 ETH
        uint256 netWithdraw = withdrawAmt - fee;

        address recipient = makeAddr("recipient");
        vm.deal(recipient, 0);

        vm.prank(user1);
        tagged.withdrawFromWallet(recipient, withdrawAmt, tag, address(0));

        assertEq(recipient.balance, netWithdraw);
        assertEq(treasury.balance, fee);
    }

    function test_withdrawFromWalletERC20WithFee() public {
        string memory tag = "withdrawERC20Tag";
        address userWallet = tagged.register(tag, user1);

        // Fund wallet with USDC
        vm.prank(owner);
        usdc.mint(userWallet, 2000 * 1e6);

        uint256 withdrawAmt = 1000 * 1e6;
        uint256 feeBp = tagged.withdrawFeeBasisPoints();
        uint256 fee = (withdrawAmt * feeBp) / 10000;
        uint256 netWithdraw = withdrawAmt - fee;

        address recipient = makeAddr("recipient");

        vm.prank(user1);
        tagged.withdrawFromWallet(recipient, withdrawAmt, tag, address(usdc));

        assertEq(usdc.balanceOf(recipient), netWithdraw);
        assertEq(usdc.balanceOf(treasury), fee);
    }

    /* ---------------------------- OWNER FUNCTIONS ---------------------------- */

    function test_onlyOwnerCanWithdrawFromContract() public {
        // Deploy with owner = address(this)
        Tagged router = new Tagged();

        // Fund the contract with some ETH
        vm.deal(address(router), 1 ether);

        // Switch to a non-owner account
        address attacker = address(0xBEEF);
        vm.startPrank(attacker);

        // Expect revert
        vm.expectRevert("Not owner");
        router.withdrawFromContract(address(0xCAFE));

        vm.stopPrank();
    }

    function test_nonOwnerWithdrawFromContractReverts() public {
        vm.expectRevert("Not owner");
        vm.prank(user1);
        tagged.withdrawFromContract(user1);
    }

    function test_ownerWithdrawETH() public {
        uint256 withdrawAmt = 5 ether;
        vm.deal(address(tagged), withdrawAmt);

        address recipient = makeAddr("recipient");
        vm.prank(owner);
        tagged.withdrawFromContract(recipient);

        assertEq(recipient.balance, withdrawAmt);
    }

    function test_ownerWithdrawERC20() public {
        uint256 depositAmt = 1000 * 1e6;
        vm.prank(owner);
        usdc.mint(address(tagged), depositAmt);

        address recipient = makeAddr("recipient");
        vm.prank(owner);
        tagged.withdrawERC20FromContract(address(usdc), recipient, depositAmt);

        assertEq(usdc.balanceOf(recipient), depositAmt);
    }

    function test_withdrawFromContractZeroBalanceReverts() public {
        // Explicitly empty the router balance
        vm.deal(address(tagged), 0);

        // Must be called by owner
        vm.prank(owner);

        vm.expectRevert("No ETH to withdraw");
        tagged.withdrawFromContract(owner);
    }

    function test_withdrawFromContractInvalidRecipientReverts() public {
        vm.deal(address(tagged), 1 ether);

        vm.expectRevert("Invalid recipient address");
        vm.prank(owner);
        tagged.withdrawFromContract(address(0));
    }

    /* ---------------------------- WALLET PERMISSIONS ---------------------------- */

    function test_walletOnlyRouterCanWithdraw() public {
        address userWallet = tagged.register("walletTag", user1);
        Wallet w = Wallet(payable(userWallet));

        vm.deal(userWallet, 1 ether);

        // User trying directly should fail
        vm.prank(user1);
        vm.expectRevert("Not authorized");
        w.withdraw(payable(user1), 0.5 ether, address(0));
    }

    function test_walletRejectsUnauthorizedERC20Withdrawal() public {
        address userWallet = tagged.register("erc20Wallet", user1);
        Wallet w = Wallet(payable(userWallet));

        // Mint tokens into wallet
        vm.prank(owner);
        usdc.mint(userWallet, 1000 * 1e6);

        // User1 tries direct withdrawal -> should revert
        vm.startPrank(user1);
        vm.expectRevert("Not authorized");
        w.withdraw(user1, 500 * 1e6, address(usdc));
        vm.stopPrank();
    }

    function test_walletRejectsUnauthorizedETHWithdrawal() public {
        address userWallet = tagged.register("ethWallet", user1);
        Wallet w = Wallet(payable(userWallet));

        vm.deal(userWallet, 2 ether);

        // user2 tries to withdraw -> revert
        vm.startPrank(user2);
        vm.expectRevert("Not authorized");
        w.withdraw(payable(user2), 1 ether, address(0));
        vm.stopPrank();
    }

    function test_registerEmptyTagReverts() public {
        vm.expectRevert("Tag too short");
        tagged.register("", user1);
    }

    /* ---------------------------- FEE FUNCTIONS ---------------------------- */

    function test_updateTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        vm.expectEmit(true, true, false, false);
        emit TreasuryUpdated(newTreasury);

        vm.prank(owner);
        tagged.updateTreasury(newTreasury);

        assertEq(address(tagged.treasury()), newTreasury);
    }

    function test_updateTreasuryInvalidReverts() public {
        vm.expectRevert("Invalid treasury");
        vm.prank(owner);
        tagged.updateTreasury(address(0));
    }

    function test_updateSwapFee() public {
        uint256 newFee = 100; // 1%
        vm.expectEmit(true, true, false, false);
        emit SwapFeeUpdated(newFee);

        vm.prank(owner);
        tagged.updateSwapFee(newFee);

        assertEq(tagged.swapFeeBasisPoints(), newFee);
    }

    function test_updateSwapFeeTooHighReverts() public {
        vm.expectRevert("Fee too high");
        vm.prank(owner);
        tagged.updateSwapFee(1001); // >10%
    }

    function test_updateWithdrawFee() public {
        uint256 newFee = 200; // 2%
        vm.expectEmit(true, true, false, false);
        emit WithdrawFeeUpdated(newFee);

        vm.prank(owner);
        tagged.updateWithdrawFee(newFee);

        assertEq(tagged.withdrawFeeBasisPoints(), newFee);
    }

    function test_updateWithdrawFeeTooHighReverts() public {
        vm.expectRevert("Fee too high");
        vm.prank(owner);
        tagged.updateWithdrawFee(1001);
    }

    function test_nonOwnerUpdateTreasuryReverts() public {
        vm.expectRevert("Not owner");
        vm.prank(user1);
        tagged.updateTreasury(treasury);
    }

    function test_nonOwnerUpdateSwapFeeReverts() public {
        vm.expectRevert("Not owner");
        vm.prank(user1);
        tagged.updateSwapFee(50);
    }
}