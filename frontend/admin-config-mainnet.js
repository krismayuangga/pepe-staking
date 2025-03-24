const MAINNET_CONFIG = {
    BSC_CONFIG: {
        chainId: '0x38',  // BSC Mainnet chainId
        chainName: 'BSC Mainnet',
        nativeCurrency: { 
            name: 'BNB', 
            symbol: 'BNB', 
            decimals: 18 
        },
        rpcUrls: ['https://bsc.publicnode.com'],
        blockExplorerUrls: ['https://bscscan.com']
    },
    pepeToken: {
        address: '0x0c5779d8b1a606b0de41c14bee64f3bb1169c71b',  // Mainnet PEPE address
        abi: [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ]
    },
    pepeStaking: {
        address: '0x02f6F80bEc411e65A2008E7D2E3fC1C6ff1A9463',  // Mainnet staking address
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
    usdt: {  // Ubah dari dummyUSDT ke usdt untuk mainnet
        address: '0x55d398326f99059fF775485246999027B3197955',  // BSC Mainnet USDT
        abi: [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)"
            // Hapus mint karena USDT asli tidak memiliki fungsi ini
        ]
    }
};

// Export CONFIG untuk digunakan di file lain
window.MAINNET_CONFIG = MAINNET_CONFIG;  // Nama variabel harus MAINNET_CONFIG
window.BSC_MAINNET_CONFIG = MAINNET_CONFIG.BSC_CONFIG;