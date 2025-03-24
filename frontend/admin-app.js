// Global Constants
const LOCK_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds

// Global Variables
let provider, signer, stakingContract;
let userAddress = null;
let userStakes = [];
let poolsInfo = [];

// UI Elements
const connectWalletBtn = document.getElementById('connectWallet');
const adminAddressInput = document.getElementById('adminAddress');
const setAdminButton = document.getElementById('setAdminButton');
const rewardTokenAddressInput = document.getElementById('rewardTokenAddress');
const setRewardTokenButton = document.getElementById('setRewardTokenButton');
const poolsContainer = document.getElementById('poolsContainer');
const whitelistAddressInput = document.getElementById('whitelistAddress');
const whitelistTypeSelect = document.getElementById('whitelistType');
const addToWhitelistButton = document.getElementById('addToWhitelistButton');
const poolSelect = document.getElementById('poolSelect');
const minStakeInput = document.getElementById('minStake');
const maxHoldersInput = document.getElementById('maxHolders');
const rewardPerHolderInput = document.getElementById('rewardPerHolder');
const updatePoolButton = document.getElementById('updatePoolButton');
const distributeRewardsButton = document.getElementById('distributeRewardsButton');
const stakingTable = document.getElementById('stakingTable');
const poolStats = document.getElementById('poolStats');

// Add notification div if not exists
const notificationDiv = `
    <div id="notification" class="hidden fixed bottom-4 right-4 max-w-md bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
        <p id="notificationText"></p>
    </div>
`;

if (!document.getElementById('notification')) {
    document.body.insertAdjacentHTML('beforeend', notificationDiv);
}

// Helper Functions
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    notification.className = `fixed bottom-4 right-4 max-w-md ${isError ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg`;
    notificationText.textContent = message;
    notification.classList.remove('hidden');
    setTimeout(() => notification.classList.add('hidden'), 3000);
}

// Connect Wallet with Admin Check - FIX: Pastikan fungsi didefinisikan secara global
window.connectWallet = async function() {
    console.log("window.connectWallet called - processing connection");
    
    try {
        if (typeof window.ethereum === 'undefined') {
            console.error('MetaMask tidak terdeteksi!');
            showNotification('MetaMask diperlukan untuk menggunakan aplikasi ini', true);
            return;
        }
        
        // Inisialisasi provider dan signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        console.log('Provider initialized:', provider);
        
        signer = provider.getSigner();
        console.log('Signer initialized');
        
        userAddress = await signer.getAddress();
        console.log('Connected address:', userAddress);

        // Initialize contracts
        stakingContract = new ethers.Contract(
            CONFIG.pepeStaking.address,
            CONFIG.pepeStaking.abi,
            signer
        );
        console.log('Staking contract initialized:', CONFIG.pepeStaking.address);

        // Check if connected wallet is admin or owner
        try {
            const [isAdmin, owner] = await Promise.all([
                stakingContract.isAdmin(userAddress),
                stakingContract.owner()
            ]);
            
            console.log('Is admin:', isAdmin);
            console.log('Owner address:', owner);
            console.log('User address:', userAddress);

            if (!isAdmin && owner.toLowerCase() !== userAddress.toLowerCase()) {
                showNotification('Akses ditolak: Bukan admin atau owner', true);
                return;
            }
        } catch (accessError) {
            console.error('Error checking admin status:', accessError);
            showNotification('Gagal memeriksa status admin', true);
            return;
        }

        // Update UI
        await updateUI();
        
        // TAMBAHKAN: Langsung update stakingPeriod setelah connect
        await updateStakingPeriodDisplay();
        showNotification('Admin berhasil terhubung!');

        // Mulai auto-refresh
        startAutoRefresh();
        
        // Update stake displays
        await updateActiveStakes();
        setInterval(updateActiveStakes, 10000);
        
        // Update lock period display - TAMBAHKAN PENGECEKAN
        try {
            await updateLockPeriodDisplay();
        } catch (displayError) {
            console.log('Non-critical error updating lock display:', displayError.message);
        }
        
        // Update pool lock periods - TAMBAHKAN PENGECEKAN
        try {
            await updatePoolLockPeriods();
        } catch (periodsError) {
            console.log('Non-critical error updating pool periods:', periodsError.message);
        }
        
    } catch (error) {
        console.error('Connection error:', error);
        showNotification('Gagal terhubung: ' + error.message, true);
    }
};

// Update Pools
async function updatePools() {
    try {
        const pools = await stakingContract.getAllPoolsInfo();
        poolsContainer.innerHTML = pools.map((pool, index) => createPoolCard(pool, index)).join('');
    } catch (error) {
        console.error('Error updating pools:', error);
        showNotification('Error updating pools', true);
    }
}

// Create Pool Card
function createPoolCard(pool, index) {
    return `
        <div class="bg-gray-50 p-4 rounded-lg shadow-lg">
            <h3 class="text-lg font-bold mb-2">Pool ${index + 1}</h3>
            <p class="text-sm text-gray-600">Min Stake: ${ethers.utils.formatUnits(pool.minStakeAmount, 18)} PEPE</p>
            <p class="text-sm text-gray-600">Max Holders: ${pool.maxHolders}</p>
            <p class="text-sm text-gray-600">Reward: ${ethers.utils.formatUnits(pool.rewardPerHolder, 18)} USDT</p>
            <p class="text-sm text-gray-600">Total Staked: ${ethers.utils.formatUnits(pool.totalStaked, 18)} PEPE</p>
            <p class="text-sm text-gray-600">Current Holders: ${pool.currentHolders}</p>
            <p class="text-sm text-gray-600">Active: ${pool.isActive ? 'Yes' : 'No'}</p>
        </div>
    `;
}

// Set Admin
async function setAdmin() {
    try {
        const adminAddress = adminAddressInput.value;
        if (!adminAddress) {
            showNotification('Admin address is required', true);
            return;
        }

        const tx = await stakingContract.setAdmin(adminAddress, true);
        await tx.wait();
        showNotification('Admin set successfully!');
        adminAddressInput.value = '';
    } catch (error) {
        console.error('Error setting admin:', error);
        showNotification(error.message, true);
    }
}

