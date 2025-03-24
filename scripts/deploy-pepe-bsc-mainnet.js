const hre = require("hardhat");
const fs = require('fs');

// Add delay function
const delay = ms => new Promise(res => setTimeout(res, ms));

// Helper function to determine ethers version and provide right formatting functions
const getEthersHelpers = () => {
  // Check if we're using ethers v6+ or v5
  const isEthersV6 = !hre.ethers.utils && typeof hre.ethers.formatUnits === 'function';
  
  return {
    formatEther: isEthersV6 ? hre.ethers.formatEther : hre.ethers.utils.formatEther,
    formatUnits: isEthersV6 ? hre.ethers.formatUnits : hre.ethers.utils.formatUnits,
    parseUnits: isEthersV6 ? hre.ethers.parseUnits : hre.ethers.utils.parseUnits,
    parseEther: isEthersV6 ? hre.ethers.parseEther : hre.ethers.utils.parseEther,
    isV6: isEthersV6
  };
};

// Custom function to wait for transaction receipt
async function waitForTransaction(provider, txHash, confirmations = 1, timeout = 180000) {
  const startTime = Date.now();
  console.log(`Waiting for transaction ${txHash} to be mined...`);
  
  while (Date.now() - startTime < timeout) {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      if (receipt.confirmations >= confirmations || !receipt.confirmations) {
        return receipt;
      }
      console.log(`Transaction confirmed but waiting for ${confirmations} confirmations...`);
    }
    
    // Wait 2 seconds before checking again
    await delay(2000);
  }
  
  throw new Error(`Transaction not mined within ${timeout / 1000} seconds`);
}

