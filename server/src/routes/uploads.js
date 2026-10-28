const router = require('express').Router();
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getUploadedFileUrl } = require('../utils/upload-url');

// POST /api/uploads/single
router.post('/single', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = getUploadedFileUrl(req, req.file);
  res.json({ url, filename: req.file.filename, mimetype: req.file.mimetype });
});

// POST /api/uploads/multiple
router.post('/multiple', auth, upload.array('files', 10), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  const files = req.files.map(f => ({
    url: getUploadedFileUrl(req, f),
    filename: f.filename,
    mimetype: f.mimetype,
  }));
  res.json(files);
});

module.exports = router;
