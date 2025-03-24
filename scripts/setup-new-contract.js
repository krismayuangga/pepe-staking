const hre = require("hardhat");

async function main() {
    const stakingAddress = "0x808874626317e75Df7f495a3f3e7617B6c26073B"; // Updated address
    const stakingContract = await hre.ethers.getContractAt("BSCPEPEStaking", stakingAddress);

    console.log("Setting up new staking contract...");

    try {
        // 1. Set admin address
        console.log("\nSetting admin...");
        const adminTx = await stakingContract.setAdmin("0x8C41774Ac950B287D6dcFD51ABA48e46f0815eE1", true);
        await adminTx.wait();
        console.log("✓ Admin set");

        // 2. Set lock period to 5 minutes for testing
        console.log("\nSetting lock period...");
        const FIVE_MINUTES = 5 * 60; // 5 minutes in seconds
        const lockTx = await stakingContract.setLockPeriod(FIVE_MINUTES);
        await lockTx.wait();
        console.log("✓ Lock period set to 5 minutes");

        // 3. Verify settings
        const currentLockPeriod = await stakingContract.LOCK_PERIOD();
        console.log("\nCurrent settings:");
        console.log("- Lock period:", Number(currentLockPeriod), "seconds");
        
        const isAdmin = await stakingContract.isAdmin("0x8C41774Ac950B287D6dcFD51ABA48e46f0815eE1");
        console.log("- Admin status:", isAdmin);

        console.log("\nSetup completed successfully!");
    } catch (error) {
        console.error("\nError during setup:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
