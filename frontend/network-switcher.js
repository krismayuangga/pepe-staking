// Network Switcher Logic
class NetworkSwitcher {
    constructor() {
        // Kunci untuk menyimpan preferensi network di localStorage
        this.STORAGE_KEY = 'pepe_staking_network';
        
        // Default network
        this.currentNetwork = 'testnet';
        
        // Inisialisasi dari localStorage
        this.initFromStorage();
        
        // Setup UI event handler setelah DOM siap
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventHandlers();
            this.updateNetworkBadge();
        });
    }
    
    // Ambil jaringan dari localStorage
    initFromStorage() {
        const savedNetwork = localStorage.getItem(this.STORAGE_KEY);
        if (savedNetwork && (savedNetwork === 'testnet' || savedNetwork === 'mainnet')) {
            this.currentNetwork = savedNetwork;
        }
    }
    
    // Setup event handler untuk selector
    setupEventHandlers() {
        const selector = document.getElementById('network-selector');
        if (selector) {
            selector.value = this.currentNetwork;
            selector.addEventListener('change', (e) => {
                this.switchNetwork(e.target.value);
            });
        }
    }
    
    // Switch network
    switchNetwork(network) {
        if (network !== 'testnet' && network !== 'mainnet') return;
        
        this.currentNetwork = network;
        localStorage.setItem(this.STORAGE_KEY, network);
        
        // Update UI
        this.updateNetworkBadge();
        
        // Reload halaman untuk menerapkan perubahan
        window.location.reload();
    }
    
    // Update tampilan badge network
    updateNetworkBadge() {
        const badge = document.getElementById('network-badge');
        if (badge) {
            badge.textContent = this.currentNetwork.toUpperCase();
            badge.className = this.currentNetwork === 'mainnet' 
                ? 'ml-2 px-2 py-1 bg-green-600 text-white rounded text-xs' 
                : 'ml-2 px-2 py-1 bg-yellow-500 text-white rounded text-xs';
        }
    }
    
    // Getter untuk mendapatkan network saat ini
    getCurrentNetwork() {
        return this.currentNetwork;
    }
    
    // Getter untuk mendapatkan konfigurasi chain
    getNetworkConfig() {
        if (this.currentNetwork === 'mainnet') {
            return window.BSC_MAINNET_CONFIG || {
                chainId: '0x38',
                chainName: 'BSC Mainnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc.publicnode.com'],
                blockExplorerUrls: ['https://bscscan.com']
            };
        } else {
            return window.BSC_CONFIG || {
                chainId: '0x61',
                chainName: 'BSC Testnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
                blockExplorerUrls: ['https://testnet.bscscan.com']
            };
        }
    }
    
    // Getter untuk mendapatkan konfigurasi kontrak
    getContractsConfig() {
        return this.currentNetwork === 'mainnet' ? window.MAINNET_CONFIG : window.CONFIG;
    }
}

// Ini adalah cara yang benar untuk mendeklarasikan variabel global
window.networkSwitcher = new NetworkSwitcher();