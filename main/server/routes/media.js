import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
  createMediaAsset,
  getMediaAssets,
  getMediaAssetById,
  updateMediaAsset,
  deleteMediaAsset,
  bulkDeleteMedia,
  getFolders,
  getStorageStats,
} from '../database/cms-db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'application/pdf',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and PDFs are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// GET /api/admin/media/folders - Get all folders (must be before /:id)
router.get('/folders', async (req, res) => {
  try {
    const folders = await getFolders();
    res.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ message: 'Failed to fetch folders' });
  }
});

// GET /api/admin/media/stats - Get storage statistics (must be before /:id)
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStorageStats();
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/media - List media assets
router.get('/', async (req, res) => {
  try {
    const {
      folder,
      mimeType,
      search,
      tags,
      uploadedBy,
      dateFrom,
      dateTo,
      sortField,
      sortOrder,
      page,
      pageSize,
    } = req.query;

    const filters = {};
    if (folder !== undefined) filters.folder = folder || null;
    if (mimeType) filters.mimeType = mimeType;
    if (search) filters.search = search;
    if (tags) filters.tags = tags.split(',');
    if (uploadedBy) filters.uploadedBy = uploadedBy;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const sort = {};
    if (sortField) sort.field = sortField;
    if (sortOrder) sort.order = sortOrder;

    const pagination = {};
    if (page) pagination.page = parseInt(page);
    if (pageSize) pagination.pageSize = parseInt(pageSize);

    const result = await getMediaAssets(filters, sort, pagination);
    res.json(result);
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ message: 'Failed to fetch media' });
  }
});

// GET /api/admin/media/:id - Get media asset by ID
router.get('/:id', async (req, res) => {
  try {
    const asset = await getMediaAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Media asset not found' });
    }
    res.json(asset);
  } catch (error) {
    console.error('Get media asset error:', error);
    res.status(500).json({ message: 'Failed to fetch media asset' });
  }
});

// POST /api/admin/media - Upload single file
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { folder, alt, tags } = req.body;

    const assetData = {
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      alt: alt || null,
      folder: folder || null,
      tags: tags ? JSON.parse(tags) : [],
    };

    // Get image dimensions if it's an image
    if (req.file.mimetype.startsWith('image/')) {
      // You can use sharp or image-size library here
      // For now, we'll skip dimensions
      assetData.width = null;
      assetData.height = null;
    }

    const asset = await createMediaAsset(assetData, req.user.userId);
    res.status(201).json(asset);
  } catch (error) {
    console.error('Upload media error:', error);
    
    // Clean up uploaded file if database insert fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }
    
    res.status(500).json({ message: 'Failed to upload file' });
  }
});

// POST /api/admin/media/bulk - Upload multiple files
router.post('/bulk', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { folder } = req.body;
    const uploadedAssets = [];

    for (const file of req.files) {
      const assetData = {
        filename: file.filename,
        originalFilename: file.originalname,
        url: `/uploads/${file.filename}`,
        mimeType: file.mimetype,
        size: file.size,
        folder: folder || null,
        tags: [],
      };

      const asset = await createMediaAsset(assetData, req.user.userId);
      uploadedAssets.push(asset);
    }

    res.status(201).json(uploadedAssets);
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ message: 'Failed to upload files' });
  }
});

// PATCH /api/admin/media/:id - Update media asset metadata
router.patch('/:id', async (req, res) => {
  try {
    const { alt, caption, tags, folder } = req.body;

    const updates = {};
    if (alt !== undefined) updates.alt = alt;
    if (caption !== undefined) updates.caption = caption;
    if (tags !== undefined) updates.tags = tags;
    if (folder !== undefined) updates.folder = folder;

    const updatedAsset = await updateMediaAsset(req.params.id, updates);
    if (!updatedAsset) {
      return res.status(404).json({ message: 'Media asset not found' });
    }

    res.json(updatedAsset);
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ message: 'Failed to update media asset' });
  }
});

// DELETE /api/admin/media/:id - Delete media asset
router.delete('/:id', async (req, res) => {
  try {
    const asset = await getMediaAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Media asset not found' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../../public', asset.url);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete file from filesystem:', error);
    }

    await deleteMediaAsset(req.params.id);
    res.json({ message: 'Media asset deleted' });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ message: 'Failed to delete media asset' });
  }
});

// POST /api/admin/media/bulk/delete - Bulk delete media assets
router.post('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    // Get all assets to delete files from filesystem
    for (const id of ids) {
      const asset = await getMediaAssetById(id);
      if (asset) {
        const filePath = path.join(__dirname, '../../public', asset.url);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error('Failed to delete file:', error);
        }
      }
    }

    await bulkDeleteMedia(ids);
    res.json({ message: `${ids.length} media asset(s) deleted` });
  } catch (error) {
    console.error('Bulk delete media error:', error);
    res.status(500).json({ message: 'Failed to delete media assets' });
  }
});

// POST /api/admin/media/bulk/move - Move media assets to folder
router.post('/bulk/move', async (req, res) => {
  try {
    const { ids, folder } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    for (const id of ids) {
      await updateMediaAsset(id, { folder });
    }

    res.json({ message: `${ids.length} media asset(s) moved` });
  } catch (error) {
    console.error('Bulk move error:', error);
    res.status(500).json({ message: 'Failed to move media assets' });
  }
});

// POST /api/admin/media/folders - Create folder (virtual, no filesystem operation)
router.post('/folders', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    // Folders are virtual in our system, just return success
    res.status(201).json({ message: 'Folder created', name });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: 'Failed to create folder' });
  }
});

// DELETE /api/admin/media/folders/:name - Delete folder
router.delete('/folders/:name', async (req, res) => {
  try {
    const folderName = decodeURIComponent(req.params.name);
    
    // Check if folder has assets
    const result = await getMediaAssets({ folder: folderName }, {}, { pageSize: 1 });
    if (result.total > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete folder with assets. Move or delete assets first.' 
      });
    }

    res.json({ message: 'Folder deleted' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ message: 'Failed to delete folder' });
  }
});

// POST /api/admin/media/:id/optimize - Optimize image (placeholder)
router.post('/:id/optimize', async (req, res) => {
  try {
    const asset = await getMediaAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Media asset not found' });
    }

    // TODO: Implement image optimization with sharp
    res.json({ message: 'Image optimization not yet implemented', asset });
  } catch (error) {
    console.error('Optimize image error:', error);
    res.status(500).json({ message: 'Failed to optimize image' });
  }
});

// POST /api/admin/media/:id/responsive - Generate responsive versions (placeholder)
router.post('/:id/responsive', async (req, res) => {
  try {
    const asset = await getMediaAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Media asset not found' });
    }

    // TODO: Implement responsive image generation with sharp
    res.json({ message: 'Responsive generation not yet implemented', asset });
  } catch (error) {
    console.error('Generate responsive error:', error);
    res.status(500).json({ message: 'Failed to generate responsive versions' });
  }
});

export default router;
