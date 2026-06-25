# Admin CMS Implementation Guide

## Overview
This document outlines the implementation of a comprehensive Content Management System (CMS) for the PixieKat admin panel, enabling non-technical users to manage website pages, media, and content with device-specific controls.

## Implementation Status

### ✅ Completed (Phase 1)

#### 1. Type Definitions (`admin/src/types/cms.ts`)
Complete TypeScript type system for:
- **Page Management**: Page, PageStatus, PageVisibility, PageSchedule
- **Content Sections**: Section, SectionType, HeroSection, FeatureGrid
- **Responsive Settings**: ResponsiveValue<T>, DeviceType (desktop/tablet/mobile)
- **Typography & Styling**: TypographySettings, SpacingSettings, BackgroundSettings
- **Media Assets**: MediaAsset, MediaUploadRequest, MediaListResponse
- **Trash System**: TrashItem with auto-delete tracking
- **API Contracts**: Request/Response types for all operations

#### 2. Service Layer

**Page Service (`admin/src/services/pageService.ts`)**
- `getPages()` - List pages with filters and pagination
- `getPageById()` / `getPageBySlug()` - Fetch individual pages
- `createPage()` / `updatePage()` - CRUD operations
- `deletePage()` - Soft delete (move to trash)
- `restorePage()` / `permanentlyDeletePage()` - Trash management
- `duplicatePage()` - Clone pages
- `updatePageStatus()` - Publish/hide/draft status changes
- `bulkDelete()` / `bulkUpdateStatus()` / `bulkRestore()` - Bulk operations
- `getTrash()` / `emptyTrash()` - Trash operations
- `getPageHistory()` / `revertToVersion()` - Version control
- `validateSlug()` - Slug uniqueness validation

**Media Service (`admin/src/services/mediaService.ts`)**
- `getMedia()` - List media with filters
- `uploadMedia()` / `uploadMultiple()` - File uploads
- `updateMedia()` / `deleteMedia()` - Media management
- `bulkDelete()` / `moveToFolder()` - Bulk operations
- `optimizeImage()` / `generateResponsiveVersions()` - Image optimization
- `cropImage()` / `resizeImage()` - Image editing
- `getFolders()` / `createFolder()` / `deleteFolder()` - Folder management
- `getStorageStats()` - Storage analytics

#### 3. UI Components

**DeviceSelector (`admin/src/components/cms/DeviceSelector.tsx`)**
- Toggle between Desktop/Tablet/Mobile views
- Visual icons for each device type
- Responsive design with hidden labels on small screens

**StatusBadge (`admin/src/components/cms/StatusBadge.tsx`)**
- Color-coded status indicators
- Icons for Published, Hidden, Draft, Scheduled, Trashed
- Customizable with/without icons

#### 4. Pages

**Enhanced Pages List (`admin/src/pages/Pages.tsx`)**
Features:
- Real-time search with Enter key support
- Multi-status filtering (Published, Hidden, Draft, etc.)
- Bulk selection with checkbox controls
- Bulk actions: Publish, Hide, Delete
- Individual page actions:
  - Quick publish/hide toggle
  - Edit (navigates to page builder)
  - Duplicate with "(Copy)" suffix
  - Delete (moves to trash)
- Status badges with visibility indicators
- "Hidden from nav" label for pages not in navigation
- Loading states and empty states
- Responsive table design

**Trash Page (`admin/src/pages/Trash.tsx`)**
Features:
- List all deleted pages with metadata
- Shows deletion date, deleted by, days remaining
- Auto-delete countdown (30 days default)
- Individual restore/permanent delete actions
- Bulk restore with selection
- Empty trash with confirmation modal
- Search functionality
- Warning for items with <7 days remaining
- Refresh button to reload trash

**Media Library (`admin/src/pages/MediaLibrary.tsx`)**
Features:
- Grid and List view modes
- Drag-and-drop file upload
- Multi-file upload support
- Search and folder filtering
- Bulk selection and deletion
- Image thumbnails with preview
- File type icons for non-images
- File size display with formatting
- Upload date tracking
- Download and delete actions
- Responsive grid layout
- Upload progress indication

#### 5. Routing

Added to `admin/src/App.tsx`:
```tsx
<Route path="trash" element={<Trash />} />
<Route path="media" element={<MediaLibrary />} />
```

