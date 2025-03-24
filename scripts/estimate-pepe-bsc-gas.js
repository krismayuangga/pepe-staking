const hre = require("hardhat");

// Function to try different RPC URLs
const BSC_FALLBACK_RPCS = [
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed4.binance.org/",
  "https://rpc.ankr.com/bsc",
  "https://bsc.publicnode.com"
];

async function tryWithFallbackRPCs(operation) {
  let lastError;
  
  // First try with configured RPC
  try {
    return await operation();
  } catch (error) {
    console.log("⚠️ Primary RPC connection failed, trying fallbacks...");
    lastError = error;
  }
  
  // Then try fallback RPCs
  for (const rpcUrl of BSC_FALLBACK_RPCS) {
    try {
      // Create temporary provider
      const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
      provider.pollingTimeout = 30000; // 30 second timeout
      
      // Set as hardhat's provider temporarily
      const originalProvider = hre.ethers.provider;
      hre.ethers.provider = provider;
      
      // Try operation
      console.log(`Trying fallback RPC: ${rpcUrl}`);
      const result = await operation();
      
      // If successful, keep using this provider
      console.log(`✅ Successfully connected to ${rpcUrl}`);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`❌ Failed to use ${rpcUrl}: ${error.message}`);
    }
  }
  
  // If all RPCs fail, throw the last error
  throw lastError;
}

async function main() {
  console.log("Estimating gas for PEPEToken deployment on BSC mainnet...");
  
  try {
    // Get current gas price with ethers v6 compatible method
    console.log("Getting gas price...");
    const provider = hre.ethers.provider;
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`Current BSC gas price: ${hre.ethers.formatUnits(gasPrice, "gwei")} Gwei`);

    // Create the contract factory
    console.log("Creating contract factory...");
    const PEPEToken = await hre.ethers.getContractFactory("PEPEToken");
    
    // Create deployment transaction data (but don't send it)
    console.log("Preparing deployment transaction...");
    const deployTx = PEPEToken.getDeployTransaction();
    
    // Estimate gas for the deployment transaction
    console.log("Estimating deployment gas usage...");
    const deploymentGas = await provider.estimateGas({
      data: deployTx.data
    });
    
    console.log(`Estimated gas for deployment: ${deploymentGas.toString()}`);
    
    // Calculate cost in BNB
    const deploymentCost = deploymentGas * gasPrice;
    console.log(`Estimated deployment cost: ${hre.ethers.formatEther(deploymentCost)} BNB`);
    
    // Calculate with safety buffer
    const bufferCost = deploymentCost * BigInt(12) / BigInt(10); // 20% buffer
    console.log(`Recommended wallet balance (with 20% buffer): ${hre.ethers.formatEther(bufferCost)} BNB`);
    
  } catch (error) {
    console.error("\n💥 Error estimating deployment gas:");
    console.error(error.message || error);
    console.log("\n🔍 Troubleshooting tips:");
    console.log("1. Pastikan kontrak PEPEToken.sol sudah dikompilasi dengan 'npx hardhat compile'");
    console.log("2. Periksa koneksi internet Anda");
    console.log("3. Coba gunakan RPC BSC yang berbeda di file .env");
    console.log("4. Periksa bahwa Anda memiliki konfigurasi BSC Mainnet yang benar di hardhat.config.js");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script execution failed:", error);
    process.exit(1);    process.exit(1);
  });