const hre = require("hardhat");
const fs = require('fs');

// Reuse the same helper functions as in your testnet script
async function waitForConfirmations(tx, confirmations = 5) {
    console.log(`Waiting for ${confirmations} confirmations...`);
    await tx.wait(confirmations);
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("\n🚀 BSC MAINNET DEPLOYMENT - PEPE STAKING CONTRACT");
    console.log("=================================================\n");
    
    // Confirm BSC mainnet deployment - safety check
    if (process.env.CONFIRM_BSC_DEPLOY !== 'yes') {
        console.log("⚠️ BSC MAINNET DEPLOYMENT SAFETY CHECK");
        console.log("This script will deploy to BSC MAINNET with REAL BNB");
        console.log("Set CONFIRM_BSC_DEPLOY=yes in your .env file to proceed");
        console.log("Exiting deployment for safety.");
        return;
    }

    // Use the already deployed PEPE token address on BSC mainnet
    const PEPE_TOKEN_ADDRESS = "0x0c5779d8b1a606b0de41c14bee64f3bb1169c71b";
    
    // BSC mainnet USDT token address (BUSD-T)
    const USDT_ADDRESS = process.env.USDT_TOKEN_ADDRESS || "0x55d398326f99059fF775485246999027B3197955";

    console.log("Using PEPE Token address:", PEPE_TOKEN_ADDRESS);
    console.log("Using USDT Token address:", USDT_ADDRESS);

    // Get deployer information
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "BNB");
    
    // Deploy BSCPEPEStaking to BSC mainnet - follow same pattern as testnet script
    console.log("\n📄 Deploying BSCPEPEStaking contract to BSC Mainnet...");
    const BSCPEPEStaking = await hre.ethers.getContractFactory("BSCPEPEStaking");
    
    // Deploy with same parameters as testnet
    const staking = await BSCPEPEStaking.deploy(PEPE_TOKEN_ADDRESS);
    const deployTx = await staking.deploymentTransaction();
    console.log("Deployment transaction hash:", deployTx.hash);
    console.log("BSCScan URL:", `https://bscscan.com/tx/${deployTx.hash}`);
    
    // Wait for 5 confirmations
    console.log("\nWaiting for deployment confirmation...");
    await waitForConfirmations(deployTx, 5);
    
    const stakingAddress = await staking.getAddress();
    console.log("\n✅ BSCPEPEStaking deployed to:", stakingAddress);
    console.log("BSCScan URL:", `https://bscscan.com/address/${stakingAddress}`);
    
    // Set USDT as reward token
    console.log("\n⚙️ Setting up USDT as reward token...");
    const setRewardTx = await staking.setRewardToken(USDT_ADDRESS);
    await waitForConfirmations(setRewardTx, 2);
    console.log("✅ USDT set as reward token");
    
    // Update configuration files
    console.log("\nUpdating configuration files...");
    
    // Create deployed-bsc-mainnet-addresses.json
    const deployedAddresses = {
        pepeToken: PEPE_TOKEN_ADDRESS,
        usdtToken: USDT_ADDRESS,  // Note: using usdtToken instead of dummyUSDT for mainnet
        pepeStaking: stakingAddress,
        network: "bsc_mainnet",
        deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
        'deployed-bsc-mainnet-addresses.json',
        JSON.stringify(deployedAddresses, null, 2)
    );
    console.log("✅ deployed-bsc-mainnet-addresses.json created");

    // Update admin-config.js for mainnet
    try {
        let adminConfig = fs.readFileSync('frontend/admin-config.js', 'utf8');
        adminConfig = adminConfig.replace(
            /address: '0x[a-fA-F0-9]{40}', \/\/ Update dengan alamat kontrak baru/,
            `address: '${stakingAddress}', // Update dengan alamat kontrak baru`
        );
        fs.writeFileSync('frontend/admin-config-mainnet.js', adminConfig);
        console.log("✅ Created frontend/admin-config-mainnet.js");
    } catch (error) {
        console.log("Could not update admin config:", error.message);
    }

    // Create mainnet-config.js for frontend
    console.log("\nCreating frontend mainnet configuration...");
    
    const mainnetConfig = `// BSC Mainnet Configuration
const MAINNET_CONFIG = {
    pepeToken: {
        address: '${PEPE_TOKEN_ADDRESS}',
        abi: [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ]
    },
    usdt: {  // Changed from dummyUSDT for mainnet
        address: '${USDT_ADDRESS}',
        abi: [
            "function balanceOf(address) view returns (uint256)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ]
    },
    pepeStaking: {
        address: '${stakingAddress}',
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
            { name: "Pool 6", minPepe: "100,000,000", reward: "3,000" }
        ],
        gasLimit: {
            stake: 120000,
            unstake: 100000,
            unstakeEarly: 80000
        }
    },
    NETWORK: {
        chainId: '0x38',
        chainName: 'BSC Mainnet',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        rpcUrls: ['https://bsc.publicnode.com'],
        blockExplorerUrls: ['https://bscscan.com']
    }
};

// Export for use in other files
window.MAINNET_CONFIG = MAINNET_CONFIG;`;

    fs.writeFileSync('frontend/mainnet-config.js', mainnetConfig);
    console.log("✅ frontend/mainnet-config.js created");

    // Wait before verification
    console.log("\nWaiting 30 seconds before verification...");
    await delay(30000);

    // Verify contract
    console.log("\n🔍 Verifying contract on BSCScan...");
    try {
        await hre.run("verify:verify", {
            address: stakingAddress,
            constructorArguments: [PEPE_TOKEN_ADDRESS],
            contract: "contracts/BSCPEPEStaking.sol:BSCPEPEStaking",
        });
        console.log("✅ Contract successfully verified on BSCScan!");
    } catch (error) {
        console.log("Error verifying contract:", error.message);
        console.log("\nYou can try manual verification later using:");
        console.log(`npx hardhat verify --network bsc_mainnet ${stakingAddress} "${PEPE_TOKEN_ADDRESS}"`);
    }

    console.log("\n🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("BSCPEPEStaking address:", stakingAddress);
    console.log("PEPE Token address:", PEPE_TOKEN_ADDRESS);
    console.log("USDT Token address:", USDT_ADDRESS);
    
    console.log("\n⚠️ IMPORTANT NEXT STEPS:");
    console.log("1. Set admin addresses using setAdmin()");
    console.log("2. Fund the contract with USDT rewards");
    console.log("3. Configure lock periods as needed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ ERROR:", error);
        process.exit(1);
    });