async function main() {
    console.log("\n🚀 BSC MAINNET DEPLOYMENT - PEPE TOKEN");
    console.log("=====================================\n");
    
    // Get ethers helpers based on version
    const { formatEther, formatUnits, parseUnits, parseEther, isV6 } = getEthersHelpers();
    
    // Confirm BSC mainnet deployment
    if (process.env.CONFIRM_BSC_DEPLOY !== 'yes') {
        console.log("⚠️ BSC MAINNET DEPLOYMENT SAFETY CHECK");
        console.log("This script will deploy to BSC MAINNET with REAL BNB");
        console.log("Set CONFIRM_BSC_DEPLOY=yes in your .env file to proceed");
        console.log("Exiting deployment for safety.");
        return;
    }

    // Get gas price using network.provider.send
    console.log("Getting current gas price...");
    let gasPriceGwei = "5"; // Default to 5 Gwei
    try {
        // Try RPC call for gas price
        const gasPrice = await hre.network.provider.send("eth_gasPrice");
        const gasPriceBN = BigInt(gasPrice);
        gasPriceGwei = String(Number(gasPriceBN) / 1e9);
    } catch (error) {
        console.log("Could not get gas price, using default of 5 Gwei");
    }
    
    console.log("Current gas price:", gasPriceGwei, "Gwei");
    if (parseFloat(gasPriceGwei) > 10) { // BSC usually has lower gas prices
        console.log("\n⚠️ WARNING: Gas price is above 10 Gwei on BSC!");
        if (process.env.IGNORE_HIGH_GAS !== 'yes') {
            console.log("Set IGNORE_HIGH_GAS=yes in .env to deploy regardless of gas price");
            console.log("Exiting deployment for cost efficiency.");
            return;
        }
        console.log("Proceeding with high gas price due to IGNORE_HIGH_GAS setting.");
    }

    // Get deployer information
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("Deployer address:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", formatEther(balance), "BNB");
    
    // For low balance check, we need to handle different versions of BigNumber
    let isLowBalance = false;
    try {
        if (typeof balance === 'bigint') {
            // ethers v6
            isLowBalance = balance < parseEther("0.05");
        } else {
            // ethers v5 or earlier
            isLowBalance = balance.lt(parseEther("0.05"));
        }
    } catch (e) {
        console.log("Could not compare balance, assuming sufficient funds");
    }
    
    if (isLowBalance) {
        console.log("\n⚠️ WARNING: Deployer balance is low! You may need more BNB for deployment.");
        if (process.env.IGNORE_LOW_BALANCE !== 'yes') {
            console.log("Set IGNORE_LOW_BALANCE=yes in .env to deploy regardless of balance");
            console.log("Exiting deployment for safety.");
            return;
        }
    }

    // Deploy PEPEToken to BSC mainnet
    console.log("\n📄 Deploying PEPEToken contract to BSC Mainnet...");
    const PEPEToken = await hre.ethers.getContractFactory("PEPEToken");
    
    // Prepare gas price for deployment
    const gasPrice = process.env.CUSTOM_GAS_PRICE 
        ? parseUnits(process.env.CUSTOM_GAS_PRICE, "gwei")
        : parseUnits(gasPriceGwei, "gwei");
    
    // Deploy the contract
    console.log("Sending deploy transaction...");
    const deploymentOptions = {
        gasPrice: gasPrice
    };
    
    const token = await PEPEToken.deploy(deploymentOptions);
    console.log("Contract deployment initiated!");
    
    // Wait for the contract to be deployed - without using token.deployed()
    console.log("\nWaiting for deployment confirmation...");
    
    // Get deployment transaction
    const deployTx = token.deployTransaction || token.deploymentTransaction?.();
    
    if (deployTx && deployTx.hash) {
        console.log("Deployment transaction hash:", deployTx.hash);
        console.log("BSCScan URL:", `https://bscscan.com/tx/${deployTx.hash}`);
        
        // Wait for the transaction to be mined using our custom function
        try {
            const receipt = await waitForTransaction(hre.ethers.provider, deployTx.hash, 1);
            console.log("Transaction mined with status:", receipt.status ? "success" : "failed");
        } catch (e) {
            console.log("Error waiting for transaction:", e.message);
            console.log("Continuing anyway as transaction was sent...");
        }
    } else {
        console.log("No deployment transaction hash available");
    }
    
    // Get token address
    const tokenAddress = token.address;
    if (!tokenAddress) {
        console.error("Could not get token address, deployment may have failed");
        process.exit(1);
    }
    
    console.log("\n✅ PEPEToken deployed to BSC at address:", tokenAddress);
    console.log("BSCScan URL:", `https://bscscan.com/address/${tokenAddress}`);

    // Update deployed-bsc-mainnet-addresses.json
    console.log("\nUpdating configuration files...");
    const deployedAddresses = {
        pepeToken: tokenAddress,
        network: "bsc_mainnet",
        deployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
        'deployed-bsc-mainnet-addresses.json',
        JSON.stringify(deployedAddresses, null, 2)
    );
    console.log("✅ deployed-bsc-mainnet-addresses.json created");

    // Wait before verification
    console.log("\nWaiting 30 seconds before verification...");
    await delay(30000);

    // Verify contract
    console.log("\n🔍 Verifying contract on BSCScan...");
    try {
        await hre.run("verify:verify", {
            address: tokenAddress,
            constructorArguments: [],
            contract: "contracts/PEPEToken.sol:PEPEToken",
        });
        console.log("✅ Contract successfully verified on BSCScan!");
    } catch (error) {
        console.error("❌ Error during verification:", error);
        console.log("\nYou can try manual verification later with:");
        console.log(`npx hardhat verify --network bsc_mainnet ${tokenAddress}`);
    }

    console.log("\n🎉 BSC MAINNET DEPLOYMENT COMPLETED!");
    console.log("Token address:", tokenAddress);
    console.log("\nImportant next steps:");
    console.log("1. Add token to PancakeSwap");
    console.log("2. Set up liquidity pools");
    console.log("3. Make necessary token announcements");
    
    // Get max supply - use generic approach instead of relying on specific function names
    console.log("\nAttempting to read max supply...");
    try {
        // Create a new contract instance to read from the deployed contract
        const contract = new hre.ethers.Contract(
            tokenAddress,
            PEPEToken.interface,
            deployer
        );
        
        // Attempt to read maxSupply using various possible function names
        let maxSupply;
        try {
            // Try common function names in priority order
            if (contract.interface.getFunction('maxSupply')) {
                maxSupply = await contract.maxSupply();
            } else if (contract.interface.getFunction('getMaxSupply')) {
                maxSupply = await contract.getMaxSupply();
            } else if (contract.interface.getFunction('totalSupply')) {
                maxSupply = await contract.totalSupply();
            }
        } catch (e) {
            console.log("Could not call max supply function:", e.message);
        }
        
        if (maxSupply) {
            console.log("MAXIMUM SUPPLY:", formatUnits(maxSupply));
        } else {
            console.log("Could not determine max supply");
        }
    } catch (e) {
        console.log("Error reading max supply:", e.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ ERROR:", error);
        process.exit(1);
    });