// Set Reward Token
async function setRewardToken() {
    try {
        const rewardTokenAddress = rewardTokenAddressInput.value;
        if (!rewardTokenAddress) {
            showNotification('Reward token address is required', true);
            return;
        }

        const tx = await stakingContract.setRewardToken(rewardTokenAddress);
        await tx.wait();
        showNotification('Reward token set successfully!');
        rewardTokenAddressInput.value = '';
    } catch (error) {
        console.error('Error setting reward token:', error);
        showNotification(error.message, true);
    }
}

// Whitelist Management
async function addToWhitelist() {
    try {
        const address = whitelistAddressInput.value;

        if (!ethers.utils.isAddress(address)) {
            showNotification('Invalid address', true);
            return;
        }

        const tx = await stakingContract.setWhitelist(address, true);
        await tx.wait();

        showNotification('Address whitelisted successfully');
        whitelistAddressInput.value = '';
    } catch (error) {
        console.error('Error adding to whitelist:', error);
        showNotification(error.message, true);
    }
}

// Pool Management
async function updatePool() {
    try {
        const poolId = poolSelect.value;
        const minStake = ethers.utils.parseEther(minStakeInput.value);
        const maxHolders = maxHoldersInput.value;
        const reward = ethers.utils.parseEther(rewardPerHolderInput.value);

        const tx = await stakingContract.updatePool(poolId, minStake, maxHolders, reward);
        await tx.wait();

        showNotification('Pool updated successfully');
        updateUI();
    } catch (error) {
        console.error('Error updating pool:', error);
        showNotification(error.message, true);
    }
}

// Reward Distribution
async function distributeRewards() {
    try {
        console.log('Memulai proses distribusi rewards...'); 
        
        // Check jika kontrak memiliki cukup USDT
        const usdtContract = new ethers.Contract(
            CONFIG.dummyUSDT.address,
            CONFIG.dummyUSDT.abi,
            signer
        );
        const contractBalance = await usdtContract.balanceOf(CONFIG.pepeStaking.address);
        console.log('USDT balance kontrak:', ethers.utils.formatEther(contractBalance));

        // Dapatkan lock period - PERBAIKAN DISINI: Gunakan DEFAULT_LOCK_PERIOD
        const lockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
        const now = Math.floor(Date.now() / 1000);
        const pools = await stakingContract.getAllPoolsInfo();
        
        // PERBAIKAN: Cek stake milik test wallet juga, bukan hanya admin
        const testWallets = [
            "0x67F8D45F011306476CcaEa5D5fD33c80a8f34f64", // Test wallet 1
            userAddress // Admin wallet
        ];
        
        let readyStakes = [];
        let stakesOwners = {};
        
        // Cek stake dari semua wallet test
        for (const wallet of testWallets) {
            console.log(`Checking stakes for ${wallet}...`);
            const userStakes = await stakingContract.getUserStakes(wallet);
            
            // Filter stake yang siap untuk unstake (sudah melewati lock period dan belum diklaim)
            const walletReadyStakes = userStakes.filter(stake => 
                !stake.hasClaimedReward && 
                now >= Number(stake.startTime) + Number(lockPeriod)
            );
            
            // Simpan informasi pemilik stake untuk digunakan nanti
            walletReadyStakes.forEach((stake, index) => {
                stakesOwners[readyStakes.length + index] = wallet;
            });
            
            readyStakes = [...readyStakes, ...walletReadyStakes];
            console.log(`Found ${walletReadyStakes.length} ready stakes for ${wallet}`);
        }
        
        console.log('Total ready stakes found:', readyStakes.length);

        if (readyStakes.length === 0) {
            showNotification('Tidak ada stake yang siap untuk reward', true);
            return;
        }

        // Hitung total USDT yang dibutuhkan
        let totalNeeded = ethers.BigNumber.from(0);
        for (const stake of readyStakes) {
            const pool = pools[stake.poolId];
            totalNeeded = totalNeeded.add(pool.rewardPerHolder);
        }
        console.log('Total USDT needed:', ethers.utils.formatEther(totalNeeded));

        if (contractBalance.lt(totalNeeded)) {
            showNotification('USDT dalam kontrak tidak mencukupi', true);
            return;
        }

        // Informasi stake yang siap untuk distribusi
        console.log('\nStakes yang siap untuk distribusi:');
        readyStakes.forEach((stake, index) => {
            const wallet = stakesOwners[index];
            const pool = pools[stake.poolId];
            console.log(`- Wallet: ${wallet.slice(0,8)}...`);
            console.log(`  Pool: ${Number(stake.poolId) + 1}`);
            console.log(`  Amount: ${ethers.utils.formatEther(stake.amount)} PEPE`);
            console.log(`  Reward: ${ethers.utils.formatEther(pool.rewardPerHolder)} USDT`);
        });
        
        // Konfirmasi dengan user sebelum melakukan unstake
        if (confirm(`Terdapat ${readyStakes.length} stake yang siap untuk distribusi reward. Lanjutkan?`)) {
            // PERBAIKAN: Stake harus di-unstake satu per satu berdasarkan index dan wallet
            // Karena tidak ada distributeRewards di kontrak, kita perlu unstake tiap stake
            
            showNotification(`Memulai proses unstake untuk ${readyStakes.length} stake...`);
            
            // Admin tidak dapat melakukan unstake untuk orang lain dalam kontrak ini
            // Kita beri tahu user bahwa mereka harus melakukan unstake sendiri
            showNotification('Silakan beritahu pemilik wallet untuk melakukan unstake secara manual', true);
            
            // Tampilkan daftar stake yang siap untuk diambil
            const stakesInfo = readyStakes.map((stake, index) => {
                const wallet = stakesOwners[index];
                const pool = pools[stake.poolId];
                return `
                    <div class="border-b border-gray-200 py-3">
                        <div><strong>Wallet:</strong> ${wallet.slice(0,8)}...</div>
                        <div><strong>Pool:</strong> ${Number(stake.poolId) + 1}</div>
                        <div><strong>Amount:</strong> ${ethers.utils.formatEther(stake.amount)} PEPE</div>
                        <div><strong>Reward:</strong> ${ethers.utils.formatEther(pool.rewardPerHolder)} USDT</div>
                    </div>
                `;
            }).join('');
            
            const stakesListModal = document.createElement('div');
            stakesListModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
            stakesListModal.innerHTML = `
                <div class="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                    <h3 class="text-xl font-bold mb-4">Stakes Ready for Reward</h3>
                    <div class="mb-4">
                        ${stakesInfo}
                    </div>
                    <button class="w-full bg-blue-600 text-white py-2 rounded-lg mt-4">Close</button>
                </div>
            `;
            
            document.body.appendChild(stakesListModal);
            stakesListModal.querySelector('button').onclick = () => stakesListModal.remove();
        }
        
        // Refresh UI
        await updateUI();
        
    } catch (error) {
        console.error('Distribution error:', error);
        showNotification(error.message, true);
    }
}

