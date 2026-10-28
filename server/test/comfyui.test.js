const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createWorkflow,
  generateComfyUiImage,
  getComfyUiConfig,
  getComfyUiErrorResponse,
} = require('../src/services/comfyui');

const config = {
  baseUrl: 'http://127.0.0.1:8188',
  checkpoint: 'v1-5-pruned-emaonly.safetensors',
};

test('defaults local ComfyUI settings and rejects non-local service URLs', () => {
  assert.deepEqual(getComfyUiConfig({}), { ok: true, ...config });
  assert.equal(getComfyUiConfig({ COMFYUI_BASE_URL: 'https://example.com' }).ok, false);
  assert.equal(getComfyUiConfig({ COMFYUI_BASE_URL: 'http://192.168.1.10:8188' }).ok, false);
  assert.equal(getComfyUiConfig({ COMFYUI_CHECKPOINT: '../outside.safetensors' }).ok, false);
});

test('builds a lightweight ComfyUI workflow using the requested prompt and checkpoint', () => {
  const workflow = createWorkflow({
    checkpoint: config.checkpoint,
    prompt: 'handmade blue ceramic vase',
    seed: 123,
  });
  assert.equal(workflow['4'].inputs.ckpt_name, config.checkpoint);
  assert.match(workflow['6'].inputs.text, /handmade blue ceramic vase/);
  assert.equal(workflow['3'].inputs.seed, 123);
  assert.equal(workflow['3'].inputs.steps, 12);
  assert.equal(workflow['5'].inputs.width, 512);
  assert.equal(workflow['5'].inputs.height, 512);
  assert.equal(workflow['9'].class_type, 'SaveImage');
});

test('submits locally, polls for completion, and downloads the real image bytes', async () => {
  const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const calls = [];
  const generated = await generateComfyUiImage({
    config,
    prompt: 'handmade blue ceramic vase',
    pollIntervalMs: 0,
    fetchImpl: async (url, options = {}) => {
      const parsed = new URL(url);
      calls.push({ url: parsed, options });
      if (parsed.pathname === '/prompt') {
        const body = JSON.parse(options.body);
        assert.match(body.prompt['6'].inputs.text, /handmade blue ceramic vase/);
        return Response.json({ prompt_id: 'local-prompt-1' });
      }
      if (parsed.pathname === '/history/local-prompt-1') {
        return Response.json({
          'local-prompt-1': {
            outputs: { '9': { images: [{ filename: 'DreamCraft.png', subfolder: '', type: 'output' }] } },
          },
        });
      }
      if (parsed.pathname === '/view') {
        return new Response(imageBytes, { headers: { 'Content-Type': 'image/png' } });
      }
      throw new Error(`Unexpected request: ${parsed.href}`);
    },
  });

  assert.deepEqual(calls.map(({ url }) => url.origin), [
    'http://127.0.0.1:8188',
    'http://127.0.0.1:8188',
    'http://127.0.0.1:8188',
  ]);
  assert.equal(generated.extension, 'png');
  assert.deepEqual(generated.buffer, imageBytes);
});

test('maps unavailable ComfyUI failures to a safe setup hint', () => {
  const mapped = getComfyUiErrorResponse(Object.assign(new Error('connection refused'), {
    code: 'COMFYUI_UNAVAILABLE',
  }));
  assert.equal(mapped.status, 503);
  assert.match(mapped.body.hint, /Start ComfyUI/);
  assert.equal(JSON.stringify(mapped).includes('connection refused'), false);
});
