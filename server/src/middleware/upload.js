const multer = require('multer');
const { randomUUID } = require('node:crypto');
const path = require('path');
const fs = require('fs');

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    fs.mkdir(dir, { recursive: true }, (error) => cb(error, dir));
  },
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const allowedTypes = new Map([
  ['.jpeg', new Set(['image/jpeg'])],
  ['.jpg', new Set(['image/jpeg'])],
  ['.png', new Set(['image/png'])],
  ['.gif', new Set(['image/gif'])],
  ['.webp', new Set(['image/webp'])],
  ['.mp4', new Set(['video/mp4'])],
  ['.mov', new Set(['video/quicktime'])],
  ['.webm', new Set(['video/webm'])],
  ['.ogg', new Set(['audio/ogg', 'video/ogg'])],
  ['.mp3', new Set(['audio/mpeg'])],
  ['.wav', new Set(['audio/wav', 'audio/x-wav'])],
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.get(ext)?.has(file.mimetype)) cb(null, true);
  else cb(new Error('File type not allowed'));
};

const isCloudinaryConfigured = (env = process.env) => {
  const values = [
    env.CLOUDINARY_CLOUD_NAME,
    env.CLOUDINARY_API_KEY,
    env.CLOUDINARY_API_SECRET,
  ];
  return values.every((value) =>
    value &&
    !/^(test(?:[-_].*)?|your_.*|changeme|replace.*)$/i.test(value.trim())
  );
};

const storage = () => {
  if (!isCloudinaryConfigured()) return localStorage;

  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const cloudStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: 'dreamcraft',
      resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm'],
    }),
  });
  return cloudStorage;
};

const upload = multer({
  storage: storage(),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

console.log(isCloudinaryConfigured()
  ? '📦 Using Cloudinary storage'
  : '📁 Using local file storage (configure valid Cloudinary credentials for production)');

module.exports = upload;
module.exports.isCloudinaryConfigured = isCloudinaryConfigured;
