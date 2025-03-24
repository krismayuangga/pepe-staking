// Contract addresses from deployment
const contractAddresses = {
    pepeToken: "0x578a700c214AF091d377f942c15A2413306006bc", // Updated address
    dummyUSDT: "0xafFED4B10C3Dc1822bD992F56Dae9F6aBb8E0244", // Updated address
    pepeStaking: "0x808874626317e75Df7f495a3f3e7617B6c26073B" // New staking contract address
};

// Contract ABIs
const pepeTokenABI = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function decimals() view returns (uint8)"
];

const stakingABI = [
    "function stake(uint256 amount)",
    "function unstake()",
    "function claimRewards()",
    "function calculateReward(address) view returns (uint256)",
    "function stakes(address) view returns (uint256 amount, uint256 startTime)"
];

let provider, signer, pepeToken, usdtToken, stakingContract;
let userAddress = null;

// UI Elements
const connectWalletBtn = document.getElementById('connectWallet');
const stakeAmountInput = document.getElementById('stakeAmount');
const stakeButton = document.getElementById('stakeButton');
const unstakeButton = document.getElementById('unstakeButton');
const claimButton = document.getElementById('claimButton');
const pepeBalanceEl = document.getElementById('pepeBalance');
const stakedBalanceEl = document.getElementById('stakedBalance');
const usdtBalanceEl = document.getElementById('usdtBalance');
const rewardAmountEl = document.getElementById('rewardAmount');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

// Helper Functions
function showNotification(message, isError = false) {
    notification.className = `fixed bottom-4 right-4 ${isError ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg`;
    notificationText.textContent = message;
    notification.classList.remove('hidden');
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

function formatAmount(amount, decimals = 18) {
    return ethers.utils.formatUnits(amount, decimals);
}

// Connect Wallet
async function connectWallet() {
    try {
        if (typeof window.ethereum === 'undefined') {
            const metamaskModal = document.getElementById('metamaskModal');
            metamaskModal.classList.remove('hidden');
            metamaskModal.querySelector('.bg-white').classList.add('scale-100', 'opacity-100');
            metamaskModal.querySelector('.bg-white').classList.remove('scale-95', 'opacity-0');
            
            connectWalletBtn.innerHTML = `<i class="fas fa-download mr-2"></i>Install MetaMask`;
            connectWalletBtn.classList.remove('bg-white', 'text-green-600', 'hover:bg-green-50');
            connectWalletBtn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            
            // Update button to show modal
            connectWalletBtn.onclick = () => {
                metamaskModal.classList.remove('hidden');
                setTimeout(() => {
                    metamaskModal.querySelector('.bg-white').classList.add('scale-100', 'opacity-100');
                    metamaskModal.querySelector('.bg-white').classList.remove('scale-95', 'opacity-0');
                }, 10);
            };

            // Close modal with animation
            document.querySelectorAll('[onclick*="metamaskModal"]').forEach(el => {
                el.onclick = () => {
                    const modal = document.getElementById('metamaskModal');
                    modal.querySelector('.bg-white').classList.remove('scale-100', 'opacity-100');
                    modal.querySelector('.bg-white').classList.add('scale-95', 'opacity-0');
                    setTimeout(() => {
                        modal.classList.add('hidden');
                    }, 200);
                };
            });
            return;
        }

        // Check if we're on the correct network (BSC Testnet)
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0x61') { // BSC Testnet chainId
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x61' }],
                });
            } catch (switchError) {
                showNotification('Please switch to the BSC Testnet network in MetaMask', true);
                return;
            }
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();

        // Initialize contracts
        pepeToken = new ethers.Contract(contractAddresses.pepeToken, pepeTokenABI, signer);
        usdtToken = new ethers.Contract(contractAddresses.dummyUSDT, pepeTokenABI, signer);
        stakingContract = new ethers.Contract(contractAddresses.pepeStaking, stakingABI, signer);

        connectWalletBtn.innerHTML = `<i class="fas fa-wallet mr-2"></i>${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        connectWalletBtn.classList.remove('bg-white', 'text-green-600', 'hover:bg-green-50');
        connectWalletBtn.classList.add('bg-green-100', 'text-green-800', 'cursor-default');
        
        // Enable buttons
        stakeButton.disabled = false;
        unstakeButton.disabled = false;
        claimButton.disabled = false;

        // Update balances
        await updateBalances();
        // Set up interval to update rewards
        setInterval(updateRewards, 10000);

        // Listen for account changes
        window.ethereum.on('accountsChanged', function (accounts) {
            if (accounts.length === 0) {
                // User disconnected wallet
                resetUI();
            } else {
                // User switched account
                userAddress = accounts[0];
                connectWalletBtn.innerHTML = `<i class="fas fa-wallet mr-2"></i>${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
                updateBalances();
            }
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', function (networkId) {
            window.location.reload();
        });

        showNotification('Wallet connected successfully!');
    } catch (error) {
        console.error('Connection error:', error);
        showNotification(error.message || 'Failed to connect wallet', true);
    }
}

