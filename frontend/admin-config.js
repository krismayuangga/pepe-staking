const CONFIG = {
    BSC_CONFIG: {
        chainId: '0x61',
        chainName: 'BSC Testnet',
        nativeCurrency: { 
            name: 'tBNB', 
            symbol: 'tBNB', 
            decimals: 18 
        },
        rpcUrls: ['https://bsc-testnet.publicnode.com'],
        blockExplorerUrls: ['https://testnet.bscscan.com']
    },
    pepeToken: {
        address: '0x578a700c214AF091d377f942c15A2413306006bc',
        abi: [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ]
    },
    pepeStaking: {
        address: '0xEE9687DEaA16cecAb36726eF58ce9bdf0f6FBf73',
        abi: [
            "function stake(uint256 poolId, uint256 amount)",
            "function unstake(uint256 stakeIndex)",
            "function unstakeEarly(uint256 stakeIndex)",
            "function getUserStakes(address) view returns (tuple(uint256 amount, uint256 startTime, uint256 poolId, bool hasClaimedReward)[])",
            "function getAllPoolsInfo() view returns (tuple(uint256 minStakeAmount, uint256 maxHolders, uint256 rewardPerHolder, uint256 totalStaked, uint256 currentHolders, bool isActive, uint256 lockPeriod)[])",
            "function DEFAULT_LOCK_PERIOD() view returns (uint256)",
            "function owner() view returns (address)",
            "function isAdmin(address) view returns (bool)",
            "function setLockPeriod(uint256 newPeriod)",
            "function setPoolLockPeriod(uint256 poolId, uint256 newPeriod)",
            "function applyLockPeriodToAllPools(uint256 newPeriod)",
            "function createPool(uint256 minAmount, uint256 maxHolders, uint256 reward, uint256 lockPeriod, bool isActive)",
            "function updatePoolReward(uint256 poolId, uint256 newReward)",
            "function setPoolStatus(uint256 poolId, bool isActive)",
            "function setAdmin(address admin, bool status)",
            "function setRewardToken(address token)",
            "function addUSDT(uint256 amount)",
            "function rewardToken() view returns (address)"
        ]
    },
    dummyUSDT: {
        address: '0xafFED4B10C3Dc1822bD992F56Dae9F6aBb8E0244',
        abi: [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function mint(address to, uint256 amount)"
        ]
    }
};

// Export CONFIG untuk digunakan di file lain
window.CONFIG = CONFIG;
window.BSC_CONFIG = CONFIG.BSC_CONFIG;
