const { encrypt, decrypt } = require('../utils/encryption');

// In-memory store for simplicity, could be replaced with file or DB
const store = {
    nvidia: {
        encryptedKey: null,
        model: null,
        status: 'unconfigured',
        lastTested: null
    }
};

function saveNvidiaConfig(apiKey, model) {
    store.nvidia = {
        encryptedKey: encrypt(apiKey),
        model: model,
        status: 'verified',
        lastTested: new Date().toISOString()
    };
}

function getNvidiaConfig() {
    return {
        model: store.nvidia.model,
        status: store.nvidia.status,
        lastTested: store.nvidia.lastTested,
        isConfigured: !!store.nvidia.encryptedKey
    };
}

function getNvidiaKey() {
    if (!store.nvidia.encryptedKey) return null;
    return decrypt(store.nvidia.encryptedKey);
}

module.exports = {
    saveNvidiaConfig,
    getNvidiaConfig,
    getNvidiaKey
};
