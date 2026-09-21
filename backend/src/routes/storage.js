const { Router } = require('express');
const { requireAuth } = require('../middleware/validate');
const { getUserId } = require('../middleware/authUser');
const { createUploadUrl } = require('../services/storage');

const router = Router();

router.post('/storage/upload-url', requireAuth, async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { folder, filename, contentType, size } = req.body || {};

    if (!folder || !filename || !contentType) {
      return res.status(400).json({ message: 'folder, filename, and contentType are required' });
    }
    if (size && Number(size) > 10 * 1024 * 1024) {
      return res.status(400).json({ message: 'File is too large (max 10MB)' });
    }

    const payload = await createUploadUrl({
      folder,
      userId,
      filename,
      contentType,
    });

    return res.json(payload);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