// Update UI
async function updateUI() {
    try {
        if (!stakingContract || !userAddress) return;

        // Get fresh data - PERBAIKAN DISINI: Gunakan DEFAULT_LOCK_PERIOD
        const [stakes, pools, lockPeriod] = await Promise.all([
            stakingContract.getUserStakes(userAddress),
            stakingContract.getAllPoolsInfo(),
            stakingContract.DEFAULT_LOCK_PERIOD()
        ]);

        // Update lock period display
        const minutes = Math.floor(Number(lockPeriod) / 60);
        safeUpdateElement('stakingPeriod', `${minutes} Minutes (Testing)`);

        // Update total staked
        const totalStaked = pools.reduce((acc, pool) => 
            acc.add(pool.totalStaked), ethers.BigNumber.from(0));
        safeUpdateElement('totalStakes', 
            `${Number(formatAmount(totalStaked)).toLocaleString()}`);

        // Update other stats
        safeUpdateElement('activeStakers', 
            await getActiveStakersCount() || '0');
        
        // Update pool stats
        updatePoolStats(pools);
        updateActiveStakes();
        await updateContractBalance();
        
        // Also update pool lock periods
        try {
            await updatePoolLockPeriods();
        } catch (error) {
            console.error('Error updating pool lock periods:', error);
        }

    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Helper Functions
function updatePoolStats(pools) {
    if (!pools || !poolStats) return;

    // Format number with commas
    function formatNumber(num) {
        return Number(ethers.utils.formatEther(num)).toLocaleString();
    }

    const poolCards = pools.map((pool, index) => {
        return `
            <div class="mb-4 p-4 bg-white rounded-lg shadow">
                <h3 class="font-bold text-lg mb-2">Pool ${index + 1}</h3>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600">Stake Amount:</p>
                        <p class="font-medium">${formatNumber(pool.minStakeAmount)} PEPE</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Reward:</p>
                        <p class="font-medium">${formatNumber(pool.rewardPerHolder)} USDT</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Total Staked:</p>
                        <p class="font-medium">${formatNumber(pool.totalStaked)} PEPE</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Holders:</p>
                        <p class="font-medium">${pool.currentHolders}/${pool.maxHolders}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Status:</p>
                        <div class="flex items-center justify-between">
                            <p class="font-medium">${pool.isActive ? 'Active' : 'Inactive'}</p>
                            <button onclick="togglePoolStatus(${index}, ${!pool.isActive})" 
                                class="ml-2 px-2 py-1 text-xs rounded ${pool.isActive ? 
                                'bg-red-100 text-red-600 hover:bg-red-200' : 
                                'bg-green-100 text-green-600 hover:bg-green-200'}">
                                ${pool.isActive ? 'Disable' : 'Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    poolStats.innerHTML = poolCards.join('');
}

// Tambahkan fungsi untuk toggle status pool
async function togglePoolStatus(poolId, newStatus) {
    try {
        const tx = await stakingContract.setPoolStatus(poolId, newStatus);
        showNotification(`Pool ${poolId + 1} status changing to ${newStatus ? 'Active' : 'Inactive'}...`);
        await tx.wait();
        showNotification(`Pool ${poolId + 1} status updated successfully`);
        await updateUI();
    } catch (error) {
        console.error('Error toggling pool status:', error);
        showNotification(error.message, true);
    }
}

function updateStakingTable(stakes) {
    stakingTable.innerHTML = stakes.map(stake => `
        <tr>
            <td class="px-6 py-4">${stake.user.slice(0, 8)}...</td>
            <td class="px-6 py-4">Pool ${stake.poolId + 1}</td>
            <td class="px-6 py-4">${ethers.utils.formatEther(stake.amount)} PEPE</td>
            <td class="px-6 py-4">${stake.hasClaimedReward ? 'Claimed' : 'Pending'}</td>
            <td class="px-6 py-4">
                <button onclick="forceUnstake('${stake.user}', ${stake.poolId})" 
                        class="text-red-600 hover:text-red-800">
                    Force Unstake
                </button>
            </td>
        </tr>
    `).join('');
}

function updateRewardInfo(info) {
    document.getElementById('availableRewards').textContent = 
        `${ethers.utils.formatEther(info.available)} USDT`;
    document.getElementById('pendingRewards').textContent = 
        `${ethers.utils.formatEther(info.pending)} USDT`;
}

// Fungsi untuk monitoring stakes yang lebih sederhana
async function updateActiveStakes() {
    try {
        const container = document.getElementById('activeStakesContainer');
        if (!stakingContract || !container) return;

        // Get lock period - PERBAIKAN DISINI: Gunakan DEFAULT_LOCK_PERIOD
        const lockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();

        // PERBAIKAN: Dapatkan semua stakes dari semua user, bukan hanya dari current user
        // Ini memerlukan loop melalui semua stake di semua pool untuk admin dashboard
        
        let allStakes = [];
        
        // Dapatkan semua active stakes di semua pools
        const pools = await stakingContract.getAllPoolsInfo();
        
        // Tambahkan polling untuk semua stake yang terhubung dengan wallet yang sudah melakukan stake
        // Untuk tujuan admin, kita perlu cek semua stake dari current user
        const userStakes = await stakingContract.getUserStakes(userAddress);
        
        // Jika tidak ada stake dari current user, coba cek test wallet juga
        let testWalletAddr = "0x67F8D45F011306476CcaEa5D5fD33c80a8f34f64";
        const testWalletStakes = await stakingContract.getUserStakes(testWalletAddr);
        
        // Gabungkan semua stake
        allStakes = [...userStakes];
        if (testWalletStakes.length > 0) {
            allStakes = [...allStakes, ...testWalletStakes];
        }

        // Update UI with stakes data
        if (allStakes.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center text-gray-500">No active stakes found</td></tr>';
            return;
        }
        
        const now = Math.floor(Date.now() / 1000);
        
        let html = '';
        for (let i = 0; i < allStakes.length; i++) {
            const stake = allStakes[i];
            if (stake.hasClaimedReward) continue; // Skip claimed stakes
            
            const endTime = Number(stake.startTime) + Number(lockPeriod);
            const timeLeft = endTime - now;
            const status = timeLeft <= 0 ? 'ðŸŸ¢ READY' : 'ðŸŸ¡ LOCKED';
            const statusColor = timeLeft <= 0 ? 'text-green-600' : 'text-yellow-600';
            
            html += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3">Pool #${Number(stake.poolId) + 1}</td>
                    <td class="px-4 py-3 font-mono text-sm">${i < userStakes.length ? userAddress.slice(0,8)+'...' : testWalletAddr.slice(0,8)+'...'}</td>
                    <td class="px-4 py-3">${formatAmount(stake.amount)} PEPE</td>
                    <td class="px-4 py-3">${timeLeft > 0 ? timeLeft + " seconds" : "COMPLETED"}</td>
                    <td class="px-4 py-3">
                        <span class="px-2 py-1 rounded-full text-xs ${statusColor}">
                            ${status}
                        </span>
                    </td>
                </tr>
            `;
        }
        
        if (html === '') {
            html = '<tr><td colspan="5" class="px-4 py-3 text-center text-gray-500">No active stakes found</td></tr>';
        }
        
        container.innerHTML = html;

    } catch (error) {
        console.error('Error updating active stakes:', error);
        document.getElementById('activeStakesContainer').innerHTML = 
            '<tr><td colspan="5" class="px-4 py-3 text-center text-red-500">Error loading stakes: ' + error.message + '</td></tr>';
    }
}

// FUNGSI ADD USDT DENGAN MODAL - GUNAKAN HANYA FUNGSI INI
// Fungsi untuk membuka modal Add USDT
function openUsdtModal() {
    if (window.isProcessingUSDT) {
        console.log("USDT process already running, please wait...");
        return;
    }
    
    const modal = document.getElementById('addUsdtModal');
    if (!modal) return;
    
    // Reset form
    document.getElementById('usdtAmount').value = '';
    
    // Tampilkan modal
    modal.classList.remove('hidden');
    
    // Fokus ke input
    setTimeout(() => {
        document.getElementById('usdtAmount').focus();
    }, 100);
    
    // Pastikan hanya ada satu event handler untuk konfirmasi
    const confirmBtn = document.getElementById('confirmAddUsdt');
    confirmBtn.onclick = null; // Hapus event handler lama jika ada
    confirmBtn.onclick = processAddUsdt; // Tambahkan event handler baru
}

// Fungsi untuk menutup modal Add USDT
function closeUsdtModal() {
    const modal = document.getElementById('addUsdtModal');
    if (modal) modal.classList.add('hidden');
}

// Fungsi untuk memproses Add USDT dari form modal
async function processAddUsdt() {
    // Prevent double processing
    if (window.isProcessingUSDT) {
        console.log("USDT process already running, please wait...");
        return;
    }
    
    window.isProcessingUSDT = true;
    
    try {
        const amount = document.getElementById('usdtAmount').value;
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            showNotification('Please enter a valid amount', true);
            window.isProcessingUSDT = false;
            return;
        }
        
        // Tutup modal sebelum memproses transaksi
        closeUsdtModal();
        
        const usdtAmount = ethers.utils.parseEther(amount);
        
        // Tampilkan loading notification
        showNotification('Processing USDT transfer, please wait...');
        
        const usdtContract = new ethers.Contract(
            CONFIG.dummyUSDT.address,
            CONFIG.dummyUSDT.abi,
            signer
        );
        
        // Simpan saldo awal untuk verifikasi
        const beforeBalance = await usdtContract.balanceOf(CONFIG.pepeStaking.address);
        console.log(`Contract USDT balance before: ${ethers.utils.formatEther(beforeBalance)}`);
        
        // Check USDT balance
        const userBalance = await usdtContract.balanceOf(userAddress);
        if (userBalance.lt(usdtAmount)) {
            showNotification('Insufficient USDT balance', true);
            window.isProcessingUSDT = false;
            return;
        }
        
        // Approve USDT transfer
        showNotification('Approving USDT transfer, please confirm in wallet...');
        const approveTx = await usdtContract.approve(
            CONFIG.pepeStaking.address, 
            usdtAmount,
            { gasLimit: 100000 }
        );
        
        await approveTx.wait();
        console.log('USDT approved:', approveTx.hash);
        
        // Add delay before next transaction
        showNotification('Approval confirmed, processing transfer...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Transfer USDT to contract
        const addTx = await stakingContract.addUSDT(
            usdtAmount, 
            { gasLimit: 200000 }
        );
        
        showNotification('Transfer sent, waiting for confirmation...');
        
        try {
            const receipt = await addTx.wait();
            
            if (receipt.status === 1) {
                showNotification('USDT successfully added to contract!');
            } else {
                // Periksa apakah transfer berhasil meskipun ada error
                await verifyUsdtTransfer(usdtContract, CONFIG.pepeStaking.address, beforeBalance);
            }
        } catch (error) {
            console.error('Transfer receipt error:', error);
            await verifyUsdtTransfer(usdtContract, CONFIG.pepeStaking.address, beforeBalance);
        }
        
        // Update UI
        await updateContractBalance();
        
    } catch (error) {
        console.error('Error adding USDT:', error);
        showNotification(`Error: ${error.message}`, true);
    } finally {
        window.isProcessingUSDT = false;
    }
}

// Helper function untuk verifikasi transfer USDT
async function verifyUsdtTransfer(usdtContract, contractAddress, previousBalance) {
    try {
        // Wait untuk memastikan blockchain state terupdate
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const currentBalance = await usdtContract.balanceOf(contractAddress);
        
        if (currentBalance.gt(previousBalance)) {
            showNotification('USDT transfer successful despite transaction error');
            return true;
        } else {
            showNotification('USDT transfer failed. Please try again.', true);
            return false;
        }
    } catch (error) {
        console.error('Error verifying transfer:', error);
        showNotification('Could not verify transfer. Please check contract balance.', true);
        return false;
    }
}

// Update contract USDT balance
async function updateContractBalance() {
    if (!stakingContract) return;

    const usdtContract = new ethers.Contract(
        CONFIG.dummyUSDT.address,
        CONFIG.dummyUSDT.abi,
        signer
    );
    
    const balance = await usdtContract.balanceOf(stakingContract.address);
    document.getElementById('contractUsdtBalance').textContent = 
        `${formatAmount(balance)} USDT`;
}

// Add contract data fetching
async function getContractData() {
    try {
        if (!stakingContract || !userAddress) return;

        // Get all pools info
        const poolData = await stakingContract.getAllPoolsInfo();
        console.log('Pools info:', poolData); // Debug log

        // Get total stakers count
        const totalStakers = await getActiveStakersCount();

        // Calculate total staked PEPE   
        const totalStaked = poolData.reduce((acc, pool) => 
            acc.add(pool.totalStaked), ethers.BigNumber.from(0));

        // Update UI elements
        document.getElementById('totalStakes').textContent = 
            `${Number(formatAmount(totalStaked)).toLocaleString()}`;
        document.getElementById('activeStakers').textContent = totalStakers;
        
        // Calculate pending rewards
        const pendingRewards = await calculatePendingRewards(poolData);
        document.getElementById('pendingRewards').textContent = 
            formatAmount(pendingRewards);

        // Update pool stats
        updatePoolStats(poolData);

        // Update contract USDT balance
        await updateContractBalance();

        return { pools: poolData, totalStakers, pendingRewards };
    } catch (error) {
        console.error('Error fetching contract data:', error);
        showNotification('Error fetching contract data', true);
    }
}

// Add helper function to get active stakers count
async function getActiveStakersCount() {
    try {
        const pools = await stakingContract.getAllPoolsInfo();
        let totalHolders = 0;
        for (const pool of pools) {
            totalHolders += Number(pool.currentHolders);
        }
        return totalHolders;
    } catch (error) {
        console.error('Error getting stakers count:', error);
        return 0;
    }
}

// Add helper function to calculate pending rewards
async function calculatePendingRewards(pools) {
    try {
        let totalPending = ethers.BigNumber.from(0);
        for (let poolId = 0; poolId < pools.length; poolId++) {
            const pool = pools[poolId];
            const stakes = await stakingContract.getUserStakes(userAddress);
            const poolStakes = stakes.filter(stake => Number(stake.poolId) === poolId);
               
            for (const stake of poolStakes) {
                if (!stake.hasClaimedReward && 
                    Date.now() / 1000 >= Number(stake.startTime) + LOCK_PERIOD) {
                    totalPending = totalPending.add(pool.rewardPerHolder);
                }
            }
        }
        return totalPending;
    } catch (error) {
        console.error('Error calculating pending rewards:', error);
        return ethers.BigNumber.from(0);
    }
}

// Add auto-refresh
function startAutoRefresh() {
    // Initial load with retry logic
    const tryUpdate = async (retries = 3) => {
        try {
            await getContractData();
            
            // TAMBAHKAN: Update stakingPeriod display setelah mendapatkan data kontrak
            await updateStakingPeriodDisplay();
        } catch (error) {
            if (retries > 0) {
                console.log(`Retrying update... (${retries} attempts left)`);
                setTimeout(() => tryUpdate(retries - 1), 2000);
            }
        }
    };

    // Start updates
    tryUpdate();
    
    // Regular updates every 30 seconds
    setInterval(() => tryUpdate(), 30000);

    // Check lock period every 10 seconds dengan error handling
    setInterval(async () => {
        try {
            // PERBARUI: Langsung panggil fungsi khusus
            await updateStakingPeriodDisplay();
        } catch (error) {
            console.error('Error updating lock period:', error);
        }
    }, 10000);
}

// Add helper functions untuk format waktu
function calculateTimeRemaining(startTime) {
    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(startTime) + LOCK_PERIOD;
    const remaining = endTime - now;

    if (remaining <= 0) {
        return {
            remaining: 0,
            text: 'Completed'
        };
    }

    const days = Math.floor(remaining / (24 * 3600));
    const hours = Math.floor((remaining % (24 * 3600)) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    return {
        remaining,
        text: `${days}d ${hours}h ${minutes}m`
    };
}

// Perbaikan fungsi formatAmount
function formatAmount(amount, decimals = 18) {
    try {
        if (!amount) return "0";
        if (typeof amount === 'string') return amount;
        return ethers.utils.formatUnits(amount, decimals);
    } catch (error) {
        console.error('Error formatting amount:', error);
        return "0";
    }
}

// Pindahkan semua event listeners ke dalam DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Connect wallet button
    const connectWalletBtn = document.getElementById('connectWallet');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }

    // Other buttons
    const addUsdtButton = document.getElementById('addUsdtButton');
    if (addUsdtButton) {
        // PENTING: PASTIKAN HANYA MENGGUNAKAN openUsdtModal
        addUsdtButton.addEventListener('click', openUsdtModal);
    }

    const setAdminButton = document.getElementById('setAdminButton');
    if (setAdminButton) {
        setAdminButton.addEventListener('click', setAdmin);
    }

    const setRewardTokenButton = document.getElementById('setRewardTokenButton');
    if (setRewardTokenButton) {
        setRewardTokenButton.addEventListener('click', setRewardToken);
    }

    const addToWhitelistButton = document.getElementById('addToWhitelistButton');
    if (addToWhitelistButton) {
        addToWhitelistButton.addEventListener('click', addToWhitelist);
    }

    const updatePoolButton = document.getElementById('updatePoolButton');
    if (updatePoolButton) {
        updatePoolButton.addEventListener('click', updatePool);
    }

    const distributeRewardsButton = document.getElementById('distributeRewardsButton');
    if (distributeRewardsButton) {
        distributeRewardsButton.addEventListener('click', distributeRewards);
    }

    // Check if wallet is already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectWallet().then(() => {
            startAutoRefresh();
        });
    }

    // Add setup button
    const navContainer = document.querySelector('nav .container');
    if (navContainer) {
        // Setup button
        const setupButton = document.createElement('button');
        setupButton.className = 'ml-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700';
        setupButton.innerHTML = '<i class="fas fa-cog mr-2"></i>Setup Contract';
        setupButton.onclick = setupInitialConfig;
        navContainer.appendChild(setupButton);

        // Whitelist button
        const whitelistButton = document.createElement('button');
        whitelistButton.className = 'ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700';
        whitelistButton.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Whitelist Test';
        whitelistButton.onclick = whitelistTestAddresses;
        navContainer.appendChild(whitelistButton);
    }
    
    // Update lock period display
    updateLockPeriod();
});

