// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
.______    _______ .______    _______    .___________. __    __  .______    _______     _______.
|   _  \  |   ____||   _  \  |   ____|   |           ||  |  |  | |   _  \  |   ____|   /       |
|  |_)  | |  |__   |  |_)  | |  |__      `---|  |----`|  |  |  | |  |_)  | |  |__     |   (----`
|   ___/  |   __|  |   ___/  |   __|         |  |     |  |  |  | |   _  <  |   __|     \   \    
|  |      |  |____ |  |      |  |____        |  |     |  `--'  | |  |_)  | |  |____.----)   |   
| _|      |_______|| _|      |_______|       |__|      \______/  |______/  |_______|_______/    
*/

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract BSCPEPEStaking is Ownable, ReentrancyGuard {
    IERC20 public pepeToken;
    IERC20 public rewardToken;
    mapping(address => bool) public isAdmin;
    mapping(address => Stake[]) public userStakes;
    Pool[] public pools;

    uint256 public DEFAULT_LOCK_PERIOD = 30 days; // Default lock period

    struct Pool {
        uint256 minStakeAmount;
        uint256 maxHolders;
        uint256 rewardPerHolder;
        uint256 totalStaked;
        uint256 currentHolders;
        bool isActive;
        uint256 lockPeriod; // New: Lock period specific to each pool
    }

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 poolId;
        bool hasClaimedReward;
    }

    event Staked(address indexed user, uint256 indexed poolId, uint256 amount);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount, uint256 reward);
    event AdminSet(address indexed admin, bool status);
    event RewardTokenSet(address indexed token);
    event LockPeriodUpdated(uint256 newPeriod);
    event PoolLockPeriodUpdated(uint256 indexed poolId, uint256 newPeriod);
    event TokensRecovered(address token, uint256 amount);
    event UnstakedEarly(address indexed user, uint256 indexed poolId, uint256 amount);
    event PoolCreated(uint256 indexed poolId, uint256 minAmount, uint256 reward);
    event PoolUpdated(uint256 indexed poolId, uint256 reward);

    modifier onlyAdmin() {
        require(isAdmin[msg.sender] || owner() == msg.sender, "Not admin");
        _;
    }

    constructor(address _pepeToken) Ownable(msg.sender) {
        pepeToken = IERC20(_pepeToken);
        
        // Initialize pools with DEFAULT_LOCK_PERIOD for each pool
        pools.push(Pool(1_000_000 ether, 1000, 7.5 ether, 0, 0, true, DEFAULT_LOCK_PERIOD));
        pools.push(Pool(2_000_000 ether, 800, 15 ether, 0, 0, true, DEFAULT_LOCK_PERIOD));
        pools.push(Pool(5_000_000 ether, 400, 45 ether, 0, 0, true, DEFAULT_LOCK_PERIOD));
        pools.push(Pool(10_000_000 ether, 200, 150 ether, 0, 0, true, DEFAULT_LOCK_PERIOD));
        pools.push(Pool(20_000_000 ether, 208, 360 ether, 0, 0, true, DEFAULT_LOCK_PERIOD));
        pools.push(Pool(100_000_000 ether, 60, 3000 ether, 0, 0, true, DEFAULT_LOCK_PERIOD));
    }

    function setAdmin(address admin, bool status) external onlyOwner {
        isAdmin[admin] = status;
        emit AdminSet(admin, status);
    }

    function setRewardToken(address token) external onlyOwner {
        rewardToken = IERC20(token);
        emit RewardTokenSet(token);
    }

    // Set global default lock period
    function setLockPeriod(uint256 newPeriod) external onlyAdmin {
        require(newPeriod > 0, "Lock period must be > 0");
        DEFAULT_LOCK_PERIOD = newPeriod;
        emit LockPeriodUpdated(newPeriod);
    }

    // NEW: Set lock period for a specific pool
    function setPoolLockPeriod(uint256 poolId, uint256 newPeriod) external onlyAdmin {
        require(poolId < pools.length, "Invalid pool");
        require(newPeriod > 0, "Lock period must be > 0");
        
        Pool storage pool = pools[poolId];
        pool.lockPeriod = newPeriod;
        
        emit PoolLockPeriodUpdated(poolId, newPeriod);
    }

    // NEW: Apply lock period to all pools
    function applyLockPeriodToAllPools(uint256 newPeriod) external onlyAdmin {
        require(newPeriod > 0, "Lock period must be > 0");
        
        DEFAULT_LOCK_PERIOD = newPeriod;
        
        for (uint256 i = 0; i < pools.length; i++) {
            pools[i].lockPeriod = newPeriod;
            emit PoolLockPeriodUpdated(i, newPeriod);
        }
        
        emit LockPeriodUpdated(newPeriod);
    }

    // NEW: Create a new pool
    function createPool(
        uint256 minAmount, 
        uint256 maxHolders, 
        uint256 reward, 
        uint256 lockPeriod, 
        bool isActive
    ) external onlyAdmin {
        require(minAmount > 0, "Min amount must be > 0");
        require(maxHolders > 0, "Max holders must be > 0");
        require(reward > 0, "Reward must be > 0");
        require(lockPeriod > 0, "Lock period must be > 0");
        
        uint256 poolId = pools.length;
        
        pools.push(Pool({
            minStakeAmount: minAmount,
            maxHolders: maxHolders,
            rewardPerHolder: reward,
            totalStaked: 0,
            currentHolders: 0,
            isActive: isActive,
            lockPeriod: lockPeriod
        }));
        
        emit PoolCreated(poolId, minAmount, reward);
    }

    // NEW: Update pool rewards
    function updatePoolReward(uint256 poolId, uint256 newReward) external onlyAdmin {
        require(poolId < pools.length, "Invalid pool");
        require(newReward > 0, "Reward must be > 0");
        
        Pool storage pool = pools[poolId];
        pool.rewardPerHolder = newReward;
        
        emit PoolUpdated(poolId, newReward);
    }

    // NEW: Update pool status (active/inactive)
    function setPoolStatus(uint256 poolId, bool isActive) external onlyAdmin {
        require(poolId < pools.length, "Invalid pool");
        
        Pool storage pool = pools[poolId];
        pool.isActive = isActive;
    }

    function stake(uint256 poolId, uint256 amount) external nonReentrant {
        require(poolId < pools.length, "Invalid pool");
        Pool storage pool = pools[poolId];
        require(pool.isActive, "Pool is not active");
        require(amount >= pool.minStakeAmount, "Amount is less than minimum stake amount");
        require(pool.currentHolders < pool.maxHolders, "Pool is full");

        pepeToken.transferFrom(msg.sender, address(this), amount);

        userStakes[msg.sender].push(Stake({
            amount: amount,
            startTime: block.timestamp,
            poolId: poolId,
            hasClaimedReward: false
        }));

        pool.totalStaked += amount;
        pool.currentHolders += 1;

        emit Staked(msg.sender, poolId, amount);
    }

    // UPDATED: Check pool-specific lock period
    function unstake(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        Stake storage userStake = userStakes[msg.sender][stakeIndex];
        
        // Check stake status 
        require(!userStake.hasClaimedReward, "Already unstaked");
        
        // Get pool-specific lock period
        uint256 poolLockPeriod = pools[userStake.poolId].lockPeriod;
        require(block.timestamp >= userStake.startTime + poolLockPeriod, "Stake is still locked");
        
        // Cache values before modifying storage
        uint256 amount = userStake.amount;
        uint256 poolId = userStake.poolId;
        
        // Update stake record first to prevent reentrancy
        userStake.hasClaimedReward = true;
        
        // Update pool data
        Pool storage pool = pools[poolId];
        pool.totalStaked -= amount;
        pool.currentHolders -= 1;
        
        // Transfer tokens only after state changes
        uint256 reward = pool.rewardPerHolder;
        bool pepeSuccess = pepeToken.transfer(msg.sender, amount);
        require(pepeSuccess, "PEPE transfer failed");
        
        bool rewardSuccess = rewardToken.transfer(msg.sender, reward);
        require(rewardSuccess, "Reward transfer failed");

        emit Unstaked(msg.sender, poolId, amount, reward);
    }

    function unstakeEarly(uint256 stakeIndex) external nonReentrant {
        require(stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        Stake storage userStake = userStakes[msg.sender][stakeIndex];
        
        // Check stake status, hanya memeriksa apakah sudah unstake sebelumnya
        require(!userStake.hasClaimedReward, "Already unstaked");
        
        // Cache values before modifying storage
        uint256 amount = userStake.amount;
        uint256 poolId = userStake.poolId;
        
        // Update stake record first to prevent reentrancy
        userStake.hasClaimedReward = true;
        
        // Update pool data
        Pool storage pool = pools[poolId];
        pool.totalStaked -= amount;
        pool.currentHolders -= 1;
        
        // Transfer hanya token PEPE, tanpa reward USDT
        bool pepeSuccess = pepeToken.transfer(msg.sender, amount);
        require(pepeSuccess, "PEPE transfer failed");
        
        // Reward tidak diberikan untuk unstake sebelum waktunya
        
        emit UnstakedEarly(msg.sender, poolId, amount);
    }

    function getUserStakes(address user) external view returns (Stake[] memory) {
        return userStakes[user];
    }

    function getPoolDetails(uint256 poolId) external view returns (Pool memory) {
        require(poolId < pools.length, "Invalid pool");
        return pools[poolId];
    }

    function getAllPoolsInfo() external view returns (Pool[] memory) {
        return pools;
    }

    function recoverTokens(address token, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient balance");
        
        bool success = IERC20(token).transfer(msg.sender, amount);
        require(success, "Token transfer failed");
        
        emit TokensRecovered(token, amount);
    }

    function addUSDT(uint256 amount) external onlyAdmin {
        require(address(rewardToken) != address(0), "Reward token not set");
        require(amount > 0, "Amount must be > 0");
        
        bool success = rewardToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
    }
}
