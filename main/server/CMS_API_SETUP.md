# CMS API Setup Guide

## What's Been Built

✅ **Complete backend API** for the CMS system with:
- Page management (CRUD, status, trash, bulk operations)
- Media library (upload, organize, delete)
- PostgreSQL database schema
- Authentication middleware
- File upload support

## Quick Start

### 1. Install Dependencies

```bash
cd main/server
npm install
```

This will install the new `multer` dependency for file uploads.

### 2. Database Setup

The database tables will be created automatically when you start the server. The schema includes:

- **`pages`** - Store all website pages with sections, SEO, visibility settings
- **`page_versions`** - Version history for undo/redo
- **`media_assets`** - Uploaded files with metadata
- **`media_folders`** - Virtual folder organization

### 3. Start the Server

```bash
npm run dev
```

You should see:
```
✓ Database initialized
✓ CMS tables initialized
🚀 Server running on http://localhost:3001
📁 CMS API: http://localhost:3001/api/admin/pages
🖼️  Media API: http://localhost:3001/api/admin/media
```

### 4. Test the API

The admin panel will now connect to real endpoints!

**Login first** (required for all CMS endpoints):
```bash
# Signup
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@test.com","password":"password123","confirmPassword":"password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' \
  -c cookies.txt

# Test pages endpoint (with auth cookie)
curl http://localhost:3001/api/admin/pages -b cookies.txt
```

## API Endpoints

### Pages API (`/api/admin/pages`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all pages with filters |
| GET | `/:id` | Get page by ID |
| GET | `/slug/:slug` | Get page by slug |
| POST | `/` | Create new page |
| PUT | `/:id` | Update page |
| PATCH | `/:id/status` | Update page status |
| DELETE | `/:id` | Move to trash |
| POST | `/:id/restore` | Restore from trash |
| DELETE | `/:id/permanent` | Permanently delete |
| POST | `/:id/duplicate` | Duplicate page |
| GET | `/trash` | List trashed pages |
| POST | `/trash/empty` | Empty trash |
| POST | `/bulk/status` | Bulk update status |
| POST | `/bulk/delete` | Bulk delete |
| POST | `/bulk/restore` | Bulk restore |
| GET | `/validate-slug` | Check slug availability |

### Media API (`/api/admin/media`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List media assets |
| GET | `/:id` | Get asset by ID |
| POST | `/` | Upload single file |
| POST | `/bulk` | Upload multiple files |
| PATCH | `/:id` | Update metadata |
| DELETE | `/:id` | Delete asset |
| POST | `/bulk/delete` | Bulk delete |
| POST | `/bulk/move` | Move to folder |
| GET | `/folders` | List folders |
| POST | `/folders` | Create folder |
| DELETE | `/folders/:name` | Delete folder |
| GET | `/stats` | Storage statistics |

## Example Requests

### Create a Page

```bash
curl -X POST http://localhost:3001/api/admin/pages \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Home Page",
    "slug": "home",
    "status": "published",
    "sections": [],
    "seo": {
      "title": "Welcome to PixieKat",
      "description": "Gaming top-up platform"
    }
  }'
```

### Upload Media

```bash
curl -X POST http://localhost:3001/api/admin/media \
  -b cookies.txt \
  -F "file=@/path/to/image.jpg" \
  -F "folder=hero-images" \
  -F "alt=Hero background"
```

### Update Page Status

```bash
curl -X PATCH http://localhost:3001/api/admin/pages/{pageId}/status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"status": "published"}'
```

### Get Trash

```bash
curl http://localhost:3001/api/admin/pages/trash -b cookies.txt
```

## File Structure

```
main/server/
├── database/
│   ├── schema.sql           # Database schema
│   └── cms-db.js            # Database operations
├── routes/
│   ├── pages.js             # Page API routes
│   └── media.js             # Media API routes
├── public/
│   └── uploads/             # Uploaded files (auto-created)
├── index.js                 # Main server file
└── package.json             # Dependencies
```

## Database Schema

### Pages Table
```sql
- id (UUID)
- title (VARCHAR)
- slug (VARCHAR, UNIQUE)
- status (VARCHAR) - published, hidden, draft, scheduled, trashed
- visibility (JSONB) - showInNav, devices, etc.
- schedule (JSONB) - publishAt, unpublishAt
- seo (JSONB) - title, description, keywords
- sections (JSONB) - page content sections
- metadata (JSONB) - author, dates, version
- trashed_at (TIMESTAMP)
- auto_delete_at (TIMESTAMP)
```