// Test addresses for whitelist
const TEST_ADDRESSES = [
    "0x67F8D45F011306476CcaEa5D5fD33c80a8f34f64", // Test wallet 1
    "0x8C41774Ac950B287D6dcFD51ABA48e46f0815eE1"  // Test wallet 2
];

// Whitelist function - updated to handle missing whitelist function
async function whitelistTestAddresses() {
    try {
        console.log('Attempting to whitelist test addresses...');
        
        // Check if contract has whitelist function
        if (typeof stakingContract.setWhitelist === 'function') {
            // Original implementation
            for (const address of TEST_ADDRESSES) {
                const tx = await stakingContract.setWhitelist(address, true);
                await tx.wait();
                console.log(`Address ${address} whitelisted`);
            }
            showNotification('Test addresses whitelisted successfully');
        } else {
            // Alternative: Set these addresses as admins since whitelist function doesn't exist
            console.log('setWhitelist function not found in contract. Using setAdmin instead.');
            for (const address of TEST_ADDRESSES) {
                const tx = await stakingContract.setAdmin(address, true);
                await tx.wait();
                console.log(`Address ${address} set as admin`);
            }
            showNotification('Test addresses set as admins (whitelist not available)');
        }
    } catch (error) {
        console.error('Error whitelisting addresses:', error);
        showNotification(`Whitelist error: ${error.message}`, true);
    }
}

// Setup function
async function setupInitialConfig() {
    try {
        console.log('Starting initial setup...');
        
        // Set USDT as reward token
        const usdtAddress = CONFIG.dummyUSDT.address;
        console.log('Setting USDT address:', usdtAddress);
        const tx = await stakingContract.setRewardToken(usdtAddress);
        await tx.wait();
        console.log('USDT set as reward token');
        
        showNotification('USDT token set successfully');
        await updateUI();
    } catch (error) {
        console.error('Setup error:', error);
        showNotification(error.message, true);
    }
}

// Add Lock Period Management
async function setLockPeriod() {
    try {
        const days = document.getElementById('lockPeriodDays').value;
        if (!days || days <= 0) {
            showNotification('Please enter valid number of days', true);
            return;
        }
        const newPeriod = days * 24 * 60 * 60; // Convert days to seconds
        const tx = await stakingContract.setLockPeriod(newPeriod);
        await tx.wait();
        showNotification(`Lock period updated to ${days} days`);
        updateLockPeriod();
    } catch (error) {
        console.error('Error setting lock period:', error);
        showNotification(error.message, true);
    }
}

async function updateLockPeriod() {
    try {
        if (!stakingContract) {
            console.log("Contract not initialized yet");
            return;
        }
        const lockPeriod = await stakingContract.LOCK_PERIOD();
        const days = Math.floor(Number(lockPeriod) / (24 * 60 * 60));
        document.getElementById('currentLockPeriod').textContent = days;
    } catch (error) {
        console.error('Error getting lock period:', error);
    }
}

// Add to existing DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    updateLockPeriod(); // Add this line
});

// Lock Period Management Functions
async function setQuickLockPeriod() {
    try {
        // Set to 5 minutes (300 seconds)
        const period = 300; // 5 minutes in seconds
        const tx = await stakingContract.setLockPeriod(period);
        await tx.wait();
        
        // Important: Update display immediately
        await updateLockPeriodDisplay();
        showNotification('Lock period updated to 5 minutes');
    } catch (error) {
        console.error('Error setting lock period:', error);
        showNotification(error.message, true);
    }
}

async function setCustomLockPeriod() {
    try {
        const days = document.getElementById('customLockPeriod').value;
        if (!days || days <= 0) {
            showNotification('Please enter valid number of days', true);
            return;
        }
        const period = days * 24 * 60 * 60; // Convert days to seconds
        const tx = await stakingContract.setLockPeriod(period);
        await tx.wait();
        showNotification('Lock period updated successfully');
        updateLockPeriodDisplay();
    } catch (error) {
        console.error('Error setting lock period:', error);
        showNotification(error.message, true);
    }
}

// Perbaikan fungsi updateLockPeriodDisplay dengan penggunaan safeUpdateElement
async function updateLockPeriodDisplay() {
    try {
        if (!stakingContract) {
            console.log("Contract not initialized yet");
            return;
        }
        // PERBAIKAN DISINI: Gunakan DEFAULT_LOCK_PERIOD
        const lockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
        const days = Math.floor(Number(lockPeriod) / (24 * 60 * 60));
        
        // Gunakan safeUpdateElement untuk mencegah error null
        safeUpdateElement('currentLockPeriod', days);
        safeUpdateElement('lockPeriodInSeconds', `${Number(lockPeriod).toLocaleString()} seconds`);
    } catch (error) {
        console.error('Error updating lock period display:', error);
    }
}

// Add after other helper functions
function safeUpdateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Element not found: ${id}`);
        // Buat element placeholder jika element tidak ditemukan
        const placeholderElement = ensureElementExists(id);
        placeholderElement.textContent = value;
    }
}

// Add helper function untuk get current lock period
async function getCurrentLockPeriod() {
    try {
        if (!stakingContract) return 0;
        // PERBAIKAN DISINI: Gunakan DEFAULT_LOCK_PERIOD
        const period = await stakingContract.DEFAULT_LOCK_PERIOD();
        return Number(period);
    } catch (error) {
        console.error('Error getting lock period:', error);
        return 0;
    }
}

// Function untuk menghitung total rewards yang sudah didistribusikan
async function getTotalDistributedRewards() {
    try {
        const stakes = await stakingContract.getUserStakes(userAddress);
        const pools = await stakingContract.getAllPoolsInfo();
        
        let totalDistributed = ethers.BigNumber.from(0);
        
        // Hitung total rewards dari stakes yang sudah diklaim
        for (const stake of stakes) {
            if (stake.hasClaimedReward) {
                const pool = pools[stake.poolId];
                totalDistributed = totalDistributed.add(pool.rewardPerHolder);
            }
        }
        
        return totalDistributed;
    } catch (error) {
        console.error('Error calculating distributed rewards:', error);
        return ethers.BigNumber.from(0);
    }
}

// Tambahkan ini ke DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    // Panggil updateActiveStakes segera setelah admin terhubung
    if (document.getElementById('connectWallet')) {
        const connectButton = document.getElementById('connectWallet');
        const originalOnClick = connectButton.onclick;
        
        connectButton.onclick = async () => {
            if (originalOnClick) await originalOnClick();
            if (userAddress) {
                updateActiveStakes();
                setInterval(updateActiveStakes, 10000);
            }
        };
    }
    
    // Buat tombol refresh untuk stakes
    const activeStakesHeader = document.querySelector('#activeStakesContainer').closest('.bg-white').querySelector('h2');
    if (activeStakesHeader) {
        const refreshButton = document.createElement('button');
        refreshButton.className = 'bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 ml-2';
        refreshButton.innerHTML = '<i class="fas fa-sync-alt mr-1"></i> Refresh';
        refreshButton.onclick = updateActiveStakes;
        activeStakesHeader.appendChild(refreshButton);
    }
    
    // ...existing code...
});

// Tambahkan fungsi untuk set pool lock period
async function setPoolLockPeriod() {
    try {
        const poolId = document.getElementById('poolSelector').value;
        const days = document.getElementById('poolLockPeriodDays').value;
        
        if (!days || days <= 0) {
            showNotification('Please enter valid number of days', true);
            return;
        }
        
        const newPeriod = days * 24 * 60 * 60; // Convert to seconds
        const tx = await stakingContract.setPoolLockPeriod(poolId, newPeriod);
        await tx.wait();
        
        showNotification(`Lock period for Pool ${Number(poolId) + 1} set to ${days} days`);
        document.getElementById('poolLockPeriodDays').value = '';
        await updatePoolLockPeriods();
    } catch (error) {
        console.error('Error setting pool lock period:', error);
        showNotification(error.message, true);
    }
}

// Fungsi untuk apply lock period to all pools
async function applyToAllPools() {
    try {
        const periodValue = document.getElementById('quickLockPeriod').value;
        if (!periodValue) {
            showNotification('Please select a lock period', true);
            return;
        }
        
        const tx = await stakingContract.applyLockPeriodToAllPools(periodValue);
        await tx.wait();
        
        showNotification('Lock period applied to all pools');
        await updatePoolLockPeriods();
    } catch (error) {
        console.error('Error applying lock period to all pools:', error);
        showNotification(error.message, true);
    }
}

// Fungsi untuk menampilkan lock periods
async function updatePoolLockPeriods() {
    try {
        if (!stakingContract) return;
        
        // Get default lock period
        const defaultLockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
        document.getElementById('defaultLockPeriod').textContent = 
            Number(defaultLockPeriod).toLocaleString();
        
        // Get all pools
        const pools = await stakingContract.getAllPoolsInfo();
        const container = document.getElementById('poolLockPeriodsDisplay');
        
        let html = '';
        for (let i = 0; i < pools.length; i++) {
            const pool = pools[i];
            const days = Math.floor(Number(pool.lockPeriod) / (24 * 60 * 60));
            const hours = Math.floor((Number(pool.lockPeriod) % (24 * 60 * 60)) / 3600);
            
            html += `
                <div class="p-2 border rounded">
                    <p class="font-medium">Pool ${i + 1}</p>
                    <p class="text-sm text-gray-500">${days}d ${hours}h</p>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // Also update dropdown for the update pool selector
        const updatePoolSelector = document.getElementById('updatePoolSelector');
        if (updatePoolSelector) {
            updatePoolSelector.innerHTML = '';
            for (let i = 0; i < pools.length; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Pool ${i + 1}`;
                updatePoolSelector.appendChild(option);
            }
        }
        
    } catch (error) {
        console.error('Error updating pool lock periods:', error);
    }
}

// Fungsi for creating a new pool
async function createNewPool() {
    try {
        const minAmount = document.getElementById('newPoolMinAmount').value;
        const maxHolders = document.getElementById('newPoolMaxHolders').value;
        const reward = document.getElementById('newPoolReward').value;
        const lockPeriod = document.getElementById('newPoolLockPeriod').value;
        
        if (!minAmount || !maxHolders || !reward || !lockPeriod) {
            showNotification('All fields are required', true);
            return;
        }
        
        const minAmountWei = ethers.utils.parseEther(minAmount);
        const rewardWei = ethers.utils.parseEther(reward);
        const lockPeriodSeconds = lockPeriod * 24 * 60 * 60;
        
        const tx = await stakingContract.createPool(
            minAmountWei, 
            maxHolders, 
            rewardWei, 
            lockPeriodSeconds, 
            true // isActive
        );
        await tx.wait();
        
        showNotification('New pool created successfully');
        
        // Clear form
        document.getElementById('newPoolMinAmount').value = '';
        document.getElementById('newPoolMaxHolders').value = '';
        document.getElementById('newPoolReward').value = '';
        document.getElementById('newPoolLockPeriod').value = '';
        
        // Refresh UI
        await updateUI();
        await updatePoolLockPeriods();
    } catch (error) {
        console.error('Error creating pool:', error);
        showNotification(error.message, true);
    }
}

// Fungsi for updating a pool's reward
async function updatePoolReward() {
    try {
        const poolId = document.getElementById('updatePoolSelector').value;
        const reward = document.getElementById('updatePoolReward').value;
        
        if (!reward) {
            showNotification('Please enter a reward amount', true);
            return;
        }
        
        const rewardWei = ethers.utils.parseEther(reward);
        
        const tx = await stakingContract.updatePoolReward(poolId, rewardWei);
        await tx.wait();
        
        showNotification(`Reward for Pool ${Number(poolId) + 1} updated successfully`);
        document.getElementById('updatePoolReward').value = '';
        
        // Refresh UI
        await updateUI();
    } catch (error) {
        console.error('Error updating pool reward:', error);
        showNotification(error.message, true);
    }
}

// Extend updateUI to also update pool lock periods
async function updateUI() {
    // ...existing code...
    
    try {
        await updatePoolLockPeriods();
    } catch (error) {
        console.error('Error updating pool lock periods:', error);
    }
}

// Tambahkan ke event listeners
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    // Add listeners for new functions
    document.getElementById('poolSelector')?.addEventListener('change', async () => {
        try {
            const poolId = document.getElementById('poolSelector').value;
            const pools = await stakingContract.getAllPoolsInfo();
            const pool = pools[poolId];
            const days = Math.floor(Number(pool.lockPeriod) / (24 * 60 * 60));
            document.getElementById('poolLockPeriodDays').value = days;
        } catch (e) {
            console.error('Error loading pool lock period:', e);
        }
    });
});

// Tambahkan fungsi untuk memeriksa element
function ensureElementExists(id) {
    let element = document.getElementById(id);
    if (!element) {
        console.warn(`Element #${id} not found, creating placeholder`);
        element = document.createElement('span');
        element.id = id;
        element.style.display = 'none';
        document.body.appendChild(element);
    }
    return element;
}

