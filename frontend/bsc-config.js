// Di bagian atas file, tambahkan konfigurasi gas
const GAS_CONFIG = {
    defaultGasLimit: 100000, // Default gas limit
    unstakeGasLimit: 100000, // Gas limit for unstake
    unstakeEarlyGasLimit: 80000, // Gas limit for early unstake
    stakeGasLimit: 120000 // Gas limit for stake
};

const BSC_CONFIG = {
    chainId: '0x61',
    chainName: 'BSC Testnet',
    nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
    rpcUrls: ['https://bsc-testnet.publicnode.com'],
    blockExplorerUrls: ['https://testnet.bscscan.com']
};

const CONFIG = {
    pepeToken: {
        address: '0x578a700c214AF091d377f942c15A2413306006bc',
        abi: [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ]
    },
    dummyUSDT: {
        address: '0xafFED4B10C3Dc1822bD992F56Dae9F6aBb8E0244',
        abi: [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function mint(address to, uint256 amount)",
            "function decimals() view returns (uint8)"
        ]
    },
    pepeStaking: {
        address: '0x808874626317e75Df7f495a3f3e7617B6c26073B',
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
        ],
        pools: [
            { name: "Pool 1", minPepe: "1,000,000", reward: "7.5" },
            { name: "Pool 2", minPepe: "2,000,000", reward: "15" },
            { name: "Pool 3", minPepe: "5,000,000", reward: "45" },
            { name: "Pool 4", minPepe: "10,000,000", reward: "150" },
            { name: "Pool 5", minPepe: "20,000,000", reward: "360" },
            { name: "Pool 6", minPepe: "100,000,000", reward: "3,000" },
            { name: "Pool 7", minPepe: "500", reward: "10" } // Tambahkan Pool 7 yang baru dibuat
        ],
        gasLimit: {
            stake: 120000,
            unstake: 100000,
            unstakeEarly: 80000
        }
    }
};

// Export untuk digunakan di file lain
window.GAS_CONFIG = GAS_CONFIG;
window.BSC_CONFIG = BSC_CONFIG;
window.CONFIG = CONFIG;
