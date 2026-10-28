const test = require('node:test');
const assert = require('node:assert/strict');
const { isCloudinaryConfigured } = require('../src/middleware/upload');
const { getUploadedFileUrl } = require('../src/utils/upload-url');

test('uses local upload storage when Cloudinary credentials are missing or placeholders', () => {
  assert.equal(isCloudinaryConfigured({}), false);
  assert.equal(isCloudinaryConfigured({
    CLOUDINARY_CLOUD_NAME: 'test-cloud',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  }), false);
  assert.equal(isCloudinaryConfigured({
    CLOUDINARY_CLOUD_NAME: 'your_cloud_name',
    CLOUDINARY_API_KEY: 'api-key',
    CLOUDINARY_API_SECRET: 'api-secret',
  }), false);
});

test('uses Cloudinary only when all credentials are configured', () => {
  assert.equal(isCloudinaryConfigured({
    CLOUDINARY_CLOUD_NAME: 'dreamcraft',
    CLOUDINARY_API_KEY: '123456789',
    CLOUDINARY_API_SECRET: 'configured-secret',
  }), true);
  assert.equal(isCloudinaryConfigured({
    CLOUDINARY_CLOUD_NAME: 'dreamcraft',
    CLOUDINARY_API_KEY: '',
    CLOUDINARY_API_SECRET: 'configured-secret',
  }), false);
});

test('returns a browser-accessible URL for local files and preserves Cloudinary URLs', () => {
  const req = {
    protocol: 'http',
    get: () => 'localhost:5000',
  };
  assert.equal(
    getUploadedFileUrl(req, { filename: 'design image.png', path: 'C:\\uploads\\design image.png' }),
    'http://localhost:5000/uploads/design%20image.png'
  );
  assert.equal(
    getUploadedFileUrl(req, { filename: 'image.png', path: 'https://res.cloudinary.com/demo/image.png' }),
    'https://res.cloudinary.com/demo/image.png'
  );
});
