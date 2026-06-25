// CMS Type Definitions for Page Builder and Content Management

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

export enum PageStatus {
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  TRASHED = 'trashed',
}

export enum SectionType {
  HERO = 'hero',
  FEATURE_GRID = 'feature_grid',
  TESTIMONIALS = 'testimonials',
  PRICING = 'pricing',
  FAQ = 'faq',
  CONTACT_FORM = 'contact_form',
  IMAGE_GALLERY = 'image_gallery',
  VIDEO_EMBED = 'video_embed',
  TEXT_BLOCK = 'text_block',
  CUSTOM_HTML = 'custom_html',
}

// Responsive Settings
export interface ResponsiveValue<T> {
  desktop: T;
  tablet: T & { inherit?: boolean };
  mobile: T & { inherit?: boolean };
}

// Typography Settings
export interface TypographySettings {
  fontFamily?: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing?: string;
  fontWeight: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  maxWidth?: string;
  color?: string;
  visible: boolean;
}

// Spacing Settings
export interface SpacingSettings {
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
}

// Image Settings
export interface ImageSettings {
  src: string;
  alt?: string;
  width: string;
  height: string;
  objectFit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition: {
    x: string;
    y: string;
  };
  visible: boolean;
  loading?: 'lazy' | 'eager';
  srcset?: string;
}

// Background Settings
export interface BackgroundSettings {
  type: 'color' | 'gradient' | 'image' | 'video';
  color?: string;
  gradient?: {
    type: 'linear' | 'radial';
    angle?: number;
    stops: Array<{ color: string; position: number }>;
  };
  image?: {
    src: string;
    size: 'cover' | 'contain' | 'auto';
    position: string;
    repeat: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
    parallax?: boolean;
  };
  video?: {
    src: string;
    poster?: string;
    loop: boolean;
    muted: boolean;
    autoplay: boolean;
  };
}

// Text Content
export interface TextContent {
  text: string;
  typography: ResponsiveValue<TypographySettings>;
  spacing?: ResponsiveValue<SpacingSettings>;
}

// Button Content
export interface ButtonContent {
  text: string;
  url: string;
  openInNewTab: boolean;
  style: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg';
  visible: boolean;
}

// Hero Section Content
export interface HeroSectionContent {
  heading: TextContent;
  subheading?: TextContent;
  description?: TextContent;
  image?: ResponsiveValue<ImageSettings>;
  background: ResponsiveValue<BackgroundSettings>;
  buttons?: ButtonContent[];
  overlay?: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
}

// Feature Grid Item
export interface FeatureItem {
  id: string;
  icon?: string;
  title: string;
  description: string;
  image?: string;
  link?: string;
}

// Feature Grid Content
export interface FeatureGridContent {
  title?: TextContent;
  subtitle?: TextContent;
  columns: ResponsiveValue<{ count: number }>;
  items: FeatureItem[];
  background: ResponsiveValue<BackgroundSettings>;
}

// Generic Section
export interface Section {
  id: string;
  type: SectionType;
  name: string;
  order: number;
  content: HeroSectionContent | FeatureGridContent | Record<string, any>;
  spacing: ResponsiveValue<SpacingSettings>;
  visibility: ResponsiveValue<{ visible: boolean }>;
  customCSS?: string;
  customClasses?: string[];
  animation?: {
    type: 'fade' | 'slide' | 'zoom' | 'none';
    duration: number;
    delay: number;
  };
}

// Page Visibility Settings
export interface PageVisibility {
  showInNav: boolean;
  showInSitemap: boolean;
  allowSearchEngines: boolean;
  requireAuth: boolean;
  passwordProtected: boolean;
  password?: string;
  devices: {
    desktop: boolean;
    tablet: boolean;
    mobile: boolean | { redirect: string };
  };
}

// Page Schedule
export interface PageSchedule {
  publishAt?: string;
  unpublishAt?: string;
}

// SEO Settings
export interface SEOSettings {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

// Page Metadata
export interface PageMetadata {
  author: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  trashedAt?: string;
  trashedBy?: string;
  version: number;
  template?: string;
}

// Complete Page Definition
export interface Page {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  visibility: PageVisibility;
  schedule?: PageSchedule;
  seo: SEOSettings;
  sections: Section[];
  metadata: PageMetadata;
}

// Media Asset
export interface MediaAsset {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  uploadedBy: string;
  uploadedAt: string;
  folder?: string;
  tags?: string[];
  responsive?: {
    small?: string;
    medium?: string;
    large?: string;
    webp?: string;
  };
}

// Trash Item
export interface TrashItem {
  page: Page;
  daysRemaining: number;
  autoDeleteAt: string;
}

// Page Builder State
export interface PageBuilderState {
  currentPage: Page | null;
  selectedSection: Section | null;
  selectedDevice: DeviceType;
  previewMode: boolean;
  isDirty: boolean;
  isSaving: boolean;
  history: Page[];
  historyIndex: number;
}

// API Request/Response Types
export interface CreatePageRequest {
  title: string;
  slug?: string;
  template?: string;
  status?: PageStatus;
}

export interface UpdatePageRequest {
  title?: string;
  slug?: string;
  status?: PageStatus;
  visibility?: Partial<PageVisibility>;
  schedule?: Partial<PageSchedule>;
  seo?: Partial<SEOSettings>;
  sections?: Section[];
}

export interface PageListResponse {
  pages: Page[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TrashListResponse {
  items: TrashItem[];
  total: number;
}

export interface MediaUploadRequest {
  file: File;
  folder?: string;
  alt?: string;
  tags?: string[];
}

export interface MediaListResponse {
  assets: MediaAsset[];
  total: number;
  page: number;
  pageSize: number;
}

// Filter and Sort Options
export interface PageFilters {
  status?: PageStatus[];
  author?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PageSortOptions {
  field: 'title' | 'updatedAt' | 'createdAt' | 'publishedAt';
  order: 'asc' | 'desc';
}

// Component Props Types
export interface DeviceSelectorProps {
  currentDevice: DeviceType;
  onChange: (device: DeviceType) => void;
}

export interface SectionEditorProps {
  section: Section;
  device: DeviceType;
  onChange: (section: Section) => void;
  onDelete: () => void;
}

export interface ResponsiveSettingsPanelProps {
  section: Section;
  device: DeviceType;
  onChange: (section: Section) => void;
}

export interface MediaLibraryProps {
  onSelect?: (asset: MediaAsset) => void;
  multiple?: boolean;
  accept?: string[];
}

export interface ImageEditorProps {
  asset: MediaAsset;
  onSave: (editedAsset: MediaAsset) => void;
  onCancel: () => void;
}
