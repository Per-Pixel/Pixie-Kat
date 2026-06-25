import express from 'express';
import {
  createPage,
  getPages,
  getPageById,
  getPageBySlug,
  updatePage,
  updatePageStatus,
  deletePage,
  restorePage,
  permanentlyDeletePage,
  duplicatePage,
  getTrash,
  emptyTrash,
  bulkUpdateStatus,
  bulkDelete,
  bulkRestore,
  validateSlug,
} from '../database/cms-db.js';

const router = express.Router();

// GET /api/admin/pages/trash - Get trashed pages (must be before /:id)
router.get('/trash', async (req, res) => {
  try {
    const { page, pageSize } = req.query;

    const pagination = {};
    if (page) pagination.page = parseInt(page);
    if (pageSize) pagination.pageSize = parseInt(pageSize);

    const result = await getTrash(pagination);
    res.json(result);
  } catch (error) {
    console.error('Get trash error:', error);
    res.status(500).json({ message: 'Failed to fetch trash' });
  }
});

// GET /api/admin/pages/validate-slug - Validate slug availability (must be before /:id)
router.get('/validate-slug', async (req, res) => {
  try {
    const { slug, excludeId } = req.query;

    if (!slug) {
      return res.status(400).json({ message: 'Slug is required' });
    }

    const available = await validateSlug(slug, excludeId);
    res.json({ available });
  } catch (error) {
    console.error('Validate slug error:', error);
    res.status(500).json({ message: 'Failed to validate slug' });
  }
});

// GET /api/admin/pages - List pages with filters
router.get('/', async (req, res) => {
  try {
    const { status, author, search, dateFrom, dateTo, sortField, sortOrder, page, pageSize } = req.query;

    const filters = {};
    if (status) filters.status = status.split(',');
    if (author) filters.author = author;
    if (search) filters.search = search;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const sort = {};
    if (sortField) sort.field = sortField;
    if (sortOrder) sort.order = sortOrder;

    const pagination = {};
    if (page) pagination.page = parseInt(page);
    if (pageSize) pagination.pageSize = parseInt(pageSize);

    const result = await getPages(filters, sort, pagination);
    res.json(result);
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ message: 'Failed to fetch pages' });
  }
});

// GET /api/admin/pages/:id - Get page by ID
router.get('/:id', async (req, res) => {
  try {
    const page = await getPageById(req.params.id);
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ message: 'Failed to fetch page' });
  }
});

// GET /api/admin/pages/slug/:slug - Get page by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const page = await getPageBySlug(req.params.slug);
    if (!page) {
      return res.status(404).json({ message: 'Page not found' });
    }
    res.json(page);
  } catch (error) {
    console.error('Get page by slug error:', error);
    res.status(500).json({ message: 'Failed to fetch page' });
  }
});

// POST /api/admin/pages - Create new page
router.post('/', async (req, res) => {
  try {
    const { title, slug, status, visibility, schedule, seo, sections } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Generate slug if not provided
    let pageSlug = slug;
    if (!pageSlug) {
      pageSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    // Validate slug uniqueness
    const isSlugAvailable = await validateSlug(pageSlug);
    if (!isSlugAvailable) {
      return res.status(400).json({ message: 'Slug already exists' });
    }

    const pageData = {
      title,
      slug: pageSlug,
      status: status || 'draft',
      visibility,
      schedule,
      seo,
      sections: sections || [],
    };

    const newPage = await createPage(pageData, req.user.userId);
    res.status(201).json(newPage);
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json({ message: 'Failed to create page' });
  }
});

// PUT /api/admin/pages/:id - Update page
router.put('/:id', async (req, res) => {
  try {
    const { title, slug, status, visibility, schedule, seo, sections } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) {
      // Validate slug uniqueness if changed
      const isSlugAvailable = await validateSlug(slug, req.params.id);
      if (!isSlugAvailable) {
        return res.status(400).json({ message: 'Slug already exists' });
      }
      updates.slug = slug;
    }
    if (status !== undefined) updates.status = status;
    if (visibility !== undefined) updates.visibility = visibility;
    if (schedule !== undefined) updates.schedule = schedule;
    if (seo !== undefined) updates.seo = seo;
    if (sections !== undefined) updates.sections = sections;

    const updatedPage = await updatePage(req.params.id, updates);
    if (!updatedPage) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.json(updatedPage);
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ message: 'Failed to update page' });
  }
});

// PATCH /api/admin/pages/:id/status - Update page status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const updatedPage = await updatePageStatus(req.params.id, status);
    if (!updatedPage) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.json(updatedPage);
  } catch (error) {
    console.error('Update page status error:', error);
    res.status(500).json({ message: error.message || 'Failed to update page status' });
  }
});

// DELETE /api/admin/pages/:id - Move page to trash
router.delete('/:id', async (req, res) => {
  try {
    const deletedPage = await deletePage(req.params.id, req.user.userId);
    if (!deletedPage) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.json({ message: 'Page moved to trash', page: deletedPage });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({ message: 'Failed to delete page' });
  }
});

// POST /api/admin/pages/:id/restore - Restore page from trash
router.post('/:id/restore', async (req, res) => {
  try {
    const restoredPage = await restorePage(req.params.id);
    if (!restoredPage) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.json(restoredPage);
  } catch (error) {
    console.error('Restore page error:', error);
    res.status(500).json({ message: 'Failed to restore page' });
  }
});

// DELETE /api/admin/pages/:id/permanent - Permanently delete page
router.delete('/:id/permanent', async (req, res) => {
  try {
    await permanentlyDeletePage(req.params.id);
    res.json({ message: 'Page permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ message: 'Failed to permanently delete page' });
  }
});

// POST /api/admin/pages/:id/duplicate - Duplicate page
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { title } = req.body;
    const originalPage = await getPageById(req.params.id);
    
    if (!originalPage) {
      return res.status(404).json({ message: 'Page not found' });
    }

    const newTitle = title || `${originalPage.title} (Copy)`;
    const duplicatedPage = await duplicatePage(req.params.id, newTitle, req.user.userId);

    res.status(201).json(duplicatedPage);
  } catch (error) {
    console.error('Duplicate page error:', error);
    res.status(500).json({ message: 'Failed to duplicate page' });
  }
});

// POST /api/admin/pages/trash/empty - Empty trash
router.post('/trash/empty', async (req, res) => {
  try {
    await emptyTrash();
    res.json({ message: 'Trash emptied successfully' });
  } catch (error) {
    console.error('Empty trash error:', error);
    res.status(500).json({ message: 'Failed to empty trash' });
  }
});

// POST /api/admin/pages/bulk/status - Bulk update status
router.post('/bulk/status', async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    await bulkUpdateStatus(ids, status);
    res.json({ message: `${ids.length} page(s) updated` });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({ message: error.message || 'Failed to update pages' });
  }
});

// POST /api/admin/pages/bulk/delete - Bulk delete pages
router.post('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    await bulkDelete(ids, req.user.userId);
    res.json({ message: `${ids.length} page(s) moved to trash` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Failed to delete pages' });
  }
});

// POST /api/admin/pages/bulk/restore - Bulk restore pages
router.post('/bulk/restore', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    await bulkRestore(ids);
    res.json({ message: `${ids.length} page(s) restored` });
  } catch (error) {
    console.error('Bulk restore error:', error);
    res.status(500).json({ message: 'Failed to restore pages' });
  }
});

export default router;
