require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    bsc_testnet: {
      url: process.env.BSC_TESTNET_URL || "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: process.env.BSC_TESTNET_PRIVATE_KEY ? [process.env.BSC_TESTNET_PRIVATE_KEY] : [],
      gasPrice: 10000000000 // 10 gwei
    },
    bsc_mainnet: {
      url: process.env.BSC_MAINNET_URL || "https://bsc-dataseed1.binance.org/",
      chainId: 56,
      accounts: process.env.BSC_MAINNET_PRIVATE_KEY ? [process.env.BSC_MAINNET_PRIVATE_KEY] : [],
      gasPrice: "auto",
      gasMultiplier: 1.1,  // Add 10% to estimated gas for safety
      timeout: 60000       // Increase timeout to 60 seconds
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,  // For BSC mainnet
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};