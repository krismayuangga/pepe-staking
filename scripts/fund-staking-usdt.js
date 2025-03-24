require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");

async function main() {
    // Baca alamat dari file konfigurasi
    let deployedAddresses;
    try {
        const addressFile = fs.readFileSync('deployed-bsc-mainnet-addresses.json', 'utf8');
        deployedAddresses = JSON.parse(addressFile);
    } catch (error) {
        console.error("Error reading deployed addresses:", error);
        process.exit(1);
    }

    // Get contract instances using hardhat-ethers
    const [signer] = await hre.ethers.getSigners();
    console.log("Using signer:", signer.address);
    
    const USDT_ADDRESS = deployedAddresses.usdtToken;
    const STAKING_ADDRESS = deployedAddresses.pepeStaking;
    
    console.log("USDT address:", USDT_ADDRESS);
    console.log("Staking contract address:", STAKING_ADDRESS);

    // Get USDT contract using standard ERC20 interface
    const usdtContract = await hre.ethers.getContractAt("IERC20", USDT_ADDRESS);
    
    // Get staking contract
    const stakingContract = await hre.ethers.getContractAt("BSCPEPEStaking", STAKING_ADDRESS);

    // Get decimals for USDT
    const decimals = await usdtContract.decimals();
    console.log("USDT decimals:", decimals);

    // Amount to send (specify in your .env or hardcode here)
    const fundAmountStr = process.env.FUND_AMOUNT || "10000"; // Default: 10,000 USDT
    const amount = hre.ethers.parseUnits(fundAmountStr, decimals);

    console.log(`\nFunding staking contract with ${fundAmountStr} USDT...`);

    console.log("Getting current USDT balance...");
    const balanceBefore = await usdtContract.balanceOf(STAKING_ADDRESS);
    console.log(`Current contract USDT balance: ${hre.ethers.formatUnits(balanceBefore, decimals)} USDT`);
    
    const signerBalance = await usdtContract.balanceOf(signer.address);
    console.log(`Your USDT balance: ${hre.ethers.formatUnits(signerBalance, decimals)} USDT`);

    if (signerBalance.lt(amount)) {
        console.error("❌ ERROR: Insufficient USDT balance!");
        console.log(`Required: ${fundAmountStr} USDT`);
        console.log(`Available: ${hre.ethers.formatUnits(signerBalance, decimals)} USDT`);
        process.exit(1);
    }

    console.log("\nApproving USDT transfer...");
    const approveTx = await usdtContract.approve(STAKING_ADDRESS, amount);
    await approveTx.wait();
    console.log("Approval confirmed:", approveTx.hash);
    console.log("BSCScan URL:", `https://bscscan.com/tx/${approveTx.hash}`);

    console.log("\nAdding USDT to staking contract...");
    const addTx = await stakingContract.addUSDT(amount);
    await addTx.wait();
    console.log("Transfer confirmed:", addTx.hash);
    console.log("BSCScan URL:", `https://bscscan.com/tx/${addTx.hash}`);

    const balanceAfter = await usdtContract.balanceOf(STAKING_ADDRESS);
    console.log(`\nNew contract USDT balance: ${hre.ethers.formatUnits(balanceAfter, decimals)} USDT`);
    console.log(`Added: ${hre.ethers.formatUnits(balanceAfter.sub(balanceBefore), decimals)} USDT`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });