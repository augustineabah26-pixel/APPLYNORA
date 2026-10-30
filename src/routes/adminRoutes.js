const express = require('express');
const router = express.Router();
const axios = require('axios');
const { saveNvidiaConfig, getNvidiaConfig, getNvidiaKey } = require('../services/configStore');

// Simple authentication middleware for admin
const requireAdmin = (req, res, next) => {
    // In a real app, this would check JWT or session
    // Enforce authorization always to prevent unauthorized access
    if (req.headers.authorization !== 'Bearer admin-token') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

const testNvidiaConnection = async (apiKey, model) => {
    try {
        const startTime = Date.now();
        // A minimal request to a known supported endpoint
        const response = await axios.post(
            'https://integrate.api.nvidia.com/v1/chat/completions',
            {
                model: model,
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 5
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000 // 5 second short timeout
            }
        );
        const latency = Date.now() - startTime;

        return {
            success: true,
            latency,
            model,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        let failureReason = 'NVIDIA service error';
        if (error.response) {
            if (error.response.status === 401) failureReason = 'Invalid API key';
            else if (error.response.status === 403) failureReason = 'Insufficient permissions';
            else if (error.response.status === 404) failureReason = 'Model unavailable';
            else if (error.response.status === 429) failureReason = 'Rate limit exceeded';
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            failureReason = 'Network or timeout error';
        }

        return {
            success: false,
            error: failureReason
        };
    }
};

router.post('/ai-providers/nvidia/test', requireAdmin, async (req, res) => {
    const { apiKey, model } = req.body;

    if (!apiKey || !model) {
        return res.status(400).json({ error: 'API key and model are required' });
    }

    const result = await testNvidiaConnection(apiKey, model);

    // Never log or return the API key
    res.json(result);
});

router.post('/ai-providers/nvidia/config', requireAdmin, async (req, res) => {
    const { apiKey, model } = req.body;

    if (!apiKey || !model) {
        return res.status(400).json({ error: 'API key and model are required' });
    }

    // Verify before saving to ensure only a valid configuration is saved
    const result = await testNvidiaConnection(apiKey, model);
    if (!result.success) {
         return res.status(400).json({ error: 'Verification failed. Configuration not saved.', details: result });
    }

    saveNvidiaConfig(apiKey, model);
    res.json({ success: true, message: 'Configuration securely saved' });
});

router.get('/ai-providers/nvidia/config', requireAdmin, (req, res) => {
    const config = getNvidiaConfig();
    res.json(config);
});

router.post('/ai-providers/nvidia/test-saved', requireAdmin, async (req, res) => {
    const apiKey = getNvidiaKey();
    const config = getNvidiaConfig();

    if (!apiKey || !config.model) {
        return res.status(400).json({ error: 'No configuration saved' });
    }

    const result = await testNvidiaConnection(apiKey, config.model);
    res.json(result);
});

module.exports = router;