// Reset UI state when wallet is disconnected
function resetUI() {
    userAddress = null;
    connectWalletBtn.innerHTML = `<i class="fas fa-wallet mr-2"></i>Connect Wallet`;
    connectWalletBtn.classList.remove('bg-green-100', 'text-green-800', 'cursor-default');
    connectWalletBtn.classList.add('bg-white', 'text-green-600', 'hover:bg-green-50');
    
    // Disable buttons
    stakeButton.disabled = true;
    unstakeButton.disabled = true;
    claimButton.disabled = true;

    // Reset balances
    pepeBalanceEl.textContent = '0 PEPE';
    stakedBalanceEl.textContent = '0 PEPE';
    usdtBalanceEl.textContent = '0 USDT';
    rewardAmountEl.textContent = '0 USDT';
}

// Update Balances
async function updateBalances() {
    try {
        if (!userAddress) return;

        const pepeBalance = await pepeToken.balanceOf(userAddress);
        const stake = await stakingContract.stakes(userAddress);
        const usdtBalance = await usdtToken.balanceOf(userAddress);

        pepeBalanceEl.textContent = `${Number(formatAmount(pepeBalance)).toLocaleString()} PEPE`;
        stakedBalanceEl.textContent = `${Number(formatAmount(stake.amount)).toLocaleString()} PEPE`;
        usdtBalanceEl.textContent = `${Number(formatAmount(usdtBalance)).toLocaleString()} USDT`;

    } catch (error) {
        showNotification('Error updating balances', true);
    }
}

// Update Rewards
async function updateRewards() {
    try {
        if (!userAddress) return;

        const reward = await stakingContract.calculateReward(userAddress);
        rewardAmountEl.textContent = `${Number(formatAmount(reward)).toLocaleString()} USDT`;

    } catch (error) {
        console.error('Error updating rewards:', error);
    }
}

// Stake Tokens
async function stakeTokens() {
    try {
        const amount = ethers.utils.parseEther(stakeAmountInput.value);
        
        // First approve the staking contract
        const approveTx = await pepeToken.approve(contractAddresses.pepeStaking, amount);
        await approveTx.wait();
        
        // Then stake
        const stakeTx = await stakingContract.stake(amount);
        await stakeTx.wait();
        
        showNotification('Tokens staked successfully!');
        stakeAmountInput.value = '';
        updateBalances();
    } catch (error) {
        showNotification(error.message, true);
    }
}

// Unstake Tokens
async function unstakeTokens() {
    try {
        const tx = await stakingContract.unstake();
        await tx.wait();
        
        showNotification('Tokens unstaked successfully!');
        updateBalances();
    } catch (error) {
        showNotification(error.message, true);
    }
}

// Claim Rewards
async function claimRewards() {
    try {
        const tx = await stakingContract.claimRewards();
        await tx.wait();
        
        showNotification('Rewards claimed successfully!');
        updateBalances();
    } catch (error) {
        showNotification(error.message, true);
    }
}

// Event Listeners
connectWalletBtn.addEventListener('click', connectWallet);
stakeButton.addEventListener('click', stakeTokens);
unstakeButton.addEventListener('click', unstakeTokens);
claimButton.addEventListener('click', claimRewards);

// Initialize
window.addEventListener('load', () => {
    // If MetaMask is already connected, initialize the dApp
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectWallet();
    }
});
