const getUploadedFileUrl = (req, file) => {
  if (typeof file.path === 'string' && /^https?:\/\//i.test(file.path)) {
    return file.path;
  }
  return `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(file.filename)}`;
};

module.exports = { getUploadedFileUrl };
