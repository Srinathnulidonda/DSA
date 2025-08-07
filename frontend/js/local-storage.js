// Local Storage Service
class LocalStorageService {
    constructor() {
        this.prefix = 'dsa_learning_';
        this.version = '1.0';
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB
        this.compressionEnabled = true;

        this.initializeStorage();
    }

    initializeStorage() {
        // Check if localStorage is available
        if (!this.isLocalStorageAvailable()) {
            console.warn('localStorage is not available, using in-memory storage');
            this.fallbackStorage = new Map();
        }

        // Initialize version tracking
        const storedVersion = this.getRaw('version');
        if (storedVersion !== this.version) {
            this.migrateData(storedVersion, this.version);
            this.setRaw('version', this.version);
        }

        // Initialize storage monitoring
        this.monitorStorage();
    }

    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Core Storage Methods
    set(key, value, options = {}) {
        try {
            const data = {
                value,
                timestamp: Date.now(),
                expires: options.expires ? Date.now() + options.expires : null,
                compressed: false,
                version: this.version
            };

            let serialized = JSON.stringify(data);

            // Compress large data if enabled
            if (this.compressionEnabled && serialized.length > 1024) {
                try {
                    serialized = this.compress(serialized);
                    data.compressed = true;
                } catch (error) {
                    console.warn('Compression failed, storing uncompressed:', error);
                }
            }

            const storageKey = this.getKey(key);

            if (this.isLocalStorageAvailable()) {
                localStorage.setItem(storageKey, serialized);
            } else {
                this.fallbackStorage.set(storageKey, serialized);
            }

            // Update storage metrics
            this.updateStorageMetrics();

            return true;
        } catch (error) {
            console.error('Error setting localStorage item:', error);

            // Try to free up space and retry
            if (error.name === 'QuotaExceededError') {
                this.cleanup();
                try {
                    const storageKey = this.getKey(key);
                    const serialized = JSON.stringify({ value, timestamp: Date.now() });

                    if (this.isLocalStorageAvailable()) {
                        localStorage.setItem(storageKey, serialized);
                    } else {
                        this.fallbackStorage.set(storageKey, serialized);
                    }

                    return true;
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                }
            }

            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            const storageKey = this.getKey(key);
            let serialized;

            if (this.isLocalStorageAvailable()) {
                serialized = localStorage.getItem(storageKey);
            } else {
                serialized = this.fallbackStorage.get(storageKey);
            }

            if (!serialized) {
                return defaultValue;
            }

            let data;
            try {
                // Try to parse as new format first
                data = JSON.parse(serialized);

                // Handle old format (direct value)
                if (!data.hasOwnProperty('value')) {
                    return data; // Return old format directly
                }
            } catch (parseError) {
                // Handle compressed data
                try {
                    const decompressed = this.decompress(serialized);
                    data = JSON.parse(decompressed);
                } catch (decompressError) {
                    console.warn('Failed to parse stored data:', parseError);
                    return defaultValue;
                }
            }

            // Check expiration
            if (data.expires && Date.now() > data.expires) {
                this.remove(key);
                return defaultValue;
            }

            // Handle compressed data
            if (data.compressed) {
                try {
                    const decompressed = this.decompress(data.value);
                    data.value = JSON.parse(decompressed);
                } catch (error) {
                    console.warn('Failed to decompress data:', error);
                    return defaultValue;
                }
            }

            return data.value;
        } catch (error) {
            console.error('Error getting localStorage item:', error);
            return defaultValue;
        }
    }

    remove(key) {
        try {
            const storageKey = this.getKey(key);

            if (this.isLocalStorageAvailable()) {
                localStorage.removeItem(storageKey);
            } else {
                this.fallbackStorage.delete(storageKey);
            }

            this.updateStorageMetrics();
            return true;
        } catch (error) {
            console.error('Error removing localStorage item:', error);
            return false;
        }
    }

    exists(key) {
        const storageKey = this.getKey(key);

        if (this.isLocalStorageAvailable()) {
            return localStorage.getItem(storageKey) !== null;
        } else {
            return this.fallbackStorage.has(storageKey);
        }
    }

    clear() {
        try {
            if (this.isLocalStorageAvailable()) {
                // Only clear items with our prefix
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(this.prefix)) {
                        localStorage.removeItem(key);
                    }
                });
            } else {
                this.fallbackStorage.clear();
            }

            this.updateStorageMetrics();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }

    // Advanced Methods
    setTemporary(key, value, duration = 60000) { // Default 1 minute
        return this.set(key, value, { expires: duration });
    }

    getMultiple(keys) {
        const result = {};
        keys.forEach(key => {
            result[key] = this.get(key);
        });
        return result;
    }

    setMultiple(data) {
        const results = {};
        Object.entries(data).forEach(([key, value]) => {
            results[key] = this.set(key, value);
        });
        return results;
    }

    getAllKeys() {
        const keys = [];

        if (this.isLocalStorageAvailable()) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    keys.push(key.substring(this.prefix.length));
                }
            });
        } else {
            this.fallbackStorage.forEach((value, key) => {
                if (key.startsWith(this.prefix)) {
                    keys.push(key.substring(this.prefix.length));
                }
            });
        }

        return keys;
    }

    getAll() {
        const data = {};
        this.getAllKeys().forEach(key => {
            data[key] = this.get(key);
        });
        return data;
    }

    // Data Synchronization
    sync(remoteData) {
        const localData = this.getAll();
        const syncResult = {
            conflicts: [],
            updated: [],
            added: [],
            removed: []
        };

        // Find conflicts and updates
        Object.entries(remoteData).forEach(([key, remoteValue]) => {
            const localValue = localData[key];

            if (localValue === undefined) {
                this.set(key, remoteValue);
                syncResult.added.push(key);
            } else if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
                // Simple conflict resolution: remote wins
                this.set(key, remoteValue);
                syncResult.conflicts.push({
                    key,
                    local: localValue,
                    remote: remoteValue,
                    resolution: 'remote'
                });
            }
        });

        // Find removed items
        Object.keys(localData).forEach(key => {
            if (!(key in remoteData)) {
                this.remove(key);
                syncResult.removed.push(key);
            }
        });

        return syncResult;
    }

    backup() {
        const data = this.getAll();
        const backup = {
            version: this.version,
            timestamp: Date.now(),
            data
        };

        return JSON.stringify(backup);
    }

    restore(backupString) {
        try {
            const backup = JSON.parse(backupString);

            if (!backup.data) {
                throw new Error('Invalid backup format');
            }

            // Clear existing data
            this.clear();

            // Restore data
            Object.entries(backup.data).forEach(([key, value]) => {
                this.set(key, value);
            });

            return true;
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }

    // Storage Management
    getStorageInfo() {
        let used = 0;
        let itemCount = 0;

        if (this.isLocalStorageAvailable()) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(this.prefix)) {
                    used += localStorage.getItem(key).length;
                    itemCount++;
                }
            });
        } else {
            this.fallbackStorage.forEach((value, key) => {
                if (key.startsWith(this.prefix)) {
                    used += value.length;
                    itemCount++;
                }
            });
        }

        return {
            used: used,
            usedFormatted: this.formatBytes(used),
            available: this.maxStorageSize - used,
            availableFormatted: this.formatBytes(this.maxStorageSize - used),
            total: this.maxStorageSize,
            totalFormatted: this.formatBytes(this.maxStorageSize),
            itemCount,
            usagePercentage: Math.round((used / this.maxStorageSize) * 100)
        };
    }

    cleanup() {
        console.log('Starting localStorage cleanup...');

        const keys = this.getAllKeys();
        let removedCount = 0;
        let freedBytes = 0;

        // Remove expired items
        keys.forEach(key => {
            const data = this.getRawData(key);
            if (data && data.expires && Date.now() > data.expires) {
                const size = this.getItemSize(key);
                this.remove(key);
                removedCount++;
                freedBytes += size;
            }
        });

        // If still over limit, remove oldest items
        const storageInfo = this.getStorageInfo();
        if (storageInfo.usagePercentage > 90) {
            const itemsWithTimestamp = keys.map(key => ({
                key,
                timestamp: this.getRawData(key)?.timestamp || 0,
                size: this.getItemSize(key)
            })).sort((a, b) => a.timestamp - b.timestamp);

            for (const item of itemsWithTimestamp) {
                if (storageInfo.usagePercentage <= 80) break;

                this.remove(item.key);
                removedCount++;
                freedBytes += item.size;
            }
        }

        console.log(`Cleanup completed: ${removedCount} items removed, ${this.formatBytes(freedBytes)} freed`);

        return { removedCount, freedBytes };
    }

    // Utility Methods
    getKey(key) {
        return `${this.prefix}${key}`;
    }

    getRaw(key) {
        if (this.isLocalStorageAvailable()) {
            return localStorage.getItem(key);
        } else {
            return this.fallbackStorage.get(key);
        }
    }

    setRaw(key, value) {
        if (this.isLocalStorageAvailable()) {
            localStorage.setItem(key, value);
        } else {
            this.fallbackStorage.set(key, value);
        }
    }

    getRawData(key) {
        try {
            const serialized = this.getRaw(this.getKey(key));
            return serialized ? JSON.parse(serialized) : null;
        } catch (error) {
            return null;
        }
    }

    getItemSize(key) {
        const serialized = this.getRaw(this.getKey(key));
        return serialized ? serialized.length : 0;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Compression (simple implementation)
    compress(data) {
        // Simple run-length encoding for demonstration
        // In production, consider using a proper compression library
        return btoa(data);
    }

    decompress(data) {
        try {
            return atob(data);
        } catch (error) {
            return data; // Return as-is if decompression fails
        }
    }

    // Data Migration
    migrateData(oldVersion, newVersion) {
        console.log(`Migrating localStorage data from ${oldVersion} to ${newVersion}`);

        // Add migration logic here based on version changes
        switch (oldVersion) {
            case null:
            case undefined:
                // Fresh installation, no migration needed
                break;
            case '0.9':
                // Migrate from version 0.9 to 1.0
                this.migrateFrom09();
                break;
            default:
                console.warn(`No migration path defined for version ${oldVersion}`);
        }
    }

    migrateFrom09() {
        // Example migration logic
        const oldKeys = this.getAllKeys();
        oldKeys.forEach(key => {
            const value = this.get(key);
            if (value && typeof value === 'object' && !value.migrated) {
                // Add migration flag and update structure
                value.migrated = true;
                this.set(key, value);
            }
        });
    }

    // Storage Monitoring
    monitorStorage() {
        // Monitor storage usage
        setInterval(() => {
            const info = this.getStorageInfo();
            if (info.usagePercentage > 95) {
                console.warn('Storage usage critical:', info);
                this.cleanup();
            }
        }, 60000); // Check every minute

        // Monitor for storage events
        if (this.isLocalStorageAvailable()) {
            window.addEventListener('storage', (e) => {
                if (e.key && e.key.startsWith(this.prefix)) {
                    this.handleStorageChange(e);
                }
            });
        }
    }

    updateStorageMetrics() {
        const info = this.getStorageInfo();

        // Emit storage update event
        window.dispatchEvent(new CustomEvent('storageUpdate', {
            detail: info
        }));
    }

    handleStorageChange(event) {
        console.log('Storage changed externally:', event.key);

        // Emit storage change event
        window.dispatchEvent(new CustomEvent('storageChange', {
            detail: {
                key: event.key,
                oldValue: event.oldValue,
                newValue: event.newValue,
                url: event.url
            }
        }));
    }

    // Event Listeners
    addEventListener(eventType, handler) {
        window.addEventListener(eventType, handler);
    }

    removeEventListener(eventType, handler) {
        window.removeEventListener(eventType, handler);
    }
}