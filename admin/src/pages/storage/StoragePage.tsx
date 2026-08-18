import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Search, Image as ImageIcon, Video, FileText, File as FileIcon,
  Download, Trash2, Edit3, Replace, Minimize2, X,
  Eye, HardDrive, ArrowLeft, Check, AlertTriangle, Grid3X3, List, Wand2,
  Folder, FolderOpen, ChevronRight, ChevronDown, Sparkles, Play, Volume2,
  ExternalLink, Layers, Gamepad2, Package, Tag, Palette, Users, Sparkle,
  Filter, CheckSquare, Square, RefreshCw, Music, Copy,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  listMedia,
  uploadMedia,
  deleteMedia,
  renameMedia,
  replaceMedia,
  downloadMedia,
  compressAndUpload,
  convertImageAndUpload,
  scanMediaUsage,
  fetchAllMediaUsages,
  syncBucketToTable,
  ImageOutputFormat,
  MediaSort,
  MediaRecord,
  MediaUsage,
  UsageCategory,
} from '../../services/mediaService';

const formatBytes = (bytes?: number | null): string => {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const mimeIcon = (mime?: string | null) => {
  if (!mime) return FileIcon;
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Video;
  if (mime.startsWith('audio/')) return Music;
  if (mime.startsWith('text/')) return FileText;
  return FileIcon;
};

const mimeLabel = (mime?: string | null): string => {
  if (!mime) return 'Unknown';
  if (mime.startsWith('image/')) return 'Image';
  if (mime.startsWith('video/')) return 'Video';
  if (mime.startsWith('audio/')) return 'Audio';
  if (mime.startsWith('text/')) return 'Text';
  return 'File';
};

type ViewMode = 'grid' | 'list';
type MimeFilter = 'all' | 'image/' | 'video/' | 'audio/' | 'application/' | 'text/';
type FolderNavTab = 'usage' | 'storage';

interface FolderItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  count: number;
  subCategories?: Array<{ id: string; name: string; count: number }>;
}

const sortOptions: Array<{ value: MediaSort; label: string }> = [
  { value: 'date-desc', label: 'Date: newest first' },
  { value: 'date-asc', label: 'Date: oldest first' },
  { value: 'name-asc', label: 'Name: A-Z' },
  { value: 'name-desc', label: 'Name: Z-A' },
  { value: 'size-desc', label: 'Size: largest first' },
  { value: 'size-asc', label: 'Size: smallest first' },
];

