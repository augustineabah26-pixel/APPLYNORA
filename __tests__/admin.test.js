const request = require('supertest');
const app = require('../server');
const axios = require('axios');
const { saveNvidiaConfig, getNvidiaConfig } = require('../src/services/configStore');

jest.mock('axios');

describe('Admin NVIDIA API Tests', () => {

    beforeEach(() => {
        // Reset the config store state by assigning nulls
        const store = require('../src/services/configStore');
        store.saveNvidiaConfig(null, null);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('POST /api/admin/ai-providers/nvidia/test should reject unauthenticated requests', async () => {
        const response = await request(app)
            .post('/api/admin/ai-providers/nvidia/test')
            .send({ apiKey: 'fake-key', model: 'test-model' });

        expect(response.status).toBe(401);
    });

    test('POST /api/admin/ai-providers/nvidia/test should handle successful connection', async () => {
        axios.post.mockResolvedValueOnce({
            data: { choices: [{ message: { content: 'test' } }] }
        });

        const response = await request(app)
            .post('/api/admin/ai-providers/nvidia/test')
            .set('Authorization', 'Bearer admin-token')
            .send({ apiKey: 'valid-key', model: 'llama-3' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.model).toBe('llama-3');
        expect(response.body.latency).toBeDefined();
        // API key should NEVER be returned
        expect(response.body.apiKey).toBeUndefined();
    });

    test('POST /api/admin/ai-providers/nvidia/test should handle invalid API key', async () => {
        axios.post.mockRejectedValueOnce({
            response: { status: 401 }
        });

        const response = await request(app)
            .post('/api/admin/ai-providers/nvidia/test')
            .set('Authorization', 'Bearer admin-token')
            .send({ apiKey: 'invalid-key', model: 'llama-3' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid API key');
    });

    test('POST /api/admin/ai-providers/nvidia/config should securely save config on success', async () => {
        // Mock test success
        axios.post.mockResolvedValueOnce({ data: {} });

        const response = await request(app)
            .post('/api/admin/ai-providers/nvidia/config')
            .set('Authorization', 'Bearer admin-token')
            .send({ apiKey: 'valid-key-to-save', model: 'mistral' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        const savedConfig = getNvidiaConfig();
        expect(savedConfig.model).toBe('mistral');
        expect(savedConfig.isConfigured).toBe(true);
        expect(savedConfig.status).toBe('verified');
        // Ensure secret isn't exposed in config retrieval directly
        expect(savedConfig.apiKey).toBeUndefined();
    });

    test('POST /api/admin/ai-providers/nvidia/config should not save on failure', async () => {
        // Mock test failure
        axios.post.mockRejectedValueOnce({ response: { status: 401 } });

        const response = await request(app)
            .post('/api/admin/ai-providers/nvidia/config')
            .set('Authorization', 'Bearer admin-token')
            .send({ apiKey: 'invalid-key-to-save', model: 'mistral' });

        expect(response.status).toBe(400);

        const savedConfig = getNvidiaConfig();
        expect(savedConfig.model).toBe(null);
    });

    test('GET /api/admin/ai-providers/nvidia/config should not expose API key', async () => {
        axios.post.mockResolvedValueOnce({ data: {} });
        await request(app)
            .post('/api/admin/ai-providers/nvidia/config')
            .set('Authorization', 'Bearer admin-token')
            .send({ apiKey: 'my-super-secret', model: 'nemotron' });

        const response = await request(app)
            .get('/api/admin/ai-providers/nvidia/config')
            .set('Authorization', 'Bearer admin-token');

        expect(response.status).toBe(200);
        expect(response.body.model).toBe('nemotron');
        expect(response.body.isConfigured).toBe(true);
        // CRITICAL: NEVER EXPOSE API KEY
        expect(response.body.apiKey).toBeUndefined();
        expect(response.body.encryptedKey).toBeUndefined();
    });
});
