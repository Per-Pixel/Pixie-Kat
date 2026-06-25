import pool from '../database-postgres.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize CMS tables
export const initCmsTables = async () => {
  const client = await pool.connect();
  try {
    const schemaSQL = await fs.readFile(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );
    
    await client.query(schemaSQL);
    console.log('✓ CMS tables initialized successfully');
  } catch (error) {
    console.error('CMS table initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Page operations
export const createPage = async (pageData, authorId) => {
  const {
    title,
    slug,
    status = 'draft',
    visibility = {},
    schedule = null,
    seo = {},
    sections = [],
  } = pageData;

  const defaultVisibility = {
    showInNav: true,
    showInSitemap: true,
    allowSearchEngines: true,
    requireAuth: false,
    passwordProtected: false,
    devices: { desktop: true, tablet: true, mobile: true },
    ...visibility,
  };

  const defaultSeo = {
    title: title,
    description: '',
    keywords: [],
    ...seo,
  };

  const metadata = {
    author: authorId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  const result = await pool.query(
    `INSERT INTO pages (
      title, slug, status, visibility, schedule, seo, sections, metadata, author_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      title,
      slug,
      status,
      JSON.stringify(defaultVisibility),
      schedule ? JSON.stringify(schedule) : null,
      JSON.stringify(defaultSeo),
      JSON.stringify(sections),
      JSON.stringify(metadata),
      authorId,
    ]
  );

  return result.rows[0];
};

export const getPages = async (filters = {}, sort = {}, pagination = {}) => {
  const { status, author, search, dateFrom, dateTo } = filters;
  const { field = 'updated_at', order = 'desc' } = sort;
  const { page = 1, pageSize = 20 } = pagination;

  let query = 'SELECT * FROM pages WHERE trashed_at IS NULL';
  const params = [];
  let paramCount = 1;

  if (status && status.length > 0) {
    query += ` AND status = ANY($${paramCount})`;
    params.push(status);
    paramCount++;
  }

  if (author) {
    query += ` AND author_id = $${paramCount}`;
    params.push(author);
    paramCount++;
  }

  if (search) {
    query += ` AND (title ILIKE $${paramCount} OR slug ILIKE $${paramCount})`;
    params.push(`%${search}%`);
    paramCount++;
  }

  if (dateFrom) {
    query += ` AND created_at >= $${paramCount}`;
    params.push(dateFrom);
    paramCount++;
  }

  if (dateTo) {
    query += ` AND created_at <= $${paramCount}`;
    params.push(dateTo);
    paramCount++;
  }

  // Count total
  const countResult = await pool.query(
    query.replace('SELECT *', 'SELECT COUNT(*)'),
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Add sorting and pagination
  const validFields = ['title', 'created_at', 'updated_at', 'published_at'];
  const sortField = validFields.includes(field) ? field : 'updated_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  query += ` ORDER BY ${sortField} ${sortOrder}`;
  query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await pool.query(query, params);

  return {
    pages: result.rows,
    total,
    page,
    pageSize,
  };
};

export const getPageById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM pages WHERE id = $1 AND trashed_at IS NULL',
    [id]
  );
  return result.rows[0] || null;
};

export const getPageBySlug = async (slug) => {
  const result = await pool.query(
    'SELECT * FROM pages WHERE slug = $1 AND trashed_at IS NULL',
    [slug]
  );
  return result.rows[0] || null;
};

export const updatePage = async (id, updates) => {
  const allowedFields = ['title', 'slug', 'status', 'visibility', 'schedule', 'seo', 'sections'];
  const setClause = [];
  const params = [];
  let paramCount = 1;

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramCount}`);
      const value = typeof updates[key] === 'object' 
        ? JSON.stringify(updates[key]) 
        : updates[key];
      params.push(value);
      paramCount++;
    }
  });

  if (setClause.length === 0) {
    throw new Error('No valid fields to update');
  }

  params.push(id);
  const query = `
    UPDATE pages 
    SET ${setClause.join(', ')}
    WHERE id = $${paramCount} AND trashed_at IS NULL
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

export const updatePageStatus = async (id, status) => {
  const validStatuses = ['published', 'hidden', 'draft', 'scheduled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  const updates = { status };
  if (status === 'published') {
    updates.published_at = new Date().toISOString();
  }

  const result = await pool.query(
    `UPDATE pages 
     SET status = $1, published_at = $2
     WHERE id = $3 AND trashed_at IS NULL
     RETURNING *`,
    [status, updates.published_at || null, id]
  );

  return result.rows[0] || null;
};

export const deletePage = async (id, userId) => {
  const autoDeleteAt = new Date();
  autoDeleteAt.setDate(autoDeleteAt.getDate() + 30); // 30 days from now

  const result = await pool.query(
    `UPDATE pages 
     SET trashed_at = CURRENT_TIMESTAMP, 
         trashed_by = $1,
         auto_delete_at = $2
     WHERE id = $3 AND trashed_at IS NULL
     RETURNING *`,
    [userId, autoDeleteAt, id]
  );

  return result.rows[0] || null;
};

export const restorePage = async (id) => {
  const result = await pool.query(
    `UPDATE pages 
     SET trashed_at = NULL, 
         trashed_by = NULL,
         auto_delete_at = NULL
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0] || null;
};