Updated Pages component with navigation:
- `/pages/builder/new` - Create new page
- `/pages/builder/:id` - Edit existing page
- `/trash` - View trash

---

## Next Steps (Phase 2)

### 1. Page Builder Component
**Priority: HIGH**

Create `admin/src/pages/PageBuilder.tsx` with:

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [< Back] Page Title                [Device Selector]    │
│                                     [Preview] [Save]    │
├──────────────┬──────────────────────────┬───────────────┤
│ Sections     │ Live Preview             │ Settings      │
│ (Sidebar)    │ (Main Canvas)            │ (Right Panel) │
│              │                          │               │
│ + Hero       │ ┌──────────────────────┐ │ Section: Hero │
│ + Features   │ │                      │ │               │
│ + Pricing    │ │   [Hero Section]     │ │ Background:   │
│ + FAQ        │ │                      │ │ [Color picker]│
│              │ └──────────────────────┘ │               │
│              │                          │ Spacing:      │
│              │ ┌──────────────────────┐ │ Top: 20px     │
│              │ │                      │ │ Bottom: 20px  │
│              │ │  [Feature Grid]      │ │               │
│              │ │                      │ │ Visibility:   │
│              │ └──────────────────────┘ │ ☑ Desktop     │
│              │                          │ ☑ Tablet      │
│              │                          │ ☑ Mobile      │
└──────────────┴──────────────────────────┴───────────────┘
```

**Features to Implement:**
- [ ] Section library with drag-and-drop
- [ ] Live preview with device switching
- [ ] Click-to-select sections
- [ ] Right panel settings editor
- [ ] Undo/redo functionality
- [ ] Auto-save drafts
- [ ] Publish/save as draft buttons
- [ ] SEO settings tab
- [ ] Page visibility settings
- [ ] Schedule publishing

### 2. Section Editors

**HeroSectionEditor Component:**
- [ ] Heading text editor with rich text
- [ ] Subheading and description editors
- [ ] Image upload with device-specific versions
- [ ] Background settings (color/gradient/image/video)
- [ ] Button configuration (text, URL, style)
- [ ] Overlay settings
- [ ] Responsive typography controls
- [ ] Spacing controls per device

**FeatureGridEditor Component:**
- [ ] Add/remove feature items
- [ ] Drag-and-drop reordering
- [ ] Column count per device (2/3/4 columns)
- [ ] Icon/image upload per item
- [ ] Title and description editing
- [ ] Link configuration

**Create editors for:**
- [ ] Testimonials section
- [ ] Pricing tables
- [ ] FAQ accordion
- [ ] Contact forms
- [ ] Image galleries
- [ ] Video embeds
- [ ] Text blocks
- [ ] Custom HTML

### 3. Responsive Settings Panel

Create `admin/src/components/cms/ResponsiveSettingsPanel.tsx`:

**Features:**
- [ ] Device tabs (Desktop/Tablet/Mobile)
- [ ] Inheritance toggle per device
- [ ] Visual indication of inherited values
- [ ] "Break Inheritance" button
- [ ] "Reset to Inherited" option
- [ ] Side-by-side comparison view
- [ ] Change history/diff viewer

**Settings Groups:**
- [ ] Typography (font, size, weight, spacing, alignment)
- [ ] Spacing (margin, padding with visual editor)
- [ ] Dimensions (width, height, max-width)
- [ ] Background (color, gradient, image, video)
- [ ] Visibility toggle
- [ ] Custom CSS classes

### 4. Image Editor

Create `admin/src/components/cms/ImageEditor.tsx`:

**Features:**
- [ ] Crop with aspect ratio presets (16:9, 4:3, 1:1, free)
- [ ] Rotate and flip
- [ ] Brightness, contrast, saturation sliders
- [ ] Filters (grayscale, sepia, blur)
- [ ] Focal point selector for responsive cropping
- [ ] Before/after preview
- [ ] Save as new or overwrite original
- [ ] Generate responsive versions button

### 5. Backend API Implementation

**Required Endpoints:**

```typescript
// Pages
POST   /api/admin/pages
GET    /api/admin/pages
GET    /api/admin/pages/:id
PUT    /api/admin/pages/:id
DELETE /api/admin/pages/:id
POST   /api/admin/pages/:id/restore
DELETE /api/admin/pages/:id/permanent
POST   /api/admin/pages/:id/duplicate
PATCH  /api/admin/pages/:id/status
GET    /api/admin/pages/trash
POST   /api/admin/pages/trash/empty
POST   /api/admin/pages/bulk/delete
POST   /api/admin/pages/bulk/status
POST   /api/admin/pages/bulk/restore
GET    /api/admin/pages/:id/history
POST   /api/admin/pages/:id/revert
GET    /api/admin/pages/validate-slug

