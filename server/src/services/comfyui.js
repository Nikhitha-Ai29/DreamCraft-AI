const { randomInt, randomUUID } = require('node:crypto');

const DEFAULT_BASE_URL = 'http://127.0.0.1:8188';
const DEFAULT_CHECKPOINT = 'v1-5-pruned-emaonly.safetensors';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const getComfyUiConfig = (env = process.env) => {
  const baseUrl = env.COMFYUI_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const checkpoint = env.COMFYUI_CHECKPOINT?.trim() || DEFAULT_CHECKPOINT;

  try {
    const parsed = new URL(baseUrl);
    if (
      parsed.protocol !== 'http:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
      parsed.username ||
      parsed.password
    ) {
      return { ok: false, error: 'ComfyUI must be configured with a local HTTP address.' };
    }
    if (!/^[\w.-]+\.safetensors$/.test(checkpoint)) {
      return { ok: false, error: 'COMFYUI_CHECKPOINT must be a .safetensors filename.' };
    }
    return { ok: true, baseUrl: parsed.origin, checkpoint };
  } catch {
    return { ok: false, error: 'COMFYUI_BASE_URL must be a valid local HTTP URL.' };
  }
};

const createWorkflow = ({ checkpoint, prompt, seed = randomInt(1, 2 ** 48) }) => ({
  '3': {
    class_type: 'KSampler',
    inputs: {
      seed,
      steps: 12,
      cfg: 7,
      sampler_name: 'dpmpp_2m',
      scheduler: 'karras',
      denoise: 1,
      model: ['4', 0],
      positive: ['6', 0],
      negative: ['7', 0],
      latent_image: ['5', 0],
    },
  },
  '4': {
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: checkpoint },
  },
  '5': {
    class_type: 'EmptyLatentImage',
    inputs: { width: 512, height: 512, batch_size: 1 },
  },
  '6': {
    class_type: 'CLIPTextEncode',
    inputs: {
      text: `Premium handmade artisan product concept. ${prompt}. Photorealistic product photography, detailed craftsmanship, elegant presentation, warm studio lighting, clean neutral background.`,
      clip: ['4', 1],
    },
  },
  '7': {
    class_type: 'CLIPTextEncode',
    inputs: { text: 'blurry, low quality, distorted, watermark, text', clip: ['4', 1] },
  },
  '8': {
    class_type: 'VAEDecode',
    inputs: { samples: ['3', 0], vae: ['4', 2] },
  },
  '9': {
    class_type: 'SaveImage',
    inputs: { filename_prefix: 'DreamCraft', images: ['8', 0] },
  },
});

const makeError = (code, message) => Object.assign(new Error(message), { code });

const responseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const isImage = (buffer, contentType) => {
  if (contentType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }
  if (contentType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === 'image/webp') {
    return buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
};

const generateComfyUiImage = async ({
  config,
  prompt,
  fetchImpl = fetch,
  pollIntervalMs = 1000,
  timeoutMs = 180000,
}) => {
  const clientId = randomUUID();
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        prompt: createWorkflow({ checkpoint: config.checkpoint, prompt }),
        client_id: clientId,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw makeError('COMFYUI_UNAVAILABLE', error.name === 'TimeoutError'
      ? 'ComfyUI did not respond in time'
      : 'Could not connect to ComfyUI');
  }
  const queued = await responseJson(response);
  if (!response.ok || typeof queued?.prompt_id !== 'string') {
    throw makeError('COMFYUI_REJECTED', 'ComfyUI could not queue the image workflow');
  }

  const deadline = Date.now() + timeoutMs;
  let image;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    let historyResponse;
    try {
      historyResponse = await fetchImpl(
        `${config.baseUrl}/history/${encodeURIComponent(queued.prompt_id)}`,
        { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) }
      );
    } catch {
      throw makeError('COMFYUI_UNAVAILABLE', 'Could not read the ComfyUI generation result');
    }
    if (!historyResponse.ok) {
      throw makeError('COMFYUI_UNAVAILABLE', 'Could not read the ComfyUI generation result');
    }
    const history = await responseJson(historyResponse);
    const outputs = history?.[queued.prompt_id]?.outputs;
    if (!outputs) continue;
    image = Object.values(outputs)
      .flatMap((output) => output.images || [])
      .find((item) => typeof item.filename === 'string');
    if (image) break;
  }
  if (!image) throw makeError('COMFYUI_TIMEOUT', 'ComfyUI image generation timed out');

  const imageUrl = new URL('/view', config.baseUrl);
  imageUrl.search = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder || '',
    type: image.type || 'output',
  });
  let imageResponse;
  try {
    imageResponse = await fetchImpl(imageUrl, { signal: AbortSignal.timeout(30000) });
  } catch {
    throw makeError('COMFYUI_UNAVAILABLE', 'Could not download the generated image from ComfyUI');
  }
  if (!imageResponse.ok) {
    throw makeError('COMFYUI_UNAVAILABLE', 'Could not download the generated image from ComfyUI');
  }
  const contentType = imageResponse.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  if (
    buffer.length > MAX_IMAGE_BYTES ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(contentType) ||
    !isImage(buffer, contentType)
  ) {
    throw makeError('COMFYUI_INVALID_IMAGE', 'ComfyUI returned an unsupported or oversized image');
  }
  const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.slice('image/'.length);
  return { buffer, extension };
};

const getComfyUiErrorResponse = (error) => {
  if (error.code === 'COMFYUI_TIMEOUT') {
    return { status: 504, body: { error: 'Local image generation timed out. Check ComfyUI and try again.' } };
  }
  if (error.code === 'COMFYUI_REJECTED') {
    return {
      status: 502,
      body: {
        error: 'ComfyUI rejected the workflow. Check the checkpoint filename and ComfyUI terminal.',
      },
    };
  }
  if (error.code === 'COMFYUI_INVALID_IMAGE') {
    return { status: 502, body: { error: 'ComfyUI returned an invalid image.' } };
  }
  return {
    status: 503,
    body: {
      error: 'Could not connect to local ComfyUI.',
      hint: 'Start ComfyUI with its API enabled and check COMFYUI_BASE_URL in server/.env.',
    },
  };
};

module.exports = {
  createWorkflow,
  generateComfyUiImage,
  getComfyUiConfig,
  getComfyUiErrorResponse,
};