### Media Assets Table
```sql
- id (UUID)
- filename (VARCHAR)
- original_filename (VARCHAR)
- url (TEXT)
- mime_type (VARCHAR)
- size (BIGINT)
- width, height (INTEGER)
- alt, caption (TEXT)
- folder (VARCHAR)
- tags (TEXT[])
- uploaded_by (INTEGER)
- uploaded_at (TIMESTAMP)
```

## Admin Panel Integration

The admin panel is already configured to use these endpoints:

1. **Pages** (`admin/src/pages/Pages.tsx`) → `/api/admin/pages`
2. **Trash** (`admin/src/pages/Trash.tsx`) → `/api/admin/pages/trash`
3. **Media Library** (`admin/src/pages/MediaLibrary.tsx`) → `/api/admin/media`

### CORS Configuration

The server allows requests from:
- Development: `http://localhost:5173` (main app), `http://localhost:5174` (admin panel)
- Production: Set `CORS_ORIGIN` in `.env`

### Authentication

All CMS endpoints require authentication:
- User must be logged in (valid JWT cookie)
- Token is validated by `authMiddleware`
- User ID is available in `req.user.userId`

## Next Steps

### 1. Create Seed Data

Create some initial pages to test the admin panel:

```javascript
// Run this in a separate seed script
const pages = [
  {
    title: 'Home',
    slug: '/',
    status: 'published',
    sections: [],
  },
  {
    title: 'Games',
    slug: '/games',
    status: 'published',
    sections: [],
  },
  {
    title: 'Pricing',
    slug: '/pricing',
    status: 'published',
    sections: [],
  },
];
```

### 2. Test Admin Panel

1. Start the server: `npm run dev`
2. Start admin panel: `cd admin && npm run dev`
3. Login to admin panel
4. Navigate to Pages section
5. You should see the pages list (empty initially)
6. Click "Create Page" to add a new page
7. Test all features: edit, duplicate, delete, restore

### 3. Upload Test Media

1. Navigate to Media Library in admin
2. Drag and drop images
3. Test folder organization
4. Test bulk operations

## Troubleshooting

### "Failed to load pages" error

**Cause**: Server not running or database not initialized

**Fix**:
```bash
cd main/server
npm run dev
```

### "Authentication required" error

**Cause**: Not logged in or cookie expired

**Fix**: Login through the admin panel first

### "Slug already exists" error

**Cause**: Duplicate slug

**Fix**: Use a different slug or update the existing page

### File upload fails

**Cause**: `public/uploads` folder doesn't exist or no write permissions

**Fix**: The folder is created automatically, but check permissions:
```bash
mkdir -p main/server/public/uploads
chmod 755 main/server/public/uploads
```

### Database connection error

**Cause**: PostgreSQL not running or wrong credentials

**Fix**: Check `.env` file:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pixiekat
DB_USER=your_user
DB_PASSWORD=your_password
```

## Security Notes

1. **File Uploads**: Limited to 10MB, only images/videos/PDFs allowed
2. **Authentication**: All endpoints require valid JWT
3. **Rate Limiting**: 100 requests per 15 minutes globally
4. **SQL Injection**: All queries use parameterized statements
5. **XSS Protection**: Helmet.js security headers enabled

## Performance

- **Pagination**: Default 20 items per page
- **Indexing**: All frequently queried fields are indexed
- **Connection Pooling**: Max 20 concurrent database connections
- **File Storage**: Local filesystem (can be moved to S3 later)

## Future Enhancements

- [ ] Image optimization with Sharp
- [ ] Responsive image generation
- [ ] S3/CloudFront integration for media
- [ ] Page version comparison
- [ ] Real-time collaboration
- [ ] Scheduled publishing
- [ ] Auto-purge trash after 30 days
- [ ] Media CDN integration
- [ ] Image editing (crop, resize, filters)

## Support

If you encounter issues:
1. Check server logs in terminal
2. Check browser console for errors
3. Verify database is running
4. Ensure all dependencies are installed
5. Check CORS configuration matches your ports
