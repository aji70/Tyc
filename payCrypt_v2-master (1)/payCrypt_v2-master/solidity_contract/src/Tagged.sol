// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title Wallet - A minimal smart wallet contract
contract Wallet {
    // Address of the wallet owner
    address public router;

    event FundsDeposited(address indexed from, uint256 amount, address indexed token); // For all fund entries

    /// @notice Constructor sets the initial owner of the wallet
    /// @param _router The address of the router contract
    constructor(address _router) {
        router = _router;
    }

    /// @notice Modifier to restrict actions to the wallet owner only
    modifier onlyOwner() {
        require(msg.sender == router, "Not authorized");
        _;
    }

    /// @notice Direct ERC20 deposit with event emission
    /// @param token Address of the ERC20 token
    /// @param amount The amount to deposit
    function depositERC20Direct(address token, uint256 amount) external returns (bool) {
        require(amount > 0, "Amount must be greater than 0");
        require(token != address(0), "Invalid token");

        IERC20 erc20 = IERC20(token);
        require(erc20.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");

        bool success = erc20.transferFrom(msg.sender, address(this), amount);
        if (success) {
            emit FundsDeposited(msg.sender, amount, token);
        }
        return success;
    }

    /// @notice Unified withdrawal for ETH or ERC20 tokens
    /// @param recipient The address to receive the funds/tokens
    /// @param amount The amount to withdraw (in wei for ETH, token decimals for ERC20)
    /// @param token Address of the ERC20 token (address(0) for ETH)
    function withdraw(address recipient, uint256 amount, address token) external onlyOwner returns (bool) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        if (token == address(0)) {
            // ETH withdrawal
            require(address(this).balance >= amount, "Insufficient ETH balance");
            (bool sent,) = payable(recipient).call{value: amount}("");
            require(sent, "ETH transfer failed");
            return true;
        } else {
            // ERC20 withdrawal
            IERC20 erc20 = IERC20(token);
            require(erc20.balanceOf(address(this)) >= amount, "Insufficient token balance");
            bool sent = erc20.transfer(recipient, amount);
            require(sent, "Token transfer failed");
            return sent;
        }
    }

    /// @notice Returns the balance for ETH or ERC20
    /// @param token Address of the ERC20 token (address(0) for ETH)
    /// @return The balance held by the wallet
    function getBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        } else {
            return IERC20(token).balanceOf(address(this));
        }
    }

    /// @notice Accepts direct Ether deposits and emits event
    receive() external payable {
        if (msg.value > 0) {
            emit FundsDeposited(msg.sender, msg.value, address(0));
        }
    }
}

interface IWallet {
    function withdraw(address recipient, uint256 amount, address token) external returns (bool);
    function getBalance(address token) external view returns (uint256);
    function depositERC20Direct(address token, uint256 amount) external returns (bool);
}

