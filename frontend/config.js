// BSC Testnet Configuration
const CONFIG = {
    NETWORK: {
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
    CONTRACTS: {
        PEPE_TOKEN: '0x578a700c214AF091d377f942c15A2413306006bc',
        PEPE_TOKEN_ABI: [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ],
        BSC_PEPE_STAKING: '0x808874626317e75Df7f495a3f3e7617B6c26073B',
        BSC_PEPE_STAKING_ABI: [
            "function stake(uint256 poolId, uint256 amount)",
            "function unstake(uint256 stakeIndex)",
            "function getAllPoolsInfo() view returns (tuple(uint256 minStakeAmount, uint256 maxHolders, uint256 rewardPerHolder, uint256 totalStaked, uint256 currentHolders, bool isActive)[])",
            "function getUserStakes(address) view returns (tuple(uint256 amount, uint256 startTime, uint256 poolId, bool hasClaimedReward)[])",
            "function isAdmin(address) view returns (bool)"
        ]
    }
};

export default CONFIG;
