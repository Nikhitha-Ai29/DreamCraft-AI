const getNvidiaConfig = (env = process.env) => {
  const required = ['NVIDIA_API_KEY', 'NVIDIA_MODEL', 'NVIDIA_BASE_URL'];
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) return { ok: false, missing };

  if (/your[_ -]?actual|your[_ -]?nvidia|placeholder|replace[_ -]?me/i.test(env.NVIDIA_API_KEY)) {
    return { ok: false, missing: ['a valid NVIDIA_API_KEY (replace the example value)'] };
  }

  try {
    const baseUrl = new URL(env.NVIDIA_BASE_URL);
    if (baseUrl.protocol !== 'https:') throw new Error('NVIDIA_BASE_URL must use HTTPS');
  } catch {
    return { ok: false, missing: ['a valid HTTPS NVIDIA_BASE_URL'] };
  }

  return {
    ok: true,
    apiKey: env.NVIDIA_API_KEY,
    model: env.NVIDIA_MODEL,
    baseURL: env.NVIDIA_BASE_URL,
  };
};

const isNvidiaImageGenerationEnabled = (env = process.env) =>
  env.NVIDIA_IMAGE_GENERATION_ENABLED?.toLowerCase() === 'true';

const createNvidiaClient = ({ apiKey, baseURL, fetchImpl = fetch }) => ({
  apiKey,
  baseURL,
  chat: {
    completions: {
      create: async (body) => {
        const response = await fetchImpl(`${baseURL.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000),
        });

        let data;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          const error = new Error(data?.error?.message || data?.detail || 'NVIDIA request failed');
          error.status = response.status;
          error.response = { status: response.status, data };
          throw error;
        }

        return data;
      },
    },
  },
});

const generateNvidiaImage = async ({
  apiKey,
  prompt,
  aspectRatio = '1:1',
  steps = 50,
  fetchImpl = fetch,
}) => {
  const response = await fetchImpl(
    'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        prompt,
        aspect_ratio: aspectRatio,
        cfg_scale: 5,
        mode: 'text-to-image',
        model: 'sd3',
        negative_prompt: '',
        output_format: 'jpeg',
        seed: 0,
        steps,
      }),
      signal: AbortSignal.timeout(120000),
    }
  );

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.detail || data?.error?.message || 'NVIDIA image request failed');
    error.status = response.status;
    error.response = { status: response.status, data };
    throw error;
  }

  if (data?.finish_reason !== 'SUCCESS' || typeof data.image !== 'string' || !data.image) {
    const error = new Error(
      data?.finish_reason === 'CONTENT_FILTERED'
        ? 'NVIDIA filtered this image prompt'
        : 'NVIDIA returned no generated image'
    );
    error.code = data?.finish_reason === 'CONTENT_FILTERED' ? 'CONTENT_FILTERED' : 'EMPTY_IMAGE';
    throw error;
  }

  return { image: data.image, seed: data.seed };
};

const generateChatResponse = async ({ client, model, messages }) => {
  const completion = await client.chat.completions.create({
    model,
    messages,
    chat_template_kwargs: { enable_thinking: true },
    max_tokens: 4096,
    temperature: 1,
    top_p: 0.95,
  });
  return completion.choices?.[0]?.message?.content?.trim() || '';
};

const getNvidiaErrorResponse = (err) => {
  const status = err.status || err.response?.status;
  const details = [err.message, err.error?.message, err.response?.data?.detail]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (status === 401 || status === 403) {
    return {
      status: 503,
      body: {
        error: 'NVIDIA rejected the API key',
        hint: 'Check NVIDIA_API_KEY in server/.env and confirm the key is active.',
      },
    };
  }

  if ([400, 404, 410, 422].includes(status)) {
    return {
      status: 503,
      body: {
        error: status === 410
          ? 'The NVIDIA model endpoint is no longer available'
          : 'NVIDIA rejected the model configuration',
        hint: 'Check that NVIDIA_MODEL and NVIDIA_BASE_URL match an active endpoint available to your account in the NVIDIA API catalog.',
      },
    };
  }

  if (status === 402 || (status === 429 && /quota|credit|billing|insufficient/.test(details))) {
    return {
      status: 429,
      body: {
        error: 'NVIDIA API quota or credits are exhausted',
        hint: 'Check your NVIDIA API catalog account usage, entitlement, and limits.',
      },
    };
  }

  if (status === 429) {
    return {
      status: 429,
      body: { error: 'NVIDIA rate limit reached. Please wait and try again.' },
    };
  }

  if (!status) {
    return {
      status: 502,
      body: { error: 'Could not connect to NVIDIA. Check the server network and try again.' },
    };
  }

  return {
    status: 502,
    body: { error: 'NVIDIA could not generate a response. Please try again.' },
  };
};

module.exports = {
  createNvidiaClient,
  generateNvidiaImage,
  generateChatResponse,
  getNvidiaConfig,
  getNvidiaErrorResponse,
  isNvidiaImageGenerationEnabled,
};