export const permanentlyDeletePage = async (id) => {
  await pool.query('DELETE FROM pages WHERE id = $1', [id]);
};

export const duplicatePage = async (id, newTitle, userId) => {
  const original = await getPageById(id);
  if (!original) {
    throw new Error('Page not found');
  }

  // Generate unique slug
  const baseSlug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let slug = baseSlug;
  let counter = 1;
  
  while (await getPageBySlug(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const newPage = {
    title: newTitle,
    slug,
    status: 'draft',
    visibility: original.visibility,
    seo: original.seo,
    sections: original.sections,
  };

  return createPage(newPage, userId);
};

export const getTrash = async (pagination = {}) => {
  const { page = 1, pageSize = 20 } = pagination;

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM pages WHERE trashed_at IS NOT NULL'
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    `SELECT * FROM pages 
     WHERE trashed_at IS NOT NULL 
     ORDER BY trashed_at DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize]
  );

  const items = result.rows.map((page) => {
    const now = new Date();
    const autoDeleteAt = new Date(page.auto_delete_at);
    const daysRemaining = Math.ceil((autoDeleteAt - now) / (1000 * 60 * 60 * 24));

    return {
      page,
      daysRemaining: Math.max(0, daysRemaining),
      autoDeleteAt: page.auto_delete_at,
    };
  });

  return { items, total };
};

export const emptyTrash = async () => {
  await pool.query('DELETE FROM pages WHERE trashed_at IS NOT NULL');
};

export const bulkUpdateStatus = async (ids, status) => {
  const validStatuses = ['published', 'hidden', 'draft', 'scheduled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  await pool.query(
    'UPDATE pages SET status = $1 WHERE id = ANY($2) AND trashed_at IS NULL',
    [status, ids]
  );
};

export const bulkDelete = async (ids, userId) => {
  const autoDeleteAt = new Date();
  autoDeleteAt.setDate(autoDeleteAt.getDate() + 30);

  await pool.query(
    `UPDATE pages 
     SET trashed_at = CURRENT_TIMESTAMP, 
         trashed_by = $1,
         auto_delete_at = $2
     WHERE id = ANY($3) AND trashed_at IS NULL`,
    [userId, autoDeleteAt, ids]
  );
};

export const bulkRestore = async (ids) => {
  await pool.query(
    `UPDATE pages 
     SET trashed_at = NULL, 
         trashed_by = NULL,
         auto_delete_at = NULL
     WHERE id = ANY($1)`,
    [ids]
  );
};

export const validateSlug = async (slug, excludeId = null) => {
  let query = 'SELECT id FROM pages WHERE slug = $1 AND trashed_at IS NULL';
  const params = [slug];

  if (excludeId) {
    query += ' AND id != $2';
    params.push(excludeId);
  }

  const result = await pool.query(query, params);
  return result.rows.length === 0; // true if available
};

// Media operations
export const createMediaAsset = async (assetData, userId) => {
  const {
    filename,
    originalFilename,
    url,
    thumbnailUrl,
    mimeType,
    size,
    width,
    height,
    alt,
    caption,
    folder,
    tags,
    responsive,
  } = assetData;

  const result = await pool.query(
    `INSERT INTO media_assets (
      filename, original_filename, url, thumbnail_url, mime_type, size,
      width, height, alt, caption, folder, tags, responsive, uploaded_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      filename,
      originalFilename,
      url,
      thumbnailUrl || null,
      mimeType,
      size,
      width || null,
      height || null,
      alt || null,
      caption || null,
      folder || null,
      tags || [],
      responsive ? JSON.stringify(responsive) : null,
      userId,
    ]
  );

  return result.rows[0];
};

export const getMediaAssets = async (filters = {}, sort = {}, pagination = {}) => {
  const { folder, mimeType, search, tags, uploadedBy, dateFrom, dateTo } = filters;
  const { field = 'uploaded_at', order = 'desc' } = sort;
  const { page = 1, pageSize = 50 } = pagination;

  let query = 'SELECT * FROM media_assets WHERE 1=1';
  const params = [];
  let paramCount = 1;

  if (folder !== undefined) {
    if (folder === null || folder === '') {
      query += ' AND folder IS NULL';
    } else {
      query += ` AND folder = $${paramCount}`;
      params.push(folder);
      paramCount++;
    }
  }

  if (mimeType) {
    query += ` AND mime_type LIKE $${paramCount}`;
    params.push(`${mimeType}%`);
    paramCount++;
  }

  if (search) {
    query += ` AND (filename ILIKE $${paramCount} OR original_filename ILIKE $${paramCount} OR alt ILIKE $${paramCount})`;
    params.push(`%${search}%`);
    paramCount++;
  }

  if (tags && tags.length > 0) {
    query += ` AND tags && $${paramCount}`;
    params.push(tags);
    paramCount++;
  }

  if (uploadedBy) {
    query += ` AND uploaded_by = $${paramCount}`;
    params.push(uploadedBy);
    paramCount++;
  }

  if (dateFrom) {
    query += ` AND uploaded_at >= $${paramCount}`;
    params.push(dateFrom);
    paramCount++;
  }

  if (dateTo) {
    query += ` AND uploaded_at <= $${paramCount}`;
    params.push(dateTo);
    paramCount++;
  }

  // Count total
  const countResult = await pool.query(
    query.replace('SELECT *', 'SELECT COUNT(*)'),
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Add sorting and pagination
  const validFields = ['filename', 'uploaded_at', 'size'];
  const sortField = validFields.includes(field) ? field : 'uploaded_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  query += ` ORDER BY ${sortField} ${sortOrder}`;
  query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(pageSize, (page - 1) * pageSize);

  const result = await pool.query(query, params);

  return {
    assets: result.rows,
    total,
    page,
    pageSize,
  };
};

export const getMediaAssetById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM media_assets WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export const updateMediaAsset = async (id, updates) => {
  const allowedFields = ['alt', 'caption', 'tags', 'folder'];
  const setClause = [];
  const params = [];
  let paramCount = 1;

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramCount}`);
      params.push(updates[key]);
      paramCount++;
    }
  });

  if (setClause.length === 0) {
    throw new Error('No valid fields to update');
  }

  params.push(id);
  const query = `
    UPDATE media_assets 
    SET ${setClause.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

export const deleteMediaAsset = async (id) => {
  await pool.query('DELETE FROM media_assets WHERE id = $1', [id]);
};

export const bulkDeleteMedia = async (ids) => {
  await pool.query('DELETE FROM media_assets WHERE id = ANY($1)', [ids]);
};

export const getFolders = async () => {
  const result = await pool.query(
    'SELECT DISTINCT folder FROM media_assets WHERE folder IS NOT NULL ORDER BY folder'
  );
  return result.rows.map((row) => row.folder);
};

export const getStorageStats = async () => {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_files,
      SUM(size) as total_size,
      mime_type,
      COUNT(*) as count,
      SUM(size) as size
    FROM media_assets
    GROUP BY mime_type
  `);

  const stats = {
    totalFiles: 0,
    totalSize: 0,
    byMimeType: {},
  };

  result.rows.forEach((row) => {
    stats.totalFiles += parseInt(row.count);
    stats.totalSize += parseInt(row.size);
    stats.byMimeType[row.mime_type] = {
      count: parseInt(row.count),
      size: parseInt(row.size),
    };
  });

  return stats;
};