// Media
POST   /api/admin/media
GET    /api/admin/media
GET    /api/admin/media/:id
PATCH  /api/admin/media/:id
DELETE /api/admin/media/:id
POST   /api/admin/media/bulk
POST   /api/admin/media/bulk/delete
POST   /api/admin/media/:id/optimize
POST   /api/admin/media/:id/responsive
POST   /api/admin/media/:id/crop
POST   /api/admin/media/:id/resize
GET    /api/admin/media/folders
POST   /api/admin/media/folders
DELETE /api/admin/media/folders/:name
POST   /api/admin/media/bulk/move
GET    /api/admin/media/stats
```

**Database Schema:**

```sql
-- Pages table
CREATE TABLE pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL,
  visibility JSONB NOT NULL,
  schedule JSONB,
  seo JSONB NOT NULL,
  sections JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  trashed_at TIMESTAMP,
  trashed_by UUID REFERENCES users(id),
  auto_delete_at TIMESTAMP
);

CREATE INDEX idx_pages_status ON pages(status);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_trashed_at ON pages(trashed_at) WHERE trashed_at IS NOT NULL;

-- Page versions (for history)
CREATE TABLE page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_page_versions_page_id ON page_versions(page_id);

-- Media assets table
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt TEXT,
  caption TEXT,
  folder VARCHAR(255),
  tags TEXT[],
  responsive JSONB,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_folder ON media_assets(folder);
