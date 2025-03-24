// File: c:\Users\HP\pepe-staking\scripts\deploy-mainnet-safe.js
require("dotenv").config();
const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("\n🚀 PREPARING FOR BSC MAINNET DEPLOYMENT");
    console.log("======================================\n");
    
    // Safety check to prevent accidental mainnet deployments
    if (process.env.CONFIRM_MAINNET !== 'yes') {
        console.log("⚠️ MAINNET DEPLOYMENT SAFETY CHECK");
        console.log("This script deploys to BSC MAINNET which will use REAL funds.");
        console.log("To continue, please set CONFIRM_MAINNET=yes in your .env file.");
        process.exit(1);
    }
    
    // Gas price check
    const gasPrice = await hre.ethers.provider.getGasPrice();
    const gasPriceGwei = hre.ethers.utils.formatUnits(gasPrice, "gwei");
    console.log(`Current gas price: ${gasPriceGwei} GWEI`);
    
    if (parseFloat(gasPriceGwei) > 10) {
        console.log("⚠️ WARNING: Gas price is high. Consider waiting for lower gas prices.");
        
        // Ask for confirmation
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
            readline.question('Do you want to continue despite high gas prices? (yes/no): ', resolve);
        });
        readline.close();
        
        if (answer.toLowerCase() !== 'yes') {
            console.log("Deployment aborted by user due to high gas prices.");
            process.exit(0);
        }
    }
    
    // Load contract addresses
    let mainnetAddresses = {};
    try {
        mainnetAddresses = require('../mainnet-addresses.json');
        console.log("Loaded existing mainnet addresses");
    } catch (error) {
        console.log("No existing mainnet-addresses.json file found. Will create a new one.");
    }
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await deployer.getBalance();
    console.log(`Deployer balance: ${hre.ethers.utils.formatEther(balance)} BNB`);
    
    if (parseFloat(hre.ethers.utils.formatEther(balance)) < 0.5) {
        console.log("⚠️ WARNING: Deployer balance is low. Make sure you have enough BNB for deployment.");
    }
    
    // PEPE token address on BSC Mainnet - replace with actual token address
    const PEPE_TOKEN_ADDRESS = process.env.MAINNET_PEPE_ADDRESS;
    if (!PEPE_TOKEN_ADDRESS) {
        console.error("MAINNET_PEPE_ADDRESS not set in .env file");
        process.exit(1);
    }
    console.log(`PEPE Token address: ${PEPE_TOKEN_ADDRESS}`);
    
    // USDT token address on BSC Mainnet
    const USDT_TOKEN_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
    console.log(`USDT Token address: ${USDT_TOKEN_ADDRESS}`);
    
    // Deploy staking contract
    console.log("\n📄 Deploying BSCPEPEStaking contract to BSC Mainnet...");
    const BSCPEPEStaking = await hre.ethers.getContractFactory("BSCPEPEStaking");
    
    console.log("Estimating deployment gas...");
    const deployTx = await BSCPEPEStaking.getDeployTransaction(PEPE_TOKEN_ADDRESS);
    const estimatedGas = await hre.ethers.provider.estimateGas(deployTx);
    console.log(`Estimated gas for deployment: ${estimatedGas.toString()}`);
    
    // Deploy with confirmation
    const staking = await BSCPEPEStaking.deploy(PEPE_TOKEN_ADDRESS);
    console.log(`Transaction hash: ${staking.deployTransaction.hash}`);
    console.log("Waiting for deployment confirmation...");
    
    // Wait for more confirmations on mainnet
    await staking.deployed();
    const stakingAddress = staking.address;
    console.log(`✅ BSCPEPEStaking deployed to: ${stakingAddress}`);
    
    // Set USDT as reward token
    console.log("\n⚙️ Setting up USDT as reward token...");
    const setRewardTx = await staking.setRewardToken(USDT_TOKEN_ADDRESS);
    await setRewardTx.wait(3); // Wait for 3 confirmations
    console.log("✅ USDT set as reward token");
    
    // Set admin wallets
    const adminWallets = process.env.ADMIN_WALLETS ? process.env.ADMIN_WALLETS.split(",") : [];
    if (adminWallets.length > 0) {
        console.log("\n👤 Setting admin wallets:");
        for (const admin of adminWallets) {
            console.log(`  - ${admin}`);
            const adminTx = await staking.setAdmin(admin, true);
            await adminTx.wait(2);
        }
        console.log("✅ Admin wallets configured");
    }
    
    // Set initial lock periods
    const defaultLockPeriod = 30 * 24 * 60 * 60; // 30 days in seconds
    console.log("\n⏱️ Setting lock period to 30 days");
    const lockTx = await staking.setLockPeriod(defaultLockPeriod);
    await lockTx.wait(2);
    console.log("✅ Lock period set");
    
    // Apply to all pools
    console.log("Applying lock period to all pools...");
    const applyTx = await staking.applyLockPeriodToAllPools(defaultLockPeriod);
    await applyTx.wait(2);
    console.log("✅ Lock period applied to all pools");
    
    // Update files
    mainnetAddresses = {
        pepeToken: PEPE_TOKEN_ADDRESS,
        usdtToken: USDT_TOKEN_ADDRESS,
        staking: stakingAddress,
        network: "bsc_mainnet",
        deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
        'mainnet-addresses.json',
        JSON.stringify(mainnetAddresses, null, 2)
    );
    console.log("\n✅ Addresses saved to mainnet-addresses.json");
    
    // Update mainnet-config.js
    const configPath = 'frontend/mainnet-config.js';
    let configContent = fs.readFileSync(configPath, 'utf8');
    configContent = configContent.replace(/address: '.*?',.*?\/\/ Diisi setelah kontrak di-deploy ke mainnet/g, `address: '${PEPE_TOKEN_ADDRESS}', // PEPE Token on BSC Mainnet`);
    configContent = configContent.replace(/pepeStaking: {[\s\S]+?address: '.*?',/g, `pepeStaking: {\n        address: '${stakingAddress}',`);
    
    fs.writeFileSync(configPath, configContent);
    console.log("\n✅ Updated contract addresses in mainnet-config.js");
    
    // Verify contract
    console.log("\n🔍 Verifying contract on BSCScan...");
    try {
        await hre.run("verify:verify", {
            address: stakingAddress,
            constructorArguments: [PEPE_TOKEN_ADDRESS],
            contract: "contracts/BSCPEPEStaking.sol:BSCPEPEStaking"
        });
        console.log("✅ Contract verified successfully");
    } catch (error) {
        console.log("⚠️ Error verifying contract:", error.message);
        console.log("You can try manual verification later.");
    }
    
    console.log("\n🎉 MAINNET DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("\nImportant next steps:");
    console.log("1. Fund the contract with USDT rewards");
    console.log("2. Update website configuration");
    console.log("3. Test all functionality on mainnet with small amounts first");
    console.log("4. Monitor the contract after launch");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });