const hre = require("hardhat");

async function waitForConfirmations(tx, confirmations = 5) {
    console.log(`Waiting for ${confirmations} confirmations...`);
    await tx.wait(confirmations);
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log("Deploying BSCPEPEStaking contract to BSC Testnet...");

    // Menggunakan alamat token yang sudah ada
    const PEPE_TOKEN_ADDRESS = "0x578a700c214AF091d377f942c15A2413306006bc";
    const USDT_ADDRESS = "0xafFED4B10C3Dc1822bD992F56Dae9F6aBb8E0244";

    // Deploy Staking Contract
    const BSCPEPEStaking = await hre.ethers.getContractFactory("BSCPEPEStaking");
    const staking = await BSCPEPEStaking.deploy(PEPE_TOKEN_ADDRESS);
    const deployTx = await staking.deploymentTransaction();
    console.log("Deployment transaction hash:", deployTx.hash);
    
    // Wait for 5 confirmations
    await waitForConfirmations(deployTx, 5);
    
    const stakingAddress = await staking.getAddress();
    console.log("BSCPEPEStaking deployed to:", stakingAddress);

    // Set USDT sebagai reward token
    await staking.setRewardToken(USDT_ADDRESS);
    console.log("Set USDT as reward token");

    // Update alamat di config dan deployed-addresses
    const fs = require('fs');
    
    // Update deployed-addresses.json
    const deployedAddresses = {
        pepeToken: PEPE_TOKEN_ADDRESS,
        dummyUSDT: USDT_ADDRESS,
        staking: stakingAddress,
        network: "bsc_testnet"
    };

    fs.writeFileSync(
        'deployed-addresses.json',
        JSON.stringify(deployedAddresses, null, 2)
    );
    console.log("Deployment addresses saved to deployed-addresses.json");

    // Update admin-config.js
    let adminConfig = fs.readFileSync('frontend/admin-config.js', 'utf8');
    adminConfig = adminConfig.replace(
        /address: '0x[a-fA-F0-9]{40}', \/\/ Update dengan alamat kontrak baru/,
        `address: '${stakingAddress}', // Update dengan alamat kontrak baru`
    );
    fs.writeFileSync('frontend/admin-config.js', adminConfig);
    console.log("Updated contract address in admin-config.js");

    // Wait additional 30 seconds before verification
    console.log("Waiting 30 seconds before verification...");
    await delay(30000);

    // Verify contract
    console.log("\nVerifying contract on BSCScan...");
    try {
        await hre.run("verify:verify", {
            address: stakingAddress,
            constructorArguments: [PEPE_TOKEN_ADDRESS],
            contract: "contracts/BSCPEPEStaking.sol:BSCPEPEStaking"
        });
        console.log("Contract verified successfully");
    } catch (error) {
        console.log("Error verifying contract:", error.message);
        console.log("\nYou can try manual verification later using:");
        console.log(`npx hardhat verify --network bsc_testnet ${stakingAddress} "${PEPE_TOKEN_ADDRESS}"`);
    }

    console.log("\nDeployment completed!");
    console.log("\nNext steps:");
    console.log("1. Set admin addresses using setAdmin()");
    console.log("2. Fund the contract with USDT rewards");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });