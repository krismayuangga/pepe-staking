let provider, signer, pepeToken, stakingContract, usdtToken;  // Add usdtToken here
let userAddress = null;
let poolsInfo = [];
let userStakes = [];
let selectedPoolId = 0;

const LOCK_PERIOD = 30 * 24 * 60 * 60; // 30 days in seconds

// Helper Functions
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    notification.className = `fixed bottom-4 right-4 max-w-md ${isError ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-lg`;
    notificationText.textContent = message;
    notification.classList.remove('hidden');
    setTimeout(() => notification.classList.add('hidden'), 3000);
}

function formatAmount(amount, decimals = 18) {
    if (typeof amount === 'string') {
        return amount;
    }
    return ethers.utils.formatUnits(amount, decimals);
}

// Helper untuk mendapatkan konfigurasi USDT yang benar berdasarkan jaringan
function getUSDTConfig() {
    const network = window.networkSwitcher.getCurrentNetwork();
    if (network === 'mainnet') {
        return {
            name: 'usdt',
            address: MAINNET_CONFIG.usdt.address,
            abi: MAINNET_CONFIG.usdt.abi
        };
    } else {
        return {
            name: 'dummyUSDT',
            address: CONFIG.dummyUSDT.address,
            abi: CONFIG.dummyUSDT.abi
        };
    }
}

// Helper untuk menampilkan lock period yang benar
function formatLockPeriod(seconds) {
    const network = networkSwitcher.getCurrentNetwork();
    if (network === 'mainnet') {
        // Convert seconds to days for mainnet
        const days = Math.floor(seconds / 86400);
        return `${days} day${days !== 1 ? 's' : ''}`;
    } else {
        // Convert seconds to minutes for testnet
        const minutes = Math.floor(seconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} (Testing)`;
    }
}

// Pool Card Template
// Perbaiki fungsi createPoolCard agar lebih dinamis
async function createPoolCard(pool, index) {
    // Get current network configuration
    const network = networkSwitcher.getCurrentNetwork();
    const currentConfig = networkSwitcher.getContractsConfig();
    
    // Gunakan data dari kontrak jika hardcoded config tidak tersedia
    let poolConfig;
    
    if (currentConfig.pepeStaking.pools && currentConfig.pepeStaking.pools[index]) {
        // Gunakan konfigurasi dari config jika tersedia
        poolConfig = currentConfig.pepeStaking.pools[index];
    } else {
        // Generate konfigurasi dinamis jika tidak ada di config
        poolConfig = {
            name: `Pool ${index + 1}`,
            minPepe: formatAmount(pool.minStakeAmount),
            reward: formatAmount(pool.rewardPerHolder)
        };
    }

    // Get current lock period from contract - tambah pengecekan
    let lockPeriod;
    try {
        if (stakingContract) {
            // Gunakan DEFAULT_LOCK_PERIOD karena ini yang tersedia di kontrak baru
            lockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
        } else {
            // Fallback value jika kontrak belum tersedia
            lockPeriod = network === 'mainnet' ? 2592000 : 300; // 30 days or 5 minutes
        }
    } catch (err) {
        console.error("Error getting lock period:", err);
        lockPeriod = network === 'mainnet' ? 2592000 : 300; // Fallback value
    }
    
    // Cari stake yang aktif di pool ini
    const activeStake = userStakes.find(stake => 
        Number(stake.poolId) === index && 
        !stake.hasClaimedReward
    );
    
    const totalStaked = formatAmount(pool.totalStaked);

    return `
        <div class="pool-card rounded-xl p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-lg font-bold text-white">${poolConfig.name}</h3>
                    <p class="text-[#B4B4B4] text-sm">Lock Period: ${formatLockPeriod(lockPeriod)}</p>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold text-[#00FFA3]">${poolConfig.reward} USDT</p>
                    <p class="text-[#B4B4B4] text-sm">Fixed Reward</p>
                </div>
            </div>
            
            <div class="space-y-3 mb-4">
                <div class="flex justify-between text-sm">
                    <span class="text-[#B4B4B4]">Required Stake:</span>
                    <span class="font-medium text-white">${poolConfig.minPepe} PEPE</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-[#B4B4B4]">Total Staked:</span>
                    <span class="font-medium text-white">${Number(totalStaked).toLocaleString()} PEPE</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-[#B4B4B4]">Slots:</span>
                    <span class="font-medium text-white">${pool.currentHolders}/${pool.maxHolders}</span>
                </div>
                ${activeStake ? generateActiveStakeInfo(activeStake, lockPeriod) : ''}
            </div>

            <div class="space-y-2">
                ${activeStake ? 
                    generateUnstakeButton(index, activeStake, lockPeriod) : 
                    generateStakeButton(poolConfig.minPepe, index)}
            </div>
        </div>
    `;
}

// Add helper function untuk generate active stake info
function generateActiveStakeInfo(stake, lockPeriod) {
    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(stake.startTime) + Number(lockPeriod);
    const timeLeft = endTime - now;
    const status = timeLeft <= 0 ? '🟢 READY' : '🟡 LOCKED';
    const statusColor = timeLeft <= 0 ? 'text-[#00FFA3]' : 'text-yellow-500';

    return `
        <div class="border-t border-gray-700 pt-3 mt-3">
            <div class="flex justify-between text-sm">
                <span class="text-[#B4B4B4]">Your Stake:</span>
                <span class="font-medium text-white">${Number(formatAmount(stake.amount)).toLocaleString()} PEPE</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-[#B4B4B4]">Time Left:</span>
                <span class="font-medium">${timeLeft > 0 ? formatTimeLeft(timeLeft) : "COMPLETED"}</span>
            </div>
            <div class="flex justify-between text-sm">
                <span class="text-[#B4B4B4]">Status:</span>
                <span class="font-medium ${statusColor}">${status}</span>
            </div>
        </div>
    `;
}

// Modifikasi fungsi generateUnstakeButton untuk menampilkan opsi early unstake
function generateUnstakeButton(poolId, stake, lockPeriod) {
    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(stake.startTime) + Number(lockPeriod);
    const canUnstake = now >= endTime;
    
    return `
        <div class="space-y-2">
            <button onclick="unstakeFromPool(${poolId})" 
                    class="w-full ${canUnstake ? 'border border-[#00FFA3] text-[#00FFA3]' : 'bg-gray-600 text-gray-400'} py-2 rounded-lg font-semibold transition-colors"
                    ${!canUnstake ? 'disabled' : ''}>
                ${canUnstake ? 'Unstake with Reward' : 'Locked'}
            </button>
            ${!canUnstake ? `
                <button onclick="unstakeEarlyFromPool(${poolId})" 
                        class="w-full border border-red-500 text-red-500 py-2 rounded-lg font-semibold hover:bg-red-500 hover:text-white transition-colors">
                    Early Unstake (No Reward)
                </button>
            ` : ''}
        </div>
    `;
}

function generateStakeButton(minPepe, poolId) {
    return `
        <button onclick="openStakeModal(${poolId})" 
                class="w-full gradient-button text-black py-2 rounded-lg font-semibold">
            Stake ${minPepe} PEPE
        </button>
    `;
}

// Helper function untuk menghitung sisa waktu
function calculateTimeRemaining(startTime, lockPeriod) {
    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(startTime) + Number(lockPeriod);
    const remaining = endTime - now;
    return remaining > 0 ? remaining : 0;
}

// Helper function untuk format waktu
function formatTimeRemaining(seconds) {
    if (!seconds) return 'N/A';
    if (seconds <= 0) return 'Completed';
    
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
}

// Modal Functions
function openStakeModal(poolId) {
    selectedPoolId = poolId;
    const network = networkSwitcher.getCurrentNetwork();
    const currentConfig = networkSwitcher.getContractsConfig();
    const poolConfig = currentConfig.pepeStaking.pools[poolId];
    
    document.getElementById('stakeModal').classList.remove('hidden');
    document.getElementById('minStake').textContent = `${poolConfig.minPepe} PEPE`;
    document.getElementById('poolReward').textContent = `${poolConfig.reward} USDT`;
}

function closeStakeModal() {
    document.getElementById('stakeModal').classList.add('hidden');
}

function closeMetaMaskModal() {
    document.getElementById('metamaskModal').classList.add('hidden');
}

// Pool Actions
async function confirmStake() {
    try {
        console.log('Starting stake process...'); // Debug log
        console.log('Selected pool:', selectedPoolId); // Debug log
        
        // Get current network config
        const network = networkSwitcher.getCurrentNetwork();
        const currentConfig = networkSwitcher.getContractsConfig();
                
        const pool = poolsInfo[selectedPoolId];
        const amount = pool.minStakeAmount;
        console.log('Stake amount:', ethers.utils.formatEther(amount)); // Debug log
                
        // Check PEPE balance first
        const balance = await pepeToken.balanceOf(userAddress);
        console.log('Current PEPE balance:', ethers.utils.formatEther(balance)); // Debug log
                
        if (balance.lt(amount)) {
            showNotification('Insufficient PEPE balance', true);
            return;
        }
                
        console.log('Approving PEPE tokens...'); // Debug log
        const approveTx = await pepeToken.approve(currentConfig.pepeStaking.address, amount);
        console.log('Approval tx:', approveTx.hash); // Debug log
        await approveTx.wait();
        console.log('Approval confirmed'); // Debug log
                
        console.log('Staking tokens...'); // Debug log
        const stakeTx = await stakingContract.stake(selectedPoolId, amount, {
            gasLimit: currentConfig.pepeStaking.gasLimit?.stake || 120000
        });
        console.log('Stake tx:', stakeTx.hash); // Debug log
        await stakeTx.wait();
        console.log('Stake confirmed'); // Debug log
                
        showNotification('Berhasil stake PEPE tokens!');
        closeStakeModal();
        updateUI();
    } catch (error) {
        console.error('Staking error:', error); // Debug log
        showNotification(error.message, true);
    }
}

// Perbaikan fungsi unstake
// Perbaikan fungsi unstakeFromPool yang menghilangkan penggunaan getPoolDetails
async function unstakeFromPool(poolId) {
    // Declare stakeIndex di luar try/catch block agar tersedia di seluruh fungsi
    let stakeIndex = -1;

    try {
        console.log('Starting unstake process for pool:', poolId);
        
        if (!stakingContract || !userAddress) {
            showNotification('Please connect your wallet first', true);
            return;
        }

        // TAMBAHAN: Periksa dulu saldo USDT di kontrak
        const network = networkSwitcher.getCurrentNetwork();
        const currentConfig = networkSwitcher.getContractsConfig();
        const usdtBalance = await usdtToken.balanceOf(currentConfig.pepeStaking.address);

        // Cari stake dengan poolId yang sesuai
        const stakes = await stakingContract.getUserStakes(userAddress);
        console.log("All stakes:", stakes);
        
        // Cari stake yang sesuai
        for (let i = 0; i < stakes.length; i++) {
            const stakePoolId = typeof stakes[i].poolId === 'object' ? 
                Number(stakes[i].poolId.toString()) : Number(stakes[i].poolId);
            
            if (stakePoolId === Number(poolId) && !stakes[i].hasClaimedReward) {
                stakeIndex = i;
                console.log(`Match found at index ${i}`);
                break;
            }
        }
        
        if (stakeIndex === -1) {
            showNotification('No active stake found for this pool', true);
            return;
        }
        
        // PERUBAHAN: Mendapatkan pool info dari getAllPoolsInfo() daripada getPoolDetails
        const stake = stakes[stakeIndex];
        const allPools = await stakingContract.getAllPoolsInfo();
        const poolInfo = allPools[Number(stake.poolId)];
        
        const now = Math.floor(Date.now() / 1000);
        const startTime = Number(stake.startTime);
        const lockPeriod = Number(poolInfo.lockPeriod || await stakingContract.DEFAULT_LOCK_PERIOD());
        const endTime = startTime + lockPeriod;
        const timeLeft = endTime - now;
        
        console.log("Lock period debug info:", {
            now,
            startTime,
            lockPeriod,
            endTime,
            timeLeft,
            hasClaimedReward: stake.hasClaimedReward,
            amount: formatAmount(stake.amount),
            poolReward: formatAmount(poolInfo.rewardPerHolder)
        });
        
        // Verifikasi jika waktu sudah habis
        if (timeLeft > 0) {
            showNotification(`Stake masih terkunci selama ${formatTimeLeft(timeLeft)}. Tunggu sampai waktu lock selesai.`, true);
            return;
        }

        // Verifikasi saldo USDT cukup untuk membayar reward
        if (usdtBalance.lt(poolInfo.rewardPerHolder)) {
            showNotification(`Kontrak tidak memiliki cukup USDT untuk reward. Harap hubungi admin.`, true);
            return;
        }
        
        // Tampilkan loading dan indikator proses
        showNotification('Processing unstake, please wait...');
        
        // Naikkan gas limit untuk mengatasi kemungkinan estimasi gas yang terlalu rendah
        const gasLimit = currentConfig.pepeStaking.gasLimit?.unstake || 200000;
        const tx = await stakingContract.unstake(stakeIndex, {
            gasLimit: gasLimit
        });
        
        showNotification(`Transaction sent: ${tx.hash.slice(0,10)}...`);
        
        // Tunggu transaksi selesai
        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);
        
        if (receipt.status === 1) {
            showNotification('Unstake successful! Tokens and rewards received');
            await updateUI();
        } else {
            showNotification('Transaction failed on blockchain', true);
        }
    } catch (error) {
        console.error('Error unstaking:', error);
        
        // Debug error untuk menemukan penyebab masalah
        const errorDetails = error.message || "";
        
        if (errorDetails.includes("Stake is still locked")) {
            showNotification("Stake masih terkunci. Tunggu hingga periode lock selesai.", true);
        } 
        else if (errorDetails.includes("Already unstaked")) {
            showNotification("Stake ini sudah pernah di-unstake sebelumnya.", true);
        }
        else if (errorDetails.includes("Reward transfer failed")) {
            showNotification("Gagal mentransfer reward. Kontrak mungkin kekurangan USDT.", true);
        }
        else if (errorDetails.includes("PEPE transfer failed")) {
            showNotification("Gagal mentransfer token PEPE.", true);
        }
        else if (errorDetails.includes("CALL_EXCEPTION") || errorDetails.includes("gas required exceeds")) {
            // Coba dengan gas limit yang lebih tinggi
            try {
                showNotification("Mencoba kembali dengan gas limit yang lebih tinggi...");
                
                const network = networkSwitcher.getCurrentNetwork();
                const currentConfig = networkSwitcher.getContractsConfig();
                
                const tx = await stakingContract.unstake(stakeIndex, {
                    gasLimit: 300000  // Meningkatkan gas limit untuk mencoba lagi
                });
                
                showNotification(`Transaksi baru terkirim: ${tx.hash.slice(0,10)}...`);
                const receipt = await tx.wait();
                
                if (receipt.status === 1) {
                    showNotification('Unstake berhasil! Token dan rewards diterima');
                    await updateUI();
                } else {
                    showNotification('Transaksi gagal pada blockchain', true);
                }
            } catch (retryError) {
                console.error('Error during retry:', retryError);
                showNotification('Unstake gagal. Periksa transaksi di blockchain explorer.', true);
            }
        } else {
            showNotification(`Error: ${errorDetails}`, true);
        }
    }
}

// Helper function untuk memformat waktu tersisa
function formatTimeLeft(seconds) {
    if (seconds <= 60) return `${seconds} detik`;
    if (seconds <= 3600) return `${Math.floor(seconds/60)} menit ${seconds % 60} detik`;
    if (seconds <= 86400) return `${Math.floor(seconds/3600)} jam ${Math.floor((seconds % 3600) / 60)} menit`;
    return `${Math.floor(seconds/86400)} hari ${Math.floor((seconds % 86400) / 3600)} jam`;
}

// Perbaikan function unstakeByIndex
async function unstakeByIndex(index) {
    try {
        console.log(`Unstaking by index: ${index}`);
        
        if (!stakingContract || !userAddress) {
            showNotification('Please connect your wallet first', true);
            return;
        }
        
        // Gunakan gas limit yang dioptimasi
        const network = networkSwitcher.getCurrentNetwork();
        const currentConfig = networkSwitcher.getContractsConfig();
        const gasLimit = currentConfig.pepeStaking.gasLimit?.unstake || 300000;
        
        const tx = await stakingContract.unstake(index, {
            gasLimit: gasLimit
        });
        
        showNotification('Unstaking transaction sent. Please wait...');
        await tx.wait();
        
        showNotification('Successfully unstaked tokens!');
        await updateUI();
    } catch (error) {
        console.error('Error unstaking:', error);
        showNotification(error.message, true);
    }
}

// Tambahkan fungsi untuk early unstake
async function unstakeEarlyFromPool(poolId) {
    try {
        console.log('Starting early unstake for pool:', poolId);
        
        if (!stakingContract || !userAddress) {
            showNotification('Silahkan hubungkan wallet terlebih dahulu', true);
            return;
        }

        // Konfirmasi kehilangan reward
        if (!confirm('PERINGATAN: Anda akan kehilangan semua reward jika unstake sekarang. Lanjutkan?')) {
            return;
        }

        // Cari stake dengan poolId yang sesuai
        const stakes = await stakingContract.getUserStakes(userAddress);
        let stakeIndex = -1;
        
        for (let i = 0; i < stakes.length; i++) {
            if (Number(stakes[i].poolId) === Number(poolId) && !stakes[i].hasClaimedReward) {
                stakeIndex = i;
                break;
            }
        }
        
        if (stakeIndex === -1) {
            showNotification('Stake tidak ditemukan untuk pool ini', true);
            return;
        }
        
        console.log(`Menemukan stake di index ${stakeIndex} untuk early unstake`);
        
        // Eksekusi unstakeEarly dengan gas limit yang dioptimasi
        const network = networkSwitcher.getCurrentNetwork();
        const currentConfig = networkSwitcher.getContractsConfig();
        const gasLimit = currentConfig.pepeStaking.gasLimit?.unstakeEarly || 300000;
        
        const tx = await stakingContract.unstakeEarly(stakeIndex, {
            gasLimit: gasLimit
        });
        
        showNotification('Transaksi unstake dini sedang diproses...');
        await tx.wait();
        
        showNotification('Unstake dini berhasil! PEPE tokens dikembalikan tanpa reward');
        await updateUI();
    } catch (error) {
        console.error('Error saat early unstake:', error);
        showNotification(error.message, true);
    }
}

// Update UI
async function updateUI() {
    if (!userAddress) return;

    try {
        // Get current network and config
        const network = networkSwitcher.getCurrentNetwork();
        const currentConfig = networkSwitcher.getContractsConfig();
        
        // Update staking period
        const defaultLockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
        document.getElementById('stakingPeriod').textContent = formatLockPeriod(defaultLockPeriod);

        // Get user's PEPE balance
        const balance = await pepeToken.balanceOf(userAddress);
        const decimals = await pepeToken.decimals();
        const formattedBalance = ethers.utils.formatUnits(balance, decimals);
        document.getElementById('pepeBalance').textContent = `${numberWithCommas(formattedBalance)} PEPE`;

        // Get user's USDT balance
        const usdtBalance = await usdtToken.balanceOf(userAddress);
        const usdtDecimals = await usdtToken.decimals();
        const formattedUsdtBalance = ethers.utils.formatUnits(usdtBalance, usdtDecimals);
        document.getElementById('usdtBalance').textContent = `${numberWithCommas(formattedUsdtBalance)} USDT`;

        // Get user stakes
        const stakes = await stakingContract.getUserStakes(userAddress);
        userStakes = stakes;

        // Calculate total staked
        let totalStaked = ethers.BigNumber.from(0);
        for (let i = 0; i < stakes.length; i++) {
            totalStaked = totalStaked.add(stakes[i].amount);
        }
        const formattedTotalStaked = ethers.utils.formatUnits(totalStaked, decimals);
        document.getElementById('stakedBalance').textContent = `${numberWithCommas(formattedTotalStaked)} PEPE`;

        // Calculate total balance (available + staked)
        const totalBalance = balance.add(totalStaked);
        const formattedTotalBalance = ethers.utils.formatUnits(totalBalance, decimals);
        document.getElementById('totalBalance').textContent = `${numberWithCommas(formattedTotalBalance)} PEPE`;

        // Get pools info
        const pools = await stakingContract.getAllPoolsInfo();
        poolsInfo = pools;

        // Update active stakes display
        updateActiveStakesDisplay(stakes, pools);

        // Update pools display
        updatePoolsDisplay(pools);

    } catch (error) {
        console.error("Error updating UI:", error);
        showNotification("Error updating information", true);
    }
}

// Function untuk menampilkan pools
async function updatePoolsDisplay(pools) {
    const poolsContainer = document.getElementById('poolsContainer');
    if (!poolsContainer) return;

    try {
        // Filter hanya pool yang aktif
        const activePools = pools.filter(pool => pool.isActive);
        
        if (activePools.length === 0) {
            poolsContainer.innerHTML = '<div class="col-span-3 text-center py-8 text-gray-400">No active pools available</div>';
            return;
        }
        
        // Create card for each pool
        const poolsHTML = await Promise.all(activePools.map(async (pool, i) => {
            // Find original index in the full pools array
            const originalIndex = pools.findIndex((p, index) => 
                p.minStakeAmount.eq(pool.minStakeAmount) && 
                p.rewardPerHolder.eq(pool.rewardPerHolder) &&
                index === i // Check index as well for more certainty
            );
            return await createPoolCard(pool, originalIndex >= 0 ? originalIndex : i);
        }));
        
        poolsContainer.innerHTML = poolsHTML.join('');
    } catch (error) {
        console.error("Error updating pools display:", error);
        poolsContainer.innerHTML = '<div class="col-span-3 text-center py-8 text-red-400">Error loading pools</div>';
    }
}

// Function untuk menampilkan active stakes
function updateActiveStakesDisplay(stakes, pools) {
    const activeStakesContainer = document.getElementById('activeStakes');
    if (!activeStakesContainer) return;
    
    // Filter hanya stake yang belum di-unstake
    const activeStakes = stakes.filter(stake => !stake.hasClaimedReward);
    
    if (activeStakes.length === 0) {
        activeStakesContainer.innerHTML = '<div class="text-gray-400 text-center py-4">No active stakes</div>';
        return;
    }
    
    const stakesHTML = activeStakes.map((stake, index) => {
        const poolIndex = Number(stake.poolId);
        const pool = poolIndex < pools.length ? pools[poolIndex] : null;
        const network = networkSwitcher.getCurrentNetwork();
        const currentConfig = networkSwitcher.getContractsConfig();
        
        // Get pool configuration
        let poolConfig;
        if (currentConfig.pepeStaking.pools && currentConfig.pepeStaking.pools[poolIndex]) {
            poolConfig = currentConfig.pepeStaking.pools[poolIndex];
        } else {
            poolConfig = {
                name: `Pool ${poolIndex + 1}`,
                reward: pool ? formatAmount(pool.rewardPerHolder) : "N/A"
            };
        }
        
        // Calculate time left
        const now = Math.floor(Date.now() / 1000);
        const lockPeriod = pool ? Number(pool.lockPeriod) : (network === 'mainnet' ? 2592000 : 300);
        const endTime = Number(stake.startTime) + lockPeriod;
        const timeLeft = endTime - now;
        
        // Check if can unstake
        const canUnstake = timeLeft <= 0;
        
        return `
            <div class="active-stake p-4 border border-gray-700 rounded-lg mb-3">
                <div class="flex justify-between mb-2">
                    <span class="text-gray-200 font-medium">${poolConfig.name}</span>
                    <span class="text-[#00FFA3] font-bold">${poolConfig.reward} USDT</span>
                </div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-400">Amount:</span>
                    <span class="text-white">${formatAmount(stake.amount)} PEPE</span>
                </div>
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-400">Status:</span>
                    <span class="${canUnstake ? 'text-[#00FFA3]' : 'text-yellow-400'}">
                        ${canUnstake ? 'READY FOR UNSTAKE' : 'LOCKED'}
                    </span>
                </div>
                <div class="flex justify-between text-sm mb-3">
                    <span class="text-gray-400">Time Left:</span>
                    <span class="text-white">${timeLeft > 0 ? formatTimeLeft(timeLeft) : 'COMPLETED'}</span>
                </div>
                <div class="flex space-x-2">
                    <button onclick="unstakeByIndex(${index})" 
                        class="flex-1 ${canUnstake ? 'bg-[#00FFA3] hover:bg-[#00cc82] text-black' : 'bg-gray-700 text-gray-400 cursor-not-allowed'} py-2 rounded font-medium transition-colors"
                        ${!canUnstake ? 'disabled' : ''}>
                        Unstake
                    </button>
                    ${!canUnstake ? `
                        <button onclick="unstakeEarlyFromPool(${poolIndex})" 
                            class="flex-1 bg-red-700 hover:bg-red-600 text-white py-2 rounded font-medium transition-colors">
                            Unstake Early
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    activeStakesContainer.innerHTML = stakesHTML;
}

// Helper untuk format numbers dengan koma
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Connect Wallet
async function connectWallet() {
    try {
        // Check if MetaMask is installed
        if (!window.ethereum) {
            showMetaMaskModal();
            return;
        }

        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0];

        // Set up ethers provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();

        // Get current network
        const network = networkSwitcher.getCurrentNetwork();
        const currentConfig = networkSwitcher.getContractsConfig();
        
        // Get network info
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const targetChainId = networkSwitcher.getNetworkConfig().chainId;
        
        // Check if on correct network and switch if needed
        if (chainId !== targetChainId) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetChainId }],
                });
            } catch (switchError) {
                // Network doesn't exist in wallet
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [networkSwitcher.getNetworkConfig()],
                        });
                    } catch (addError) {
                        showNotification('Failed to add network to MetaMask', true);
                        return;
                    }
                } else {
                    showNotification('Please switch to ' + networkSwitcher.getNetworkConfig().chainName, true);
                    return;
                }
            }
        }

        // Initialize token contracts with correct configuration
        pepeToken = new ethers.Contract(
            currentConfig.pepeToken.address,
            currentConfig.pepeToken.abi,
            signer
        );
        
        // Get the correct USDT configuration
        const usdtConfig = getUSDTConfig();
        usdtToken = new ethers.Contract(
            usdtConfig.address,
            usdtConfig.abi,
            signer
        );
        
        stakingContract = new ethers.Contract(
            currentConfig.pepeStaking.address,
            currentConfig.pepeStaking.abi,
            signer
        );

        // Update UI components
        document.getElementById('connectWallet').innerHTML = `
            <i class="fas fa-wallet mr-2"></i>${userAddress.substring(0, 6)}...${userAddress.substring(38)}
        `;
        document.getElementById('connectWallet').className = 'bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors';
        
        // Update UI with user's balances and stakes
        await updateUI();

        // Override provider for gas tracking
        window.overrideEthereumProvider && window.overrideEthereumProvider();

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error(error);
        showNotification("Error connecting wallet: " + error.message, true);
    }
}

// Network Functions
async function switchToBSCTestnet() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BSC_CONFIG.chainId }],
        });
        document.getElementById('networkModal').classList.add('hidden');
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [BSC_CONFIG],
                });
                document.getElementById('networkModal').classList.add('hidden');
            } catch (addError) {
                showNotification('Gagal menambahkan BSC Testnet', true);
            }
        } else {
            showNotification('Gagal mengganti network', true);
        }
    }
}

// Perbaikan pada fungsi startTimers
function startTimers() {
    setInterval(async () => {
        if (userStakes.length > 0) {
            await updateUI();
        }
        
        // Update lock period separately
        try {
            // Hanya panggil DEFAULT_LOCK_PERIOD jika kontrak benar-benar terhubung
            if (stakingContract && userAddress && provider) {
                // Tambahkan error handling yang lebih baik
                try {
                    const lockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
                    const stakingPeriodEl = document.getElementById('stakingPeriod');
                    if (stakingPeriodEl) {
                        stakingPeriodEl.textContent = formatLockPeriod(lockPeriod);
                    }
                } catch (contractError) {
                    console.log('Contract not fully initialized yet or wrong network');
                }
            }
        } catch (error) {
            console.error('Error updating lock period:', error);
        }
    }, 10000);
}

// Setup event listeners
function setupEventListeners() {
    // Add any specific event listeners after wallet is connected
    console.log("Setting up event listeners for connected wallet");
}

// Function to show MetaMask modal
function showMetaMaskModal() {
    document.getElementById('metamaskModal').classList.remove('hidden');
}

// Helper function for static pool cards (when not logged in)
function createStaticPoolCard(pool, index) {
    // Get current network config
    let network = 'testnet'; // Default ke testnet
    
    try {
        if (networkSwitcher && typeof networkSwitcher.getCurrentNetwork === 'function') {
            network = networkSwitcher.getCurrentNetwork();
        }
    } catch (error) {
        console.log('Error getting network:', error);
    }
    
    const currentConfig = network === 'mainnet' ? MAINNET_CONFIG : CONFIG;
    
    // Use config data if available, otherwise generate from contract data
    let poolConfig = currentConfig.pepeStaking.pools && currentConfig.pepeStaking.pools[index] ? 
        currentConfig.pepeStaking.pools[index] : {
            name: `Pool ${index + 1}`,
            minPepe: formatAmount(pool.minStakeAmount),
            reward: formatAmount(pool.rewardPerHolder)
        };
    
    const totalStaked = formatAmount(pool.totalStaked);
    
    // Get appropriate lock period text based on network
    const lockPeriodText = network === 'mainnet' ? "30 days" : "5 Minutes (Testing)";
    
    return `
        <div class="pool-card rounded-xl p-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-lg font-bold text-white">${poolConfig.name}</h3>
                    <p class="text-[#B4B4B4] text-sm">Lock Period: ${lockPeriodText}</p>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold text-[#00FFA3]">${poolConfig.reward} USDT</p>
                    <p class="text-[#B4B4B4] text-sm">Fixed Reward</p>
                </div>
            </div>
            
            <div class="space-y-3 mb-4">
                <div class="flex justify-between text-sm">
                    <span class="text-[#B4B4B4]">Required Stake:</span>
                    <span class="font-medium text-white">${poolConfig.minPepe} PEPE</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-[#B4B4B4]">Total Staked:</span>
                    <span class="font-medium text-white">${Number(totalStaked).toLocaleString()} PEPE</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-[#B4B4B4]">Slots:</span>
                    <span class="font-medium text-white">${pool.currentHolders}/${pool.maxHolders}</span>
                </div>
            </div>

            <div class="space-y-2">
                <button onclick="connectWallet()" 
                        class="w-full gradient-button text-black py-2 rounded-lg font-semibold">
                    Connect Wallet to Stake
                </button>
            </div>
        </div>
    `;
}

async function updateActiveStakesInfo() {
    const container = document.getElementById('activeStakesInfo');
    if (!stakingContract || !container) return;

    const stakes = await stakingContract.getUserStakes(userAddress);
    // Get current lockPeriod from contract
    const lockPeriod = await stakingContract.DEFAULT_LOCK_PERIOD();
    const activeStakes = stakes.filter(stake => !stake.hasClaimedReward);

    if (activeStakes.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No active stakes</p>';
        return;
    }

    const stakesHTML = await Promise.all(activeStakes.map(async (stake, index) => {
        const now = Math.floor(Date.now() / 1000);
        const endTime = Number(stake.startTime) + Number(lockPeriod);
        const timeLeft = endTime - now;
        const isReady = timeLeft <= 0;
        const statusColor = isReady ? 'text-[#00FFA3]' : 'text-yellow-500';

        return `
            <div class="border-b border-gray-700 last:border-0 pb-2">
                <div class="flex justify-between mb-1">
                    <span class="text-[#B4B4B4]">Pool #${Number(stake.poolId) + 1}</span>
                    <span class="font-medium text-white">${formatAmount(stake.amount)} PEPE</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-[#B4B4B4]">Status:</span>
                    <span class="${statusColor} flex items-center">
                        <span class="inline-block w-3 h-3 rounded-full mr-1 ${isReady ? 'bg-green-500' : 'bg-yellow-500'}"></span>
                        ${isReady ? 'READY' : 'LOCKED'}
                    </span>
                </div>
                ${timeLeft <= 0 ? `
                <div class="flex justify-end mt-2">
                    <button onclick="unstakeFromPool(${stake.poolId})" 
                        class="w-full mt-2 border border-[#00FFA3] text-[#00FFA3] py-1 rounded text-sm hover:bg-[#00FFA3] hover:text-black transition-colors">
                        Unstake
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    }));

    container.innerHTML = stakesHTML.join('');
}

// Event Listeners
window.addEventListener('load', async () => {
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectWallet();
    } else {
        // Load and display only active pools when not logged in
        try {
            console.log("Loading read-only view with active pools only");
            
            // Initialize provider without signing
            provider = new ethers.providers.Web3Provider(window.ethereum);
            
            // Get current network configuration
            const network = networkSwitcher.getCurrentNetwork();
            const currentConfig = networkSwitcher.getContractsConfig();
            
            // Initialize read-only contract instance
            stakingContract = new ethers.Contract(
                currentConfig.pepeStaking.address,
                currentConfig.pepeStaking.abi,
                provider
            );
            
            // Get pools and filter active ones
            const pools = await stakingContract.getAllPoolsInfo();
            const activePools = pools.filter(pool => pool.isActive);
            console.log(`Loaded ${activePools.length} active pools out of ${pools.length} total pools`);
            
            // Display active pools
            const poolsContainer = document.getElementById('poolsContainer');
            if (poolsContainer && activePools.length > 0) {
                const poolsHTML = await Promise.all(activePools.map(async (pool, index) => {
                    // Find original index in full pools array
                    const originalIndex = pools.findIndex(p => 
                        p.minStakeAmount.eq(pool.minStakeAmount) && 
                        p.rewardPerHolder.eq(pool.rewardPerHolder)
                    );
                    return createStaticPoolCard(pool, originalIndex >= 0 ? originalIndex : index);
                }));
                poolsContainer.innerHTML = poolsHTML.join('');
            } else if (poolsContainer) {
                poolsContainer.innerHTML = '<div class="col-span-3 text-center py-8 text-gray-400">No active pools available at the moment</div>';
            }
        } catch (error) {
            console.log("Error loading pools:", error);
        }
    }
    
    window.ethereum.on('accountsChanged', () => {
        window.location.reload();
    });
    window.ethereum.on('chainChanged', () => {
        window.location.reload();
    });
    startTimers();
});