CREATE INDEX idx_media_uploaded_by ON media_assets(uploaded_by);
CREATE INDEX idx_media_mime_type ON media_assets(mime_type);
```

### 6. Advanced Features (Phase 3)

**Real-time Collaboration:**
- [ ] WebSocket connection for live editing
- [ ] Show active editors with avatars
- [ ] Lock sections being edited
- [ ] Conflict resolution UI
- [ ] Activity feed

**Version Control:**
- [ ] Auto-save every 30 seconds
- [ ] Manual save points
- [ ] Version comparison diff viewer
- [ ] Restore to any version
- [ ] Version labels/tags

**Templates:**
- [ ] Save page as template
- [ ] Template library
- [ ] Create page from template
- [ ] Template categories
- [ ] Template preview

**Custom Breakpoints:**
- [ ] Define custom breakpoints in settings
- [ ] Support for Large Desktop (≥1440px)
- [ ] Support for Small Mobile (<375px)
- [ ] Breakpoint presets

**Analytics Integration:**
- [ ] Page view tracking
- [ ] Edit history analytics
- [ ] Popular pages dashboard
- [ ] Performance metrics

---

## File Structure

```
admin/src/
├── types/
│   └── cms.ts                    ✅ Complete type definitions
├── services/
│   ├── pageService.ts            ✅ Page CRUD and management
│   └── mediaService.ts           ✅ Media upload and management
├── components/
│   └── cms/
│       ├── DeviceSelector.tsx    ✅ Device switching component
│       ├── StatusBadge.tsx       ✅ Status indicator component
│       ├── ResponsiveSettingsPanel.tsx  ⏳ TODO
│       ├── SectionEditor.tsx     ⏳ TODO
│       ├── ImageEditor.tsx       ⏳ TODO
│       └── SectionLibrary.tsx    ⏳ TODO
├── pages/
│   ├── Pages.tsx                 ✅ Enhanced page list
│   ├── Trash.tsx                 ✅ Trash management
│   ├── MediaLibrary.tsx          ✅ Media management
│   ├── PageBuilder.tsx           ⏳ TODO - Main page builder
│   └── cms/
│       ├── HeroEditor.tsx        ⏳ TODO
│       ├── FeatureGridEditor.tsx ⏳ TODO
│       └── ...                   ⏳ TODO - Other section editors
└── App.tsx                       ✅ Routes added
```

---

## Usage Examples

### Creating a New Page

```typescript
// In PageBuilder component
const handleCreatePage = async () => {
  const newPage = await pageService.createPage({
    title: 'New Page',
    slug: 'new-page',
    status: PageStatus.DRAFT,
  });
  
  navigate(`/pages/builder/${newPage.id}`);
};
```

### Uploading Media

```typescript
// In MediaLibrary component
const handleUpload = async (files: FileList) => {
  const file = files[0];
  const asset = await mediaService.uploadMedia({
    file,
    folder: 'hero-images',
    alt: 'Hero background',
    tags: ['hero', 'homepage'],
  });
  
  toast.success('Image uploaded successfully');
};
```

### Updating Page Status

```typescript
// Quick publish/hide toggle
const toggleVisibility = async (pageId: string, currentStatus: PageStatus) => {
  const newStatus = currentStatus === PageStatus.PUBLISHED 
    ? PageStatus.HIDDEN 
    : PageStatus.PUBLISHED;
    
  await pageService.updatePageStatus(pageId, newStatus);
};
```

### Device-Specific Settings

```typescript
// Example responsive image settings
const heroImage: ResponsiveValue<ImageSettings> = {
  desktop: {
    src: '/images/hero-desktop.jpg',
    width: '100%',
    height: '600px',
    objectFit: 'cover',
    objectPosition: { x: 'center', y: 'center' },
    visible: true,
  },
  tablet: {
    inherit: false,
    src: '/images/hero-tablet.jpg',
    width: '100%',
    height: '400px',
    objectFit: 'cover',
    objectPosition: { x: 'center', y: 'center' },
    visible: true,
  },
  mobile: {
    inherit: false,
    src: '/images/hero-mobile.jpg',
    width: '100%',
    height: '300px',
    objectFit: 'cover',
    objectPosition: { x: 'center', y: 'top' },
    visible: false, // Hidden on mobile
  },
};
```

---

## Testing Checklist

### Pages Management
- [ ] Create new page
- [ ] Edit existing page
- [ ] Duplicate page
- [ ] Delete page (moves to trash)
- [ ] Restore from trash
- [ ] Permanently delete from trash
- [ ] Empty trash
- [ ] Search pages
- [ ] Filter by status
- [ ] Bulk publish/hide
- [ ] Bulk delete

### Media Library
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Drag and drop upload
- [ ] Search media
- [ ] Filter by folder
- [ ] Switch grid/list view
- [ ] Delete media
- [ ] Bulk delete
- [ ] Download media
- [ ] View file details

### Responsive Controls (When Implemented)
- [ ] Switch between devices
- [ ] Inherit settings from parent device
- [ ] Break inheritance
- [ ] Reset to inherited values
- [ ] Hide element on specific device
- [ ] Different images per device
- [ ] Different text sizes per device

---

## Performance Considerations

1. **Lazy Loading**
   - Load sections on demand
   - Lazy load images in media library
   - Paginate page and media lists

2. **Optimization**
   - Debounce search inputs
   - Throttle auto-save
   - Compress uploaded images
   - Generate WebP versions

3. **Caching**
   - Cache page list
   - Cache media library
   - Invalidate on updates

4. **Bundle Size**
   - Code split page builder
   - Lazy load section editors
   - Dynamic imports for heavy components

---

## Security Considerations

1. **Authentication**
   - All API endpoints require authentication
   - Role-based access control (admin only)
   - Session validation

2. **File Upload**
   - Validate file types
   - Limit file sizes (10MB default)
   - Scan for malware
   - Sanitize filenames

3. **Input Validation**
   - Validate slug format
   - Sanitize HTML in rich text
   - Validate JSON structures
   - SQL injection prevention

4. **Authorization**
   - Check user permissions
   - Audit log for sensitive actions
   - Rate limiting on uploads

---

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

---

## Dependencies

Already installed:
- `react` - UI framework
- `react-router-dom` - Routing
- `framer-motion` - Animations
- `lucide-react` - Icons
- `react-hot-toast` - Notifications

May need to add:
- `react-beautiful-dnd` - Drag and drop
- `react-quill` or `tiptap` - Rich text editor
- `react-image-crop` - Image cropping
- `react-color` - Color picker
- `date-fns` - Date formatting

---

## Conclusion

Phase 1 is complete with a solid foundation:
- ✅ Complete type system
- ✅ Service layer with all API methods
- ✅ Enhanced Pages list with visibility controls
- ✅ Trash system with restore
- ✅ Media library with upload
- ✅ Reusable UI components

Next priority is Phase 2: Building the visual Page Builder with section editors and responsive controls.
