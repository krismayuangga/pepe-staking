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

    const stakingAddress = deployedAddresses.pepeStaking;
    const stakingContract = await hre.ethers.getContractAt("BSCPEPEStaking", stakingAddress);

    console.log("Setting up BSCPEPEStaking contract on BSC Mainnet...");
    console.log("Contract address:", stakingAddress);

    try {
        // 1. Set admin address(es)
        const adminAddresses = [
            "0x8C41774Ac950B287D6dcFD51ABA48e46f0815eE1", // Admin 1
            // Tambahkan admin lain jika diperlukan
        ];
        
        console.log("\nSetting admin addresses...");
        for (const admin of adminAddresses) {
            console.log(`Setting ${admin} as admin...`);
            const adminTx = await stakingContract.setAdmin(admin, true);
            await adminTx.wait();
            console.log(`✓ Admin ${admin} set`);
        }

        // 2. Set initial lock period 
        // Untuk testing awal di mainnet, gunakan periode pendek
        // Setelah testing berhasil, ubah ke 30 hari untuk produksi
        console.log("\nSetting initial lock period...");
        
        // Untuk testing awal (5 menit)
        const TESTING_PERIOD = 5 * 60; // 5 minutes in seconds
        
        // Untuk produksi (30 hari)
        // const PRODUCTION_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds

        const lockTx = await stakingContract.setLockPeriod(TESTING_PERIOD);
        await lockTx.wait();
        console.log("✓ Lock period set to 5 minutes for initial testing");
        console.log("  Remember to change this to 30 days for production!");

        // 3. Cek pengaturan saat ini
        const currentLockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
        console.log("\nCurrent settings:");
        console.log("- Lock period:", Number(currentLockPeriod), "seconds");
        
        for (const admin of adminAddresses) {
            const isAdmin = await stakingContract.isAdmin(admin);
            console.log(`- Admin status for ${admin}: ${isAdmin}`);
        }
        
        // 4. Apply lock period to all pools at once (optional)
        console.log("\nApplying lock period to all pools...");
        const applyTx = await stakingContract.applyLockPeriodToAllPools(TESTING_PERIOD);
        await applyTx.wait();
        console.log("✓ Lock period applied to all pools");

        console.log("\nSetup completed successfully!");
    } catch (error) {
        console.error("\nError during setup:", error);
        console.log("Transaction details:", error.transaction || "No transaction details");
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });