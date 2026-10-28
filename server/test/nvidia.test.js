const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createNvidiaClient,
  generateNvidiaImage,
  generateChatResponse,
  getNvidiaConfig,
  getNvidiaErrorResponse,
  isNvidiaImageGenerationEnabled,
} = require('../src/services/nvidia');

const validEnv = {
  NVIDIA_API_KEY: 'test-nvidia-key',
  NVIDIA_MODEL: 'google/diffusiongemma-26b-a4b-it',
  NVIDIA_BASE_URL: 'https://integrate.api.nvidia.com/v1',
};

test('requires all NVIDIA chatbot settings', () => {
  assert.deepEqual(getNvidiaConfig({}).missing, [
    'NVIDIA_API_KEY',
    'NVIDIA_MODEL',
    'NVIDIA_BASE_URL',
  ]);
});

test('loads model, key, and base URL from backend configuration', () => {
  assert.deepEqual(getNvidiaConfig(validEnv), {
    ok: true,
    apiKey: validEnv.NVIDIA_API_KEY,
    model: validEnv.NVIDIA_MODEL,
    baseURL: validEnv.NVIDIA_BASE_URL,
  });
});

test('rejects the documented placeholder key', () => {
  const config = getNvidiaConfig({
    ...validEnv,
    NVIDIA_API_KEY: 'your_actual_nvidia_api_key',
  });
  assert.equal(config.ok, false);
  assert.deepEqual(config.missing, ['a valid NVIDIA_API_KEY (replace the example value)']);
});

test('image generation remains disabled unless explicitly enabled', () => {
  assert.equal(isNvidiaImageGenerationEnabled({}), false);
  assert.equal(isNvidiaImageGenerationEnabled({ NVIDIA_IMAGE_GENERATION_ENABLED: 'false' }), false);
  assert.equal(isNvidiaImageGenerationEnabled({ NVIDIA_IMAGE_GENERATION_ENABLED: 'true' }), true);
});

test('configures the direct NVIDIA API client with credentials and base URL', () => {
  const client = createNvidiaClient({
    apiKey: validEnv.NVIDIA_API_KEY,
    baseURL: validEnv.NVIDIA_BASE_URL,
  });
  assert.equal(client.baseURL, validEnv.NVIDIA_BASE_URL);
  assert.equal(client.apiKey, validEnv.NVIDIA_API_KEY);
});

test('sends documented image options to the NVIDIA Stable Diffusion endpoint', async () => {
  let request;
  const result = await generateNvidiaImage({
    apiKey: validEnv.NVIDIA_API_KEY,
    prompt: 'A handmade silk saree',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ finish_reason: 'SUCCESS', image: 'aW1hZ2U=', seed: 42 }),
      };
    },
  });

  assert.equal(
    request.url,
    'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium'
  );
  assert.equal(request.options.headers.Authorization, `Bearer ${validEnv.NVIDIA_API_KEY}`);
  assert.deepEqual(JSON.parse(request.options.body), {
    prompt: 'A handmade silk saree',
    aspect_ratio: '1:1',
    cfg_scale: 5,
    mode: 'text-to-image',
    model: 'sd3',
    negative_prompt: '',
    output_format: 'jpeg',
    seed: 0,
    steps: 50,
  });
  assert.deepEqual(result, { image: 'aW1hZ2U=', seed: 42 });
});

test('rejects NVIDIA image responses that are empty or filtered', async () => {
  for (const finishReason of ['ERROR', 'CONTENT_FILTERED']) {
    await assert.rejects(
      generateNvidiaImage({
        apiKey: validEnv.NVIDIA_API_KEY,
        prompt: 'A handmade silk saree',
        fetchImpl: async () => ({
          ok: true,
          json: async () => ({ finish_reason: finishReason, image: '' }),
        }),
      }),
      (error) => error.code === (finishReason === 'CONTENT_FILTERED' ? 'CONTENT_FILTERED' : 'EMPTY_IMAGE')
    );
  }
});

test('sends authenticated chat requests directly to the NVIDIA API', async () => {
  let request;
  const client = createNvidiaClient({
    apiKey: validEnv.NVIDIA_API_KEY,
    baseURL: validEnv.NVIDIA_BASE_URL,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'NVIDIA response' } }] }),
      };
    },
  });

  const payload = { model: validEnv.NVIDIA_MODEL, messages: [{ role: 'user', content: 'Hello' }] };
  const response = await client.chat.completions.create(payload);

  assert.equal(request.url, `${validEnv.NVIDIA_BASE_URL}/chat/completions`);
  assert.equal(request.options.headers.Authorization, `Bearer ${validEnv.NVIDIA_API_KEY}`);
  assert.deepEqual(JSON.parse(request.options.body), payload);
  assert.equal(response.choices[0].message.content, 'NVIDIA response');
});

test('sends configured model and conversation messages and returns its response', async () => {
  let request;
  const client = {
    chat: {
      completions: {
        create: async (body) => {
          request = body;
          return { choices: [{ message: { content: '  NVIDIA response  ' } }] };
        },
      },
    },
  };
  const messages = [
    { role: 'system', content: 'Be helpful.' },
    { role: 'user', content: 'Help design a saree.' },
  ];

  const reply = await generateChatResponse({
    client,
    model: validEnv.NVIDIA_MODEL,
    messages,
  });

  assert.equal(reply, 'NVIDIA response');
  assert.deepEqual(request, {
    model: validEnv.NVIDIA_MODEL,
    messages,
    chat_template_kwargs: { enable_thinking: true },
    max_tokens: 4096,
    temperature: 1,
    top_p: 0.95,
  });
});

test('maps authentication, model, quota, rate limit, and network errors safely', () => {
  assert.equal(getNvidiaErrorResponse({ status: 401 }).body.error, 'NVIDIA rejected the API key');
  assert.equal(getNvidiaErrorResponse({ status: 404 }).status, 503);
  assert.equal(
    getNvidiaErrorResponse({ status: 410 }).body.error,
    'The NVIDIA model endpoint is no longer available'
  );
  assert.equal(
    getNvidiaErrorResponse({ status: 429, message: 'insufficient quota' }).body.error,
    'NVIDIA API quota or credits are exhausted'
  );
  assert.equal(getNvidiaErrorResponse({ status: 429 }).status, 429);
  assert.equal(
    getNvidiaErrorResponse({ code: 'ECONNRESET' }).body.error,
    'Could not connect to NVIDIA. Check the server network and try again.'
  );
});