const imageFormatOptions: Array<{ value: ImageOutputFormat; label: string }> = [
  { value: 'image/webp', label: 'WebP' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/jpeg', label: 'JPEG / JPG' },
];

const unsupportedVideoFormats = ['GIF', 'MP4', 'MP2', 'AVI', '3GP'];

const StoragePage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<MediaRecord[]>([]);
  const [usageMap, setUsageMap] = useState<Record<string, MediaUsage[]>>({});
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MediaSort>('date-desc');
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<MediaRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<MediaRecord | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Folder navigation state
  const [folderTab, setFolderTab] = useState<FolderNavTab>('usage');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [activeSubFolder, setActiveSubFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['homepage']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all media and batch usage map
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listMedia({
        sort,
      });
      setRecords(data);
      // Scan all usages in batch
      setUsageLoading(true);
      const usages = await fetchAllMediaUsages(data);
      setUsageMap(usages);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load media');
    } finally {
      setLoading(false);
      setUsageLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    load();
  }, [load]);

  // Extract storage folders from records
  const storageFolders = useMemo(() => {
    const folderSet = new Set<string>();
    records.forEach((r) => {
      if (r.storage_path.includes('/')) {
        const parts = r.storage_path.split('/');
        if (parts.length > 1) folderSet.add(parts[0]);
      } else {
        folderSet.add('root');
      }
    });
    return Array.from(folderSet).sort();
  }, [records]);

  // Dynamic counts for usage folders
  const usageFolderItems = useMemo<FolderItem[]>(() => {
    let inUseCount = 0;
    let unusedCount = 0;
    let homepageCount = 0;
    let heroCount = 0;
    let aboutCount = 0;
    let trendingCount = 0;
    let exclusiveCount = 0;
    let gamesCount = 0;
    let productsCount = 0;
    let eventsCount = 0;
    let brandingCount = 0;
    let profilesCount = 0;

    records.forEach((r) => {
      const u = usageMap[r.id] || [];
      if (u.length > 0) inUseCount++;
      else unusedCount++;

      const isHomepage = u.some((x) => x.category === 'homepage');
      if (isHomepage) homepageCount++;

      if (u.some((x) => x.category === 'homepage' && x.subCategory?.includes('Hero'))) heroCount++;
      if (u.some((x) => x.category === 'homepage' && x.subCategory?.includes('About'))) aboutCount++;
      if (u.some((x) => x.category === 'homepage' && x.subCategory?.includes('Trending'))) trendingCount++;
      if (u.some((x) => x.category === 'homepage' && x.subCategory?.includes('Exclusive'))) exclusiveCount++;
      if (u.some((x) => x.category === 'games')) gamesCount++;
      if (u.some((x) => x.category === 'products')) productsCount++;
      if (u.some((x) => x.category === 'events' || x.category === 'cms')) eventsCount++;
      if (u.some((x) => x.category === 'branding')) brandingCount++;
      if (u.some((x) => x.category === 'profiles')) profilesCount++;
    });

    return [
      { id: 'all', name: 'All Media', icon: HardDrive, count: records.length },
      { id: 'in_use', name: 'In Use (Active)', icon: Sparkles, color: 'text-violet-600', count: inUseCount },
      { id: 'unused', name: 'Unused Assets', icon: AlertTriangle, color: 'text-amber-500', count: unusedCount },
      {
        id: 'homepage',
        name: 'Homepage',
        icon: Layers,
        color: 'text-indigo-600',
        count: homepageCount,
        subCategories: [
          { id: 'homepage_all', name: 'All Homepage', count: homepageCount },
          { id: 'homepage_hero', name: 'Hero Section', count: heroCount },
          { id: 'homepage_about', name: 'About Section', count: aboutCount },
          { id: 'homepage_trending', name: 'Trending Carousel', count: trendingCount },
          { id: 'homepage_exclusive', name: 'Exclusive Offers', count: exclusiveCount },
        ],
      },
      { id: 'games', name: 'Games Catalog', icon: Gamepad2, color: 'text-blue-600', count: gamesCount },
      { id: 'products', name: 'Products & SKUs', icon: Package, color: 'text-emerald-600', count: productsCount },
      { id: 'events', name: 'Events & CMS', icon: Sparkle, color: 'text-pink-600', count: eventsCount },
      { id: 'branding', name: 'Branding & Theme', icon: Palette, color: 'text-amber-600', count: brandingCount },
      { id: 'profiles', name: 'User Avatars', icon: Users, color: 'text-cyan-600', count: profilesCount },
    ];
  }, [records, usageMap]);

  // Dynamic counts for storage folders
  const storageFolderItems = useMemo<FolderItem[]>(() => {
    return [
      { id: 'storage_all', name: 'All Storage Paths', icon: Folder, count: records.length },
      ...storageFolders.map((f) => {
        const count = records.filter((r) => {
          if (f === 'root') return !r.storage_path.includes('/');
          return r.storage_path.startsWith(`${f}/`);
        }).length;
        return {
          id: `storage_${f}`,
          name: f === 'root' ? 'root / uncategorized' : `${f}/`,
          icon: FolderOpen,
          count,
        };
      }),
    ];
  }, [records, storageFolders]);

  // Filtering records based on active folder, search, MIME type
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const usages = usageMap[record.id] || [];

      // 1. MIME filter
      if (mimeFilter !== 'all') {
        if (!record.mime_type?.startsWith(mimeFilter)) return false;
      }

      // 2. Search query (matches filename, storage path, or connected record name)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = record.filename.toLowerCase().includes(q);
        const matchesPath = record.storage_path.toLowerCase().includes(q);
        const matchesUsage = usages.some(
          (u) =>
            u.recordName.toLowerCase().includes(q) ||
            u.subCategory?.toLowerCase().includes(q) ||
            u.table.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesPath && !matchesUsage) return false;
      }

      // 3. Folder filter
      if (folderTab === 'usage') {
        if (activeFolder === 'all') return true;
        if (activeFolder === 'in_use') return usages.length > 0;
        if (activeFolder === 'unused') return usages.length === 0;

        if (activeFolder === 'homepage') {
          if (!activeSubFolder || activeSubFolder === 'homepage_all') {
            return usages.some((u) => u.category === 'homepage');
          }
          if (activeSubFolder === 'homepage_hero') {
            return usages.some((u) => u.category === 'homepage' && u.subCategory?.includes('Hero'));
          }
          if (activeSubFolder === 'homepage_about') {
            return usages.some((u) => u.category === 'homepage' && u.subCategory?.includes('About'));
          }
          if (activeSubFolder === 'homepage_trending') {
            return usages.some((u) => u.category === 'homepage' && u.subCategory?.includes('Trending'));
          }
          if (activeSubFolder === 'homepage_exclusive') {
            return usages.some((u) => u.category === 'homepage' && u.subCategory?.includes('Exclusive'));
          }
          return usages.some((u) => u.category === 'homepage');
        }

        if (activeFolder === 'games') return usages.some((u) => u.category === 'games');
        if (activeFolder === 'products') return usages.some((u) => u.category === 'products');
        if (activeFolder === 'events') return usages.some((u) => u.category === 'events' || u.category === 'cms');
        if (activeFolder === 'branding') return usages.some((u) => u.category === 'branding');
        if (activeFolder === 'profiles') return usages.some((u) => u.category === 'profiles');
      } else {
        // Storage path tab
        if (activeFolder === 'storage_all') return true;
        const targetFolder = activeFolder.replace(/^storage_/, '');
        if (targetFolder === 'root') return !record.storage_path.includes('/');
        return record.storage_path.startsWith(`${targetFolder}/`);
      }

      return true;
    });
  }, [records, usageMap, mimeFilter, search, folderTab, activeFolder, activeSubFolder]);

  // Target upload folder derived from current view
  const targetUploadFolder = useMemo(() => {
    if (folderTab === 'storage' && activeFolder.startsWith('storage_') && activeFolder !== 'storage_all') {
      const f = activeFolder.replace(/^storage_/, '');
      return f === 'root' ? '' : f;
    }
    if (folderTab === 'usage') {
      if (activeFolder === 'homepage') return 'hero';
      if (activeFolder === 'games') return 'games';
      if (activeFolder === 'products') return 'products';
      if (activeFolder === 'branding') return 'branding';
      if (activeFolder === 'profiles') return 'avatars';
    }
    return '';
  }, [folderTab, activeFolder]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const fileList = Array.from(files);
    let successCount = 0;
    try {
      for (const file of fileList) {
        const record = await uploadMedia(file, targetUploadFolder);
        setRecords((prev) => [record, ...prev]);
        successCount++;
      }
      toast.success(`Uploaded ${successCount} file(s)`);
      // Refresh usages
      load();
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await handleUpload(e.dataTransfer.files);
  };

  const handleDelete = async (record: MediaRecord) => {
    if (!window.confirm(`Delete "${record.filename}"? This cannot be undone.`)) return;
    try {
      await deleteMedia(record);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      if (selected?.id === record.id) {
        setSelected(null);
        setDetailOpen(false);
      }
      toast.success('Deleted');
    } catch (err) {
      toast.error((err as Error).message || 'Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected files?`)) return;
    try {
      for (const id of selectedIds) {
        const record = records.find((r) => r.id === id);
        if (record) await deleteMedia(record);
      }
      setRecords((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      toast.success('Deleted selected files');
    } catch (err) {
      toast.error((err as Error).message || 'Bulk delete failed');
    }
  };

  const handleDownload = async (record: MediaRecord) => {
    try {
      const blob = await downloadMedia(record);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = record.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      toast.error((err as Error).message || 'Download failed');
    }
  };

  const handleSyncBucket = async () => {
    setSyncing(true);
    try {
      const { created, skipped } = await syncBucketToTable();
      if (created > 0) {
        toast.success(`Indexed ${created} new file(s) from bucket`);
        load();
      } else {
        toast(`Bucket is already synced (${skipped} existing)`);
      }
    } catch (err) {
      toast.error((err as Error).message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleCompress = async (record: MediaRecord) => {
    if (!record.mime_type?.startsWith('image/')) {
      toast.error('Only images can be compressed');
      return;
    }
    try {
      const folder = record.storage_path.includes('/') ? record.storage_path.split('/')[0] : '';
      const resp = await fetch(record.public_url);
      const blob = await resp.blob();
      const fileFromBlob = new File([blob], record.filename, { type: record.mime_type || 'application/octet-stream' });
      const compressed = await compressAndUpload(fileFromBlob, 1200, 0.8, folder);
      setRecords((prev) => [compressed, ...prev]);
      toast.success('Compressed copy created');
    } catch (err) {
      toast.error((err as Error).message || 'Compression failed');
    }
  };

  const handleConvertImage = async (
    record: MediaRecord,
    outputFormat: ImageOutputFormat,
    maxWidth: number,
    quality: number
  ) => {
    if (!record.mime_type?.startsWith('image/')) {
      toast.error('Only images can be converted in-browser');
      return;
    }
    try {
      const folder = record.storage_path.includes('/') ? record.storage_path.split('/')[0] : '';
      const resp = await fetch(record.public_url);
      const blob = await resp.blob();
      const fileFromBlob = new File([blob], record.filename, { type: record.mime_type || 'application/octet-stream' });
      const converted = await convertImageAndUpload(fileFromBlob, outputFormat, { maxWidth, quality, folder });
      setRecords((prev) => [converted, ...prev]);
      toast.success('Converted copy created');
    } catch (err) {
      toast.error((err as Error).message || 'Conversion failed');
    }
  };

  const openDetail = (record: MediaRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map((r) => r.id));
    }
  };

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const totalSize = records.reduce((sum, r) => sum + (r.size_bytes ?? 0), 0);
  const imageCount = records.filter((r) => r.mime_type?.startsWith('image/')).length;
  const videoCount = records.filter((r) => r.mime_type?.startsWith('video/')).length;
  const audioCount = records.filter((r) => r.mime_type?.startsWith('audio/')).length;

  const currentFolderTitle = useMemo(() => {
    if (folderTab === 'usage') {
      const item = usageFolderItems.find((f) => f.id === activeFolder);
      if (activeFolder === 'homepage' && activeSubFolder) {
        const sub = item?.subCategories?.find((s) => s.id === activeSubFolder);
        return `Homepage / ${sub?.name || 'All'}`;
      }
      return item?.name || 'All Media';
    } else {
      const item = storageFolderItems.find((f) => f.id === activeFolder);
      return item?.name || 'Storage Root';
    }
  }, [folderTab, activeFolder, activeSubFolder, usageFolderItems, storageFolderItems]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Storage & Media Manager</h1>
            {usageLoading && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Indexing usage...
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Organized folder browsing, video previews, and live media usage tracking across all pages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncBucket}
            disabled={syncing}
            className="btn btn-outline btn-sm"
            title="Scan storage bucket for untracked files"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Scanning...' : 'Sync Bucket'}
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary btn-sm shadow-sm"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            {uploading ? 'Uploading...' : targetUploadFolder ? `Upload to ${targetUploadFolder}/` : 'Upload Media'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </motion.div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Files</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-gray-900">{records.length}</p>
            <span className="text-xs text-gray-500 font-medium">{formatBytes(totalSize)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Images</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-blue-600">{imageCount}</p>
            <span className="text-xs text-gray-400">Photos & Cards</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Videos</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-purple-600">{videoCount}</p>
            <span className="text-xs text-purple-600 font-medium">Interactive Preview</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active In Use</p>
          <div className="flex items-baseline justify-between mt-1">
            <p className="text-xl font-bold text-emerald-600">
              {records.filter((r) => (usageMap[r.id] || []).length > 0).length}
            </p>
            <span className="text-xs text-amber-600 font-medium">
              {records.filter((r) => (usageMap[r.id] || []).length === 0).length} Unused
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Folders + Right Media Browser */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
        {/* Left Folder Navigation Sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-20">
          {/* Tab switch: By Usage vs By Storage Path */}
          <div className="border-b border-gray-200 bg-gray-50/70 p-2 flex gap-1">
            <button
              type="button"
              onClick={() => {
                setFolderTab('usage');
                setActiveFolder('all');
                setActiveSubFolder(null);
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                folderTab === 'usage'
                  ? 'bg-white text-violet-700 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Where Used
            </button>
            <button
              type="button"
              onClick={() => {
                setFolderTab('storage');
                setActiveFolder('storage_all');
                setActiveSubFolder(null);
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                folderTab === 'storage'
                  ? 'bg-white text-violet-700 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Storage Paths
            </button>
          </div>

          {/* Folder List */}
          <div className="p-2 space-y-0.5 max-h-[calc(100vh-280px)] overflow-y-auto">
            {folderTab === 'usage' ? (
              <>
                <div className="px-2.5 py-1 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Usage Folders
                </div>
                {usageFolderItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeFolder === item.id;
                  const isExpanded = expandedFolders.includes(item.id);
                  const hasSub = item.subCategories && item.subCategories.length > 0;

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFolder(item.id);
                          setActiveSubFolder(null);
                          if (hasSub && !isExpanded) toggleFolderExpanded(item.id);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-violet-50 text-violet-900 font-semibold border border-violet-200/60'
                            : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${item.color || 'text-gray-500'}`} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              isSelected
                                ? 'bg-violet-200 text-violet-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {item.count}
                          </span>
                          {hasSub && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFolderExpanded(item.id);
                              }}
                              className="p-0.5 hover:bg-gray-200/60 rounded"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Sub-categories */}
                      {hasSub && isExpanded && (
                        <div className="pl-6 space-y-0.5 py-0.5 border-l-2 border-violet-100 ml-3">
                          {item.subCategories!.map((sub) => {
                            const isSubActive = isSelected && activeSubFolder === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setActiveFolder(item.id);
                                  setActiveSubFolder(sub.id);
                                }}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                                  isSubActive
                                    ? 'bg-violet-100 text-violet-900 font-bold'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                              >
                                <span className="truncate">{sub.name}</span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-500">
                                  {sub.count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="px-2.5 py-1 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Storage Folders
                </div>
                {storageFolderItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeFolder === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveFolder(item.id);
                        setActiveSubFolder(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-violet-50 text-violet-900 font-semibold border border-violet-200/60'
                          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 text-amber-500" />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSelected ? 'bg-violet-200 text-violet-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Right Main Content Panel */}
        <div className="space-y-4">
          {/* Active Folder Header + Filter Toolbar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-violet-600" />
                <h2 className="text-base font-bold text-gray-900">{currentFolderTitle}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {filteredRecords.length} items
                </span>
              </div>

              {/* Bulk actions */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-1 rounded">
                    {selectedIds.length} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete ({selectedIds.length})
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Search, Type Filter, Sort, View Mode Controls */}
            <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.5fr)_150px_190px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by filename or where used (e.g. Hero, MLBB)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-9 text-xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                className="input text-xs py-1.5"
                value={mimeFilter}
                onChange={(e) => setMimeFilter(e.target.value as MimeFilter)}
              >
                <option value="all">All File Types</option>
                <option value="image/">Images</option>
                <option value="video/">Videos</option>
                <option value="audio/">Audio</option>
                <option value="application/">Documents</option>
                <option value="text/">Text</option>
              </select>

              <select
                className="input text-xs py-1.5"
                value={sort}
                onChange={(e) => setSort(e.target.value as MediaSort)}
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    viewMode === 'grid'
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    viewMode === 'list'
                      ? 'bg-white text-violet-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Drag & Drop Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-4 text-center transition-all ${
              dragOver ? 'border-violet-600 bg-violet-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              <Upload className={`w-5 h-5 ${dragOver ? 'text-violet-600' : 'text-gray-400'}`} />
              <p className="text-xs text-gray-600">
                Drag & drop files here to upload to{' '}
                <span className="font-semibold text-violet-700">
                  {targetUploadFolder ? `${targetUploadFolder}/` : 'root/ (media)'}
                </span>{' '}
                or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-violet-600 font-semibold hover:underline"
                >
                  browse files
                </button>
              </p>
            </div>
          </div>

          {/* Media Browser Grid / List */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
              <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">Loading media library...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-16 text-center shadow-sm">
              <HardDrive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No media files found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {search
                  ? `No media matches "${search}". Try adjusting your search query.`
                  : `No media currently in folder "${currentFolderTitle}".`}
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm">
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload here
                </button>
                {search && (
                  <button onClick={() => setSearch('')} className="btn btn-outline btn-sm">
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredRecords.map((record) => {
                const usages = usageMap[record.id] || [];
                const isSelected = selectedIds.includes(record.id);

                return (
                  <MediaGridCard
                    key={record.id}
                    record={record}
                    usages={usages}
                    isSelected={isSelected}
                    onToggleSelect={() => toggleSelect(record.id)}
                    onOpen={() => openDetail(record)}
                    onPlayVideo={() => setPreviewVideo(record)}
                  />
                );
              })}
            </div>
          ) : (
            <MediaListView
              records={filteredRecords}
              usageMap={usageMap}
              selectedIds={selectedIds}
              onToggleSelectAll={toggleSelectAll}
              onToggleSelect={toggleSelect}
              onOpen={openDetail}
              onDownload={handleDownload}
              onPlayVideo={(r) => setPreviewVideo(r)}
            />
          )}
        </div>
      </div>

      {/* Video Lightbox / Fullscreen Preview Modal */}
      <AnimatePresence>
        {previewVideo && (
          <VideoModal
            record={previewVideo}
            usages={usageMap[previewVideo.id] || []}
            onClose={() => setPreviewVideo(null)}
            onOpenDetail={() => {
              const r = previewVideo;
              setPreviewVideo(null);
              openDetail(r);
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail Slideover Panel */}
      <AnimatePresence>
        {detailOpen && selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetail}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <DetailPanel
                record={selected}
                usages={usageMap[selected.id] || []}
                onClose={closeDetail}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onCompress={handleCompress}
                onConvertImage={handleConvertImage}
                onNavigate={(path) => {
                  closeDetail();
                  navigate(path);
                }}
                onRename={async (name, renameStorage) => {
                  const updated = await renameMedia(selected, name, renameStorage);
                  setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                  setSelected(updated);
                  toast.success('Renamed');
                }}
                onReplace={async (file) => {
                  const updated = await replaceMedia(selected, file);
                  setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
                  setSelected(updated);
                  toast.success('Replaced');
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Media Grid Card (with live interactive video preview & usage tags)
// ============================================================
const MediaGridCard: React.FC<{
  record: MediaRecord;
  usages: MediaUsage[];
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onPlayVideo: () => void;
}> = ({ record, usages, isSelected, onToggleSelect, onOpen, onPlayVideo }) => {
  const isImage = record.mime_type?.startsWith('image/');
  const isVideo = record.mime_type?.startsWith('video/');
  const isAudio = record.mime_type?.startsWith('audio/');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const primaryUsage = usages[0];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative rounded-xl border bg-white shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
        isSelected ? 'border-violet-500 ring-2 ring-violet-200' : 'border-gray-200 hover:border-violet-300'
      }`}
    >
      {/* Top Media Preview Area */}
      <div
        onClick={onOpen}
        className="relative aspect-video w-full bg-gray-900 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {isImage ? (
          <img
            src={record.public_url}
            alt={record.filename}
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : isVideo ? (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              src={record.public_url}
              muted
              playsInline
              loop
              preload="metadata"
              className="w-full h-full object-contain"
            />
            {/* Play badge overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayVideo();
                }}
                className="rounded-full bg-black/60 p-2 text-white backdrop-blur-xs hover:scale-110 hover:bg-violet-600 transition-all shadow-md"
                title="Play Video"
              >
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </button>
            </div>
            {/* Video label tag */}
            <span className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white tracking-wider uppercase flex items-center gap-1">
              <Video className="w-2.5 h-2.5 text-purple-400" />
              Video
            </span>
          </div>
        ) : isAudio ? (
          <div className="flex flex-col items-center justify-center p-4 text-violet-400">
            <Music className="w-10 h-10 mb-1" />
            <span className="text-[10px] text-gray-400">Audio Track</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-gray-400">
            <FileIcon className="w-10 h-10 mb-1" />
            <span className="text-[10px] uppercase font-bold">{mimeLabel(record.mime_type)}</span>
          </div>
        )}

        {/* Checkbox select */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={`absolute top-2 left-2 z-10 rounded-md p-1 transition-opacity ${
            isSelected ? 'opacity-100 bg-violet-600 text-white' : 'opacity-0 group-hover:opacity-100 bg-white/90 text-gray-600 hover:bg-white'
          }`}
        >
          {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Body Info */}
      <div className="p-3 flex-1 flex flex-col justify-between" onClick={onOpen}>
        <div>
          <p className="text-xs font-semibold text-gray-900 truncate cursor-pointer hover:text-violet-700" title={record.filename}>
            {record.filename}
          </p>

          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
            <span>{mimeLabel(record.mime_type)}</span>
            <span>{formatBytes(record.size_bytes)}</span>
          </div>
        </div>

        {/* Connected Usage Badges */}
        <div className="mt-2.5 pt-2 border-t border-gray-100">
          {usages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-100 truncate max-w-full">
                <Sparkles className="w-2.5 h-2.5 shrink-0 text-violet-500" />
                <span className="truncate">{primaryUsage.subCategory || primaryUsage.recordName}</span>
              </span>
              {usages.length > 1 && (
                <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] font-medium text-gray-600">
                  +{usages.length - 1}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100">
              <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
              Unused
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Media List View (with video indicator & usage badges)
// ============================================================
const MediaListView: React.FC<{
  records: MediaRecord[];
  usageMap: Record<string, MediaUsage[]>;
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onOpen: (record: MediaRecord) => void;
  onDownload: (record: MediaRecord) => void;
  onPlayVideo: (record: MediaRecord) => void;
}> = ({ records, usageMap, selectedIds, onToggleSelectAll, onToggleSelect, onOpen, onDownload, onPlayVideo }) => (
  <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-3 py-3 w-8">
              <input
                type="checkbox"
                checked={records.length > 0 && selectedIds.length === records.length}
                onChange={onToggleSelectAll}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
            </th>
            <th className="px-3 py-3">File</th>
            <th className="px-3 py-3">Used Where</th>
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Size</th>
            <th className="px-3 py-3">Dimensions</th>
            <th className="px-3 py-3">Uploaded</th>
            <th className="px-3 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-xs">
          {records.map((record) => {
            const usages = usageMap[record.id] || [];
            const isSelected = selectedIds.includes(record.id);
            const isImage = record.mime_type?.startsWith('image/');
            const isVideo = record.mime_type?.startsWith('video/');
            const isAudio = record.mime_type?.startsWith('audio/');
            const Icon = mimeIcon(record.mime_type);

            return (
              <tr key={record.id} className={`hover:bg-gray-50/80 ${isSelected ? 'bg-violet-50/40' : ''}`}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(record.id)}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                </td>
                <td className="px-3 py-3">
                  <button type="button" onClick={() => onOpen(record)} className="flex items-center gap-3 text-left">
                    <div className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-900">
                      {isImage ? (
                        <img src={record.public_url} alt="" className="h-full w-full object-cover" />
                      ) : isVideo ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <video src={record.public_url} muted preload="metadata" className="h-full w-full object-contain" />
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayVideo(record);
                            }}
                            className="absolute inset-0 bg-black/30 flex items-center justify-center hover:bg-black/10"
                          >
                            <Play className="w-3 h-3 text-white fill-white" />
                          </div>
                        </div>
                      ) : (
                        <Icon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-semibold text-gray-900 hover:text-violet-700">
                        {record.filename}
                      </span>
                      <span className="block truncate text-[11px] text-gray-400">{record.storage_path}</span>
                    </div>
                  </button>
                </td>
                <td className="px-3 py-3">
                  {usages.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700">
                        <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
                        {usages[0].subCategory || usages[0].recordName}
                      </span>
                      {usages.length > 1 && (
                        <span className="text-[10px] text-gray-400">+{usages.length - 1} other places</span>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      Unused
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-gray-600">{mimeLabel(record.mime_type)}</td>
                <td className="px-3 py-3 text-gray-600">{formatBytes(record.size_bytes)}</td>
                <td className="px-3 py-3 text-gray-600">
                  {record.width && record.height ? `${record.width} × ${record.height}` : '—'}
                </td>
                <td className="px-3 py-3 text-gray-600">
                  {record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isVideo && (
                      <button
                        type="button"
                        onClick={() => onPlayVideo(record)}
                        className="rounded-lg p-1.5 text-purple-600 hover:bg-purple-50"
                        title="Play Video"
                      >
                        <Play className="h-3.5 w-3.5 fill-purple-600" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDownload(record)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpen(record)}
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      title="Details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// ============================================================
// Video Player Modal (Fullscreen Lightbox)
// ============================================================
const VideoModal: React.FC<{
  record: MediaRecord;
  usages: MediaUsage[];
  onClose: () => void;
  onOpenDetail: () => void;
}> = ({ record, usages, onClose, onOpenDetail }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-gray-950/70 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="w-5 h-5 text-purple-400 shrink-0" />
            <h3 className="text-sm font-semibold truncate">{record.filename}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenDetail}
              className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-medium text-white hover:bg-white/20"
            >
              Inspect Details
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          <video
            src={record.public_url}
            controls
            autoPlay
            playsInline
            className="w-full h-full max-h-[70vh] object-contain"
          />
        </div>

        {/* Footer info */}
        <div className="p-4 bg-gray-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-300">
          <div className="flex flex-wrap items-center gap-3">
            <span>Size: <strong className="text-white">{formatBytes(record.size_bytes)}</strong></span>
            <span>Path: <code className="text-purple-300">{record.storage_path}</code></span>
          </div>

          <div className="flex items-center gap-2">
            {usages.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-violet-300 font-semibold bg-violet-950/60 border border-violet-800/40 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3 h-3 text-violet-400" />
                Used in: {usages[0].subCategory || usages[0].recordName}
              </span>
            ) : (
              <span className="text-amber-400">Unused file</span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================
// Detail Panel (Sub-component with direct links to usage targets)
// ============================================================
const DetailPanel: React.FC<{
  record: MediaRecord;
  usages: MediaUsage[];
  onClose: () => void;
  onDelete: (r: MediaRecord) => void;
  onDownload: (r: MediaRecord) => void;
  onCompress: (r: MediaRecord) => void;
  onConvertImage: (r: MediaRecord, outputFormat: ImageOutputFormat, maxWidth: number, quality: number) => Promise<void>;
  onRename: (name: string, renameStorage: boolean) => Promise<void>;
  onReplace: (file: File) => Promise<void>;
  onNavigate: (path: string) => void;
}> = ({
  record, usages, onClose, onDelete, onDownload, onCompress, onConvertImage, onRename, onReplace, onNavigate,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(record.filename);
  const [renameStorage, setRenameStorage] = useState(false);
  const [outputFormat, setOutputFormat] = useState<ImageOutputFormat>('image/webp');
  const [quality, setQuality] = useState(82);
  const [maxWidth, setMaxWidth] = useState(1600);
  const [converting, setConverting] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const isImage = record.mime_type?.startsWith('image/');
  const isVideo = record.mime_type?.startsWith('video/');
  const isAudio = record.mime_type?.startsWith('audio/');

  const handleRenameSave = async () => {
    if (!newName.trim() || newName.trim() === record.filename) {
      setRenaming(false);
      return;
    }
    await onRename(newName.trim(), renameStorage);
    setRenaming(false);
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      await onConvertImage(record, outputFormat, maxWidth, quality / 100);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-gray-900">Asset Details</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onDownload(record)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Download">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(record)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Preview Box */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/50">
        {isImage ? (
          <div className="rounded-xl overflow-hidden bg-white border border-gray-200 p-2 flex items-center justify-center">
            <img
              src={record.public_url}
              alt={record.filename}
              className="w-full max-h-64 object-contain rounded-lg"
            />
          </div>
        ) : isVideo ? (
          <div className="rounded-xl overflow-hidden bg-black border border-gray-900 shadow-inner">
            <video
              src={record.public_url}
              controls
              autoPlay
              muted
              playsInline
              className="w-full max-h-64 object-contain"
            />
          </div>
        ) : isAudio ? (
          <div className="rounded-xl p-4 bg-white border border-gray-200 space-y-2">
            <div className="flex items-center gap-2 text-violet-600 font-semibold text-sm">
              <Volume2 className="w-5 h-5" />
              <span>Audio Player</span>
            </div>
            <audio src={record.public_url} controls className="w-full mt-2" />
          </div>
        ) : (
          <div className="rounded-xl bg-gray-100 h-48 flex items-center justify-center">
            <FileIcon className="w-16 h-16 text-gray-400" />
          </div>
        )}
      </div>

      {/* Connected Usage Section with Direct Links */}
      <div className="p-4 border-b border-gray-200 bg-violet-50/30">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-violet-600" />
          Active Usage ({usages.length})
        </h3>
        {usages.length === 0 ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200/60 p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">Not currently linked anywhere</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                This media is safe to clean up or link to a new game, homepage card, or setting.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {usages.map((u, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl bg-white border border-violet-100 p-3 shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-violet-100 text-[10px] font-bold text-violet-800 uppercase tracking-wide">
                    {u.category}
                  </span>
                  <p className="text-xs font-semibold text-gray-900 mt-1 truncate">{u.recordName}</p>
                  <p className="text-[10px] text-gray-500">
                    {u.subCategory ? `${u.subCategory} · ` : ''}
                    {u.field}
                  </p>
                </div>
                {u.adminLink && (
                  <button
                    type="button"
                    onClick={() => onNavigate(u.adminLink!)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                  >
                    Open Editor
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata & Actions */}
      <div className="p-4 border-b border-gray-200 space-y-3.5">
        {/* Filename */}
        <div>
          <label className="label mb-1 block text-xs text-gray-500 font-semibold">Filename</label>
          {renaming ? (
            <div className="space-y-2">
              <input
                className="input text-xs"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSave();
                }}
                autoFocus
              />
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={renameStorage}
                  onChange={(e) => setRenameStorage(e.target.checked)}
                />
                Also rename storage object
              </label>
              <div className="flex gap-2">
                <button onClick={handleRenameSave} className="btn btn-primary btn-sm text-xs">Save</button>
                <button onClick={() => { setRenaming(false); setNewName(record.filename); }} className="btn btn-outline btn-sm text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 break-all">{record.filename}</p>
              <button onClick={() => setRenaming(true)} className="text-violet-600 hover:text-violet-800 p-1">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block">Type</span>
            <span className="font-semibold text-gray-900">{mimeLabel(record.mime_type)}</span>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block">File Size</span>
            <span className="font-semibold text-gray-900">{formatBytes(record.size_bytes)}</span>
          </div>
          {record.width && record.height && (
            <div className="bg-gray-50 p-2 rounded-lg">
              <span className="text-gray-500 block">Dimensions</span>
              <span className="font-semibold text-gray-900">{record.width} × {record.height} px</span>
            </div>
          )}
          <div className="bg-gray-50 p-2 rounded-lg">
            <span className="text-gray-500 block">Uploaded</span>
            <span className="font-semibold text-gray-900">
              {record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}
            </span>
          </div>
        </div>

        {/* Public URL */}
        <div>
          <span className="label mb-1 block text-xs text-gray-500 font-semibold">Public CDN URL</span>
          <div className="flex gap-2">
            <input readOnly value={record.public_url} className="input text-xs flex-1" />
            <button
              onClick={() => {
                navigator.clipboard.writeText(record.public_url);
                toast.success('URL copied to clipboard');
              }}
              className="btn btn-outline btn-sm whitespace-nowrap text-xs"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">Asset Operations</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Replace className="w-3.5 h-3.5" />
            Replace Asset
          </button>
          <input
            ref={replaceInputRef}
            type="file"
            className="hidden"
            onChange={async (e) => {
              if (e.target.files?.[0]) await onReplace(e.target.files[0]);
            }}
          />

          {isImage && (
            <button
              onClick={() => onCompress(record)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Compress Image
            </button>
          )}

          <button
            onClick={() => onDownload(record)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>
      </div>

      {/* Optimize / Convert Tool (for images) */}
      {isImage && (
        <div className="p-4">
          <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500">
            <Wand2 className="h-4 w-4 text-violet-600" />
            Convert & Resize Copy
          </h3>
          <div className="space-y-2.5 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
            <div>
              <label className="label mb-1 block text-xs text-gray-500">Output Format</label>
              <select
                className="input text-xs"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as ImageOutputFormat)}
              >
                {imageFormatOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label mb-1 block text-xs text-gray-500">Max Width</label>
                <input
                  type="number"
                  min="320"
                  max="8000"
                  className="input text-xs"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(Number(e.target.value) || 1600)}
                />
              </div>
              <div>
                <label className="label mb-1 block text-xs text-gray-500">Quality (%)</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  className="input text-xs"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value) || 82)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              className="btn btn-primary btn-sm w-full text-xs"
            >
              {converting ? 'Converting Copy...' : 'Generate Optimized Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoragePage;