// Tambahkan fungsi khusus untuk memperbarui stakingPeriod
async function updateStakingPeriodDisplay() {
    try {
        if (!stakingContract) {
            console.log("Contract not initialized yet for stakingPeriod");
            return;
        }
        
        console.log("Updating stakingPeriod display...");
        // Gunakan DEFAULT_LOCK_PERIOD dari kontrak
        const lockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
        console.log("Lock period from contract:", Number(lockPeriod), "seconds");
        
        // Konversi ke menit untuk display
        const minutes = Math.floor(Number(lockPeriod) / 60);
        console.log("Lock period in minutes:", minutes);
        
        // Update elemen stakingPeriod
        const stakingPeriodEl = document.getElementById('stakingPeriod');
        if (stakingPeriodEl) {
            stakingPeriodEl.textContent = `${minutes} Minutes (Testing)`;
            stakingPeriodEl.classList.remove('text-gray-500');
            stakingPeriodEl.classList.add('text-purple-600');
            console.log("stakingPeriod element updated successfully");
        } else {
            console.warn("stakingPeriod element not found");
        }
    } catch (error) {
        console.error('Error updating stakingPeriod display:', error);
    }
}

// Perbarui fungsi startAutoRefresh untuk memanggil updateStakingPeriodDisplay
function startAutoRefresh() {
    // Initial load with retry logic
    const tryUpdate = async (retries = 3) => {
        try {
            await getContractData();
            
            // TAMBAHKAN: Update stakingPeriod display setelah mendapatkan data kontrak
            await updateStakingPeriodDisplay();
        } catch (error) {
            if (retries > 0) {
                console.log(`Retrying update... (${retries} attempts left)`);
                setTimeout(() => tryUpdate(retries - 1), 2000);
            }
        }
    };

    // Start updates
    tryUpdate();
    
    // Regular updates every 30 seconds
    setInterval(() => tryUpdate(), 30000);

    // Check lock period every 10 seconds dengan error handling
    setInterval(async () => {
        try {
            // PERBARUI: Langsung panggil fungsi khusus
            await updateStakingPeriodDisplay();
        } catch (error) {
            console.error('Error updating lock period:', error);
        }
    }, 10000);
}

// Tombol manual refresh untuk Current Lock Period - tambahkan ke DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    
    // Tambahkan tombol refresh untuk Current Lock Period
    const stakingPeriodEl = document.getElementById('stakingPeriod');
    if (stakingPeriodEl && stakingPeriodEl.parentElement) {
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'ml-2 bg-blue-500 text-white px-2 py-1 rounded-md text-xs';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        refreshBtn.onclick = updateStakingPeriodDisplay;
        stakingPeriodEl.parentElement.appendChild(refreshBtn);
    }
    
    // ...existing code...
});

// Update dropdown label to reflect actual functionality
document.addEventListener('DOMContentLoaded', function() {
    // ...existing code...
    
    // Update whitelist button label based on contract capabilities
    setTimeout(async () => {
        if (stakingContract) {
            const whitelistBtn = document.getElementById('whitelistBtn');
            if (whitelistBtn) {
                if (typeof stakingContract.setWhitelist === 'function') {
                    whitelistBtn.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Whitelist Test';
                } else {
                    whitelistBtn.innerHTML = '<i class="fas fa-user-shield mr-2"></i>Add Test Admins';
                }
            }
        }
    }, 2000); // Give time for contract to initialize
    
    // ...existing code...
});

// Tambahkan fungsi untuk menambahkan admin dengan input alamat
async function addNewAdmin() {
    try {
        const adminAddress = prompt("Enter address to add as admin:");
        
        if (!adminAddress) return; // Batalkan jika dibatalkan
        
        if (!ethers.utils.isAddress(adminAddress)) {
            showNotification('Invalid address format', true);
            return;
        }
        
        const tx = await stakingContract.setAdmin(adminAddress, true);
        await tx.wait();
        
        showNotification(`Address ${adminAddress} set as admin successfully`);
    } catch (error) {
        console.error('Error setting admin:', error);
        showNotification(error.message, true);
    }
}