/// @title TagRouter - A contract to manage tag-based ETH routing to user-owned wallets.
contract Tagged is ReentrancyGuard {
    address public owner;
    address public treasury; // Revenue collection address

    // Fee configs (basis points: 100 = 1%)
    uint256 public swapFeeBasisPoints;
    uint256 public withdrawFeeBasisPoints;

    struct UserProfile {
        address owner; // The address that owns the tag
        address user_chainAddress; // The auto-generated wallet address for the user
        bool exists; // Whether the tag has been registered
    }

    mapping(string => UserProfile) private userProfiles; // Maps tags to user profiles
    mapping(string => bool) private tagTaken; // Tracks whether a tag is already taken

    event TagRegistered(string indexed tag, address indexed owner);
    event DepositReceived(string indexed tag, address indexed from, uint256 amount);
    event FundsDeposited(address indexed wallet, address indexed from, uint256 amount, address indexed token); // Relayed from wallet
    event FeeCollected(address indexed user, uint256 fee, address indexed token); // For revenue
    event OwnerETHWithdrawn(uint256 amount);
    event OwnerERC20Withdrawn(address indexed token, uint256 amount); // For platform ERC20 pulls
    event TreasuryUpdated(address indexed newTreasury); // For fee address changes
    event SwapFeeUpdated(uint256 newFee);
    event WithdrawFeeUpdated(uint256 newFee);
    event SwappedFromWallet(
        address indexed wallet, address indexed token, uint256 ethAmount, uint256 tokenAmount, string tag
    );
    event SwappedFromToken(
        address indexed wallet, address indexed token, uint256 tokenAmount, uint256 ethAmount, string tag
    );

    /// @notice Constructor sets the initial owner and treasury
    constructor() {
        owner = msg.sender;
        treasury = msg.sender; // Defaults to owner
        swapFeeBasisPoints = 50; // 0.5%
        withdrawFeeBasisPoints = 100; // 1%
    }

    // Ensures that only the owner of a tag can call certain functions
    modifier onlyTagOwner(string memory tag) {
        require(userProfiles[tag].owner == msg.sender, "Not tag owner");
        _;
    }

    // Only owner modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Update treasury address (owner only)
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /// @notice Update swap fee (owner only)
    function updateSwapFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        swapFeeBasisPoints = newFee;
        emit SwapFeeUpdated(newFee);
    }

    /// @notice Update withdraw fee (owner only)
    function updateWithdrawFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        withdrawFeeBasisPoints = newFee;
        emit WithdrawFeeUpdated(newFee);
    }

    /// @notice Registers a unique tag and deploys a user wallet
    /// @param tag The unique string identifier for the user
    /// @param _owner The address of the user who owns the tag
    /// @return The deployed wallet address associated with the tag
    function register(string memory tag, address _owner) external returns (address) {
        require(!tagTaken[tag], "Tag already taken");
        require(bytes(tag).length > 2, "Tag too short");

        address userwallet = address(new Wallet(address(this)));
        userProfiles[tag] = UserProfile(_owner, userwallet, true);
        tagTaken[tag] = true;

        emit TagRegistered(tag, _owner);
        return userwallet;
    }

    /// @notice Unified deposit for ETH or ERC20 to a tag's wallet
    /// @param tag The registered tag to deposit to
    /// @param token Address of the ERC20 token (address(0) for ETH)
    /// @param amount The amount (msg.value for ETH, token amount for ERC20)
    function deposit(string memory tag, address token, uint256 amount) external payable {
        require(userProfiles[tag].exists, "Tag not registered");
        address userWallet = userProfiles[tag].user_chainAddress;
        require(userWallet != address(0), "User wallet not found");

        if (token == address(0)) {
            // ETH deposit
            require(msg.value == amount, "Amount mismatch");
            require(amount > 0, "No ETH sent");
            (bool success,) = userWallet.call{value: amount}("");
            require(success, "ETH transfer failed");
            emit DepositReceived(tag, msg.sender, amount);
            _emitWalletDeposit(userWallet, msg.sender, amount, address(0));
        } else {
            // ERC20 deposit
            require(msg.value == 0, "ETH not allowed for token deposit");
            require(amount > 0, "No tokens sent");
            require(token != address(0), "Invalid token address");

            IERC20 erc20 = IERC20(token);
            require(erc20.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");

            bool success = erc20.transferFrom(msg.sender, userWallet, amount);
            require(success, "Token transfer failed");

            emit DepositReceived(tag, msg.sender, amount);
            _emitWalletDeposit(userWallet, msg.sender, amount, token);
        }
    }

    /// @notice Internal helper to emit wallet deposit event from router
    function _emitWalletDeposit(address wallet, address from, uint256 amount, address token) internal {
        emit FundsDeposited(wallet, from, amount, token);
    }

    /// @notice Returns the wallet address associated with a tag
    /// @param tag The registered tag
    /// @return The wallet address deployed for the tag
    function getUserChainAddress(string memory tag) external view returns (address) {
        require(userProfiles[tag].exists, "Tag does not exist");
        return userProfiles[tag].user_chainAddress;
    }

    /// @notice Returns the current ETH balance of the tag’s wallet (backward compat)
    /// @param tag The registered tag
    /// @return The ETH balance of the tag's wallet
    function getTagBalance(string memory tag) public view returns (uint256) {
        address userwallet = userProfiles[tag].user_chainAddress;
        require(userwallet != address(0), "Tag not registered");
        return userwallet.balance;
    }

    /// @notice Unified balance query for ETH or ERC20 in the tag’s wallet
    /// @param tag The registered tag
    /// @param token Address of the ERC20 token (address(0) for ETH)
    /// @return The balance of the tag's wallet
    function getTagBalance(string memory tag, address token) external view returns (uint256) {
        address userwallet = userProfiles[tag].user_chainAddress;
        require(userwallet != address(0), "Tag not registered");
        return IWallet(userwallet).getBalance(token);
    }

    /// @notice Withdraws the entire contract ETH balance to the given address (owner only).
    /// @dev Only the contract owner can call this function.
    /// @param to The address that will receive the withdrawn ETH.
    function withdrawFromContract(address to) external onlyOwner {
        require(to != address(0), "Invalid recipient address");

        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        (bool success,) = to.call{value: balance}("");
        require(success, "ETH transfer failed");

        emit OwnerETHWithdrawn(balance);
    }

    /// @notice Withdraw ERC20 from the contract (owner only)
    /// @param token The ERC20 token address
    /// @param to The recipient address
    /// @param amount The amount to withdraw (0 for full balance)
    function withdrawERC20FromContract(address token, address to, uint256 amount) external onlyOwner returns (bool) {
        require(token != address(0), "Invalid token");
        require(to != address(0), "Invalid recipient");

        IERC20 erc20 = IERC20(token);
        uint256 balance = erc20.balanceOf(address(this));
        if (amount == 0 || amount > balance) {
            amount = balance;
        }
        require(amount > 0, "No tokens to withdraw");

        bool success = erc20.transfer(to, amount);
        require(success, "Transfer failed");

        emit OwnerERC20Withdrawn(token, amount);
        return true;
    }

    /**
     * @notice Returns the ETH balance held by the contract.
     * @return balance The balance of the contract in wei.
     */
    function getContractBalance() external view returns (uint256 balance) {
        return address(this).balance;
    }

    /**
     * @notice Swap ETH from user wallet for an ERC20 token at a given rate.
     * @param token The ERC20 token contract address to send to the user.
     * @param rate  Number of tokens to send per 1 ETH (18 decimals).
     *              Example: If 1 ETH = 200 USDC, rate = 200 * 10^18.
     */
    function swapEthForToken(address token, uint256 rate, string memory _tag, uint256 _amountEth) public nonReentrant {
        require(_amountEth > 0, "No ETH amount");
        require(rate > 0, "Invalid rate");

        address walletAddr = userProfiles[_tag].user_chainAddress;
        require(walletAddr != address(0), "Tag not registered");

        IWallet wallet = IWallet(walletAddr);
        require(wallet.getBalance(address(0)) >= _amountEth, "Insufficient ETH in user wallet");

        uint256 before = address(this).balance;
        wallet.withdraw(address(this), _amountEth, address(0));
        require(address(this).balance >= before + _amountEth, "Withdraw failed");

        uint256 amountToSend = (_amountEth * rate) / 1 ether;

        // Apply swap fee to output
        uint256 fee = (amountToSend * swapFeeBasisPoints) / 10000;
        uint256 netAmountToSend = amountToSend;
        if (fee > 0) {
            netAmountToSend -= fee;
        }

        IERC20 erc20 = IERC20(token);
        require(erc20.balanceOf(address(this)) >= amountToSend, "Insufficient token liquidity"); // Check full amount

        // Transfer fee first
        if (fee > 0) {
            require(erc20.transfer(treasury, fee), "Fee transfer failed");
            emit FeeCollected(walletAddr, fee, token);
        }

        // Transfer net to user
        erc20.transfer(walletAddr, netAmountToSend);

        emit SwappedFromWallet(walletAddr, token, _amountEth, netAmountToSend, _tag);
    }

    /**
     * @notice Swap ERC20 tokens from user wallet for ETH at a given rate.
     * @param token The ERC20 token contract address being swapped in.
     * @param amount The amount of tokens the user wants to swap (in token decimals).
     * @param rate   Number of tokens required per 1 ETH (scaled to 18 decimals).
     *               Example: If 200 USDC = 1 ETH, rate = 200 * 10^18.
     * @param _tag   The tag associated with the user.
     */
    function swapTokenForEth(address token, uint256 amount, uint256 rate, string memory _tag) public nonReentrant {
        require(amount > 0, "No token amount");
        require(rate > 0, "Invalid rate");

        address walletAddr = userProfiles[_tag].user_chainAddress;
        require(walletAddr != address(0), "Tag not registered");

        // Calculate how much ETH to send
        // Formula: amount / rate = ETH (scaled by 1 ether for precision)
        uint256 ethToSend = (amount * 1 ether) / rate;

        // Apply swap fee to output
        uint256 fee = (ethToSend * swapFeeBasisPoints) / 10000;
        uint256 netEthToSend = ethToSend;
        if (fee > 0) {
            netEthToSend -= fee;
        }
        require(address(this).balance >= ethToSend, "Insufficient ETH liquidity");

        IERC20 erc20 = IERC20(token);
        IWallet wallet = IWallet(walletAddr);

        uint256 beforeBal = erc20.balanceOf(address(this));

        // Pull tokens from the user’s on-chain wallet into this contract
        wallet.withdraw(address(this), amount, address(erc20));

        // Verify we actually received the tokens
        require(erc20.balanceOf(address(this)) >= beforeBal + amount, "Token transfer failed");

        // Send fee ETH first
        if (fee > 0) {
            (bool feeSent,) = payable(treasury).call{value: fee}("");
            require(feeSent, "Fee transfer failed");
            emit FeeCollected(walletAddr, fee, address(0));
        }

        // Send ETH to the user's wallet
        (bool sent,) = payable(walletAddr).call{value: netEthToSend}("");
        require(sent, "ETH transfer failed");

        emit SwappedFromToken(walletAddr, token, amount, netEthToSend, _tag);
    }

    /// @notice Unified withdrawal from tag's wallet for ETH or ERC20 (with fee)
    /// @param to The address to receive the funds/tokens
    /// @param amount The amount to withdraw
    /// @param _tag The tag associated with the user
    /// @param token Address of the ERC20 token (address(0) for ETH)
    function withdrawFromWallet(address to, uint256 amount, string memory _tag, address token) external onlyTagOwner(_tag) {
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than 0");

        IWallet wallet = IWallet(userProfiles[_tag].user_chainAddress);
        require(wallet.getBalance(token) >= amount, "Insufficient wallet balance");

        // Calculate withdraw fee
        uint256 fee = (amount * withdrawFeeBasisPoints) / 10000;
        uint256 netAmount = amount;
        if (fee > 0) {
            netAmount -= fee;
            require(netAmount > 0, "Fee too high"); // Prevent full drain by fee
            // Fee paid from wallet to treasury
            wallet.withdraw(treasury, fee, token);
            emit FeeCollected(msg.sender, fee, token);
        }

        // Send net to recipient
        wallet.withdraw(to, netAmount, token);
    }

    /**
     * @notice Returns the ERC20 token balance held by the tag's wallet (backward compat)
     * @param token Address of the ERC20 token
     * @param _tag The tag associated with the user
     * @return Token balance owned by the tag's wallet
     */
    function getERC20Balance(address token, string memory _tag) external view returns (uint256) {
        address userwallet = userProfiles[_tag].user_chainAddress;
        require(userwallet != address(0), "Tag not registered");
        uint256 balance = IERC20(token).balanceOf(userwallet);
        return balance;
    }

    /// @notice Fallback receive function to allow ETH transfers directly to the router contract
    receive() external payable {}
}