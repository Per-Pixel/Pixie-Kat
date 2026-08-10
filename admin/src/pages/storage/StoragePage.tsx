import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Search, Image as ImageIcon, Video, FileText, File as FileIcon,
  Download, Trash2, Edit3, Replace, Minimize2, X,
  Eye, HardDrive, ArrowLeft, Check, AlertTriangle, Grid3X3, List, Wand2,
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
  syncBucketToTable,
  ImageOutputFormat,
  MediaSort,
  MediaRecord,
  MediaUsage,
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
  if (mime.startsWith('text/')) return FileText;
  return FileIcon;
};

const mimeLabel = (mime?: string | null): string => {
  if (!mime) return 'Unknown';
  if (mime.startsWith('image/')) return 'Image';
  if (mime.startsWith('video/')) return 'Video';
  if (mime.startsWith('text/')) return 'Text';
  return 'File';
};

type ViewMode = 'grid' | 'list';
type MimeFilter = 'all' | 'image/' | 'video/' | 'application/' | 'text/';

const sortOptions: Array<{ value: MediaSort; label: string }> = [
  { value: 'date-desc', label: 'Date uploaded: newest first' },
  { value: 'date-asc', label: 'Date uploaded: oldest first' },
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
  const [records, setRecords] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MediaSort>('date-desc');
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<MediaRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [usage, setUsage] = useState<MediaUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listMedia({
        search: search || undefined,
        mimeType: mimeFilter === 'all' ? undefined : mimeFilter,
        sort,
      });
      setRecords(data);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load media');
    } finally {
      setLoading(false);
    }
  }, [search, mimeFilter, sort]);

  useEffect(() => {
    load();
  }, [load]);

  // Load usage when detail panel opens
  useEffect(() => {
    if (!selected) return;
    setUsageLoading(true);
    scanMediaUsage(selected)
      .then((u) => setUsage(u))
      .catch(() => setUsage([]))
      .finally(() => setUsageLoading(false));
  }, [selected?.id]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const record = await uploadMedia(file);
      setRecords((prev) => [record, ...prev]);
      toast.success(`Uploaded "${record.filename}"`);
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed');
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

  const totalSize = records.reduce((sum, r) => sum + (r.size_bytes ?? 0), 0);
  const imageCount = records.filter((r) => r.mime_type?.startsWith('image/')).length;

  const openDetail = (record: MediaRecord) => {
    setSelected(record);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setTimeout(() => setSelected(null), 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Storage</h1>
          <p className="text-gray-600 mt-1">Browse, upload, and manage all media assets</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 sm:mt-0 btn btn-primary btn-md"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Files</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{records.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Total Size</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatBytes(totalSize)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Images</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{imageCount}</p>
        </div>
      </motion.div>

      {/* Search + Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_180px_240px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by filename..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              className="input"
              value={mimeFilter}
              onChange={(e) => setMimeFilter(e.target.value as MimeFilter)}
            >
              <option value="all">All types</option>
              <option value="image/">Images</option>
              <option value="video/">Videos</option>
              <option value="application/">Documents</option>
              <option value="text/">Text files</option>
            </select>
            <select
              className="input"
              value={sort}
              onChange={(e) => setSort(e.target.value as MediaSort)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${viewMode === 'grid' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <Grid3X3 className="h-4 w-4" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${viewMode === 'list' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <List className="h-4 w-4" />
                List
              </button>
            </div>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white'
          }`}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-primary-600' : 'text-gray-400'}`} />
          <p className="text-sm text-gray-600">
            Drag & drop files here, or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-primary-600 font-medium hover:underline"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-gray-400 mt-1">Images, videos, PDFs and archives. Large files depend on your Supabase bucket limit.</p>
        </div>
      </motion.div>

      {/* Media browser */}
      {loading ? (
        <div className="p-12 text-center text-gray-500">Loading media…</div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <HardDrive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No media yet.</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-outline btn-sm">
              Upload your first file
            </button>
            <button
              onClick={handleSyncBucket}
              disabled={syncing}
              className="btn btn-outline btn-sm"
            >
              {syncing ? 'Scanning…' : 'Scan Bucket'}
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {records.map((record) => (
            <MediaGridCard key={record.id} record={record} onOpen={openDetail} />
          ))}
        </div>
      ) : (
        <MediaListView records={records} onOpen={openDetail} onDownload={handleDownload} />
      )}

      {/* Detail Panel */}
      <AnimatePresence>
        {detailOpen && selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDetail}
              className="fixed inset-0 bg-black/30 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <DetailPanel
                record={selected}
                usage={usage}
                usageLoading={usageLoading}
                onClose={closeDetail}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onCompress={handleCompress}
                onConvertImage={handleConvertImage}
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

const MediaGridCard: React.FC<{
  record: MediaRecord;
  onOpen: (record: MediaRecord) => void;
}> = ({ record, onOpen }) => {
  const Icon = mimeIcon(record.mime_type);
  const isImage = record.mime_type?.startsWith('image/');

  return (
    <div
      onClick={() => onOpen(record)}
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-all hover:border-primary-300"
    >
      <div className="aspect-square rounded-md bg-gray-50 overflow-hidden mb-3 flex items-center justify-center">
        {isImage ? (
          <img
            src={record.public_url}
            alt={record.filename}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Icon className="w-10 h-10 text-gray-400" />
        )}
      </div>
      <p className="text-sm font-medium text-gray-900 truncate" title={record.filename}>
        {record.filename}
      </p>
      <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
        <span>{mimeLabel(record.mime_type)}</span>
        <span>{formatBytes(record.size_bytes)}</span>
      </div>
      {record.width && record.height && (
        <p className="text-[10px] text-gray-400 mt-0.5">
          {record.width} x {record.height}
        </p>
      )}
    </div>
  );
};

const MediaListView: React.FC<{
  records: MediaRecord[];
  onOpen: (record: MediaRecord) => void;
  onDownload: (record: MediaRecord) => void;
}> = ({ records, onOpen, onDownload }) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">File</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Size</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Dimensions</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Uploaded</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.map((record) => {
            const Icon = mimeIcon(record.mime_type);
            const isImage = record.mime_type?.startsWith('image/');

            return (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onOpen(record)} className="flex min-w-[240px] items-center gap-3 text-left">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100">
                      {isImage ? (
                        <img src={record.public_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Icon className="h-6 w-6 text-gray-400" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{record.filename}</span>
                      <span className="block truncate text-xs text-gray-500">{record.storage_path}</span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{mimeLabel(record.mime_type)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatBytes(record.size_bytes)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {record.width && record.height ? `${record.width} x ${record.height}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {record.created_at ? new Date(record.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDownload(record)}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
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
// Detail Panel (sub-component)
// ============================================================
const DetailPanel: React.FC<{
  record: MediaRecord;
  usage: MediaUsage[];
  usageLoading: boolean;
  onClose: () => void;
  onDelete: (r: MediaRecord) => void;
  onDownload: (r: MediaRecord) => void;
  onCompress: (r: MediaRecord) => void;
  onConvertImage: (r: MediaRecord, outputFormat: ImageOutputFormat, maxWidth: number, quality: number) => Promise<void>;
  onRename: (name: string, renameStorage: boolean) => Promise<void>;
  onReplace: (file: File) => Promise<void>;
}> = ({
  record, usage, usageLoading, onClose, onDelete, onDownload, onCompress, onConvertImage, onRename, onReplace,
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => onDownload(record)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Download">
            <Download className="w-5 h-5" />
          </button>
          <button onClick={() => onDelete(record)} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 border-b border-gray-200">
        {isImage ? (
          <div className="rounded-lg overflow-hidden bg-gray-50">
            <img
              src={record.public_url}
              alt={record.filename}
              className="w-full h-48 object-contain"
            />
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 h-48 flex items-center justify-center">
            {(() => {
              const IconComp = mimeIcon(record.mime_type);
              return <IconComp className="w-16 h-16 text-gray-300" />;
            })()}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        {/* Name */}
        <div>
          <label className="label mb-1.5 block text-xs text-gray-500">Filename</label>
          {renaming ? (
            <div className="space-y-2">
              <input
                className="input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSave(); }}
                autoFocus
              />
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={renameStorage}
                  onChange={(e) => setRenameStorage(e.target.checked)}
                />
                Also rename storage object
              </label>
              <div className="flex gap-2">
                <button onClick={handleRenameSave} className="btn btn-primary btn-sm">Save</button>
                <button onClick={() => { setRenaming(false); setNewName(record.filename); }} className="btn btn-outline btn-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 break-all">{record.filename}</p>
              <button onClick={() => setRenaming(true)} className="text-primary-600 hover:text-primary-800">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Type</span>
            <p className="font-medium text-gray-900">{mimeLabel(record.mime_type)}</p>
          </div>
          <div>
            <span className="text-gray-500">Size</span>
            <p className="font-medium text-gray-900">{formatBytes(record.size_bytes)}</p>
          </div>
          {record.width && record.height && (
            <div>
              <span className="text-gray-500">Dimensions</span>
              <p className="font-medium text-gray-900">{record.width} × {record.height}</p>
            </div>
          )}
          <div>
            <span className="text-gray-500">Uploaded</span>
            <p className="font-medium text-gray-900">
              {record.created_at ? new Date(record.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Storage path */}
        <div>
          <span className="label mb-1 block text-xs text-gray-500">Storage Path</span>
          <code className="block text-xs bg-gray-50 rounded p-2 text-gray-700 break-all">{record.storage_path}</code>
        </div>

        {/* Public URL */}
        <div>
          <span className="label mb-1 block text-xs text-gray-500">Public URL</span>
          <div className="flex gap-2">
            <input
              readOnly
              value={record.public_url}
              className="input text-xs flex-1"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(record.public_url);
                toast.success('URL copied');
              }}
              className="btn btn-outline btn-sm whitespace-nowrap"
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => replaceInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Replace className="w-4 h-4" />
            Replace
          </button>
          <input
            ref={replaceInputRef}
            type="file"
            className="hidden"
            onChange={async (e) => {
              if (e.target.files?.[0]) {
                await onReplace(e.target.files[0]);
              }
            }}
          />
          {isImage && (
            <button
              onClick={() => onCompress(record)}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Minimize2 className="w-4 h-4" />
              Compress
            </button>
          )}
          <button
            onClick={() => onDownload(record)}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Optimize / Convert */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Wand2 className="h-4 w-4 text-primary-600" />
          Compress & Convert
        </h3>
        {isImage ? (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div>
              <label className="label mb-1 block text-xs text-gray-500">Convert to</label>
              <select className="input" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as ImageOutputFormat)}>
                {imageFormatOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label mb-1 block text-xs text-gray-500">Max width</label>
                <input
                  type="number"
                  min="320"
                  max="8000"
                  className="input"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(Number(e.target.value) || 1600)}
                />
              </div>
              <div>
                <label className="label mb-1 block text-xs text-gray-500">Quality</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  className="input"
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value) || 82)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              className="btn btn-primary btn-sm w-full"
            >
              {converting ? 'Creating copy...' : 'Create optimized copy'}
            </button>
            <p className="text-xs text-gray-500">
              Supports browser-safe image conversion to WebP, PNG, JPEG, and JPG. GIF animation is not preserved by browser canvas conversion.
            </p>
          </div>
        ) : isVideo ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Video transcoding needs a server encoder.</p>
            <p className="mt-1 text-xs">
              MP4, MP2, AVI, 3GP, GIF, and similar video conversions require FFmpeg or a media worker. This UI is ready for that job hook, but browsers cannot reliably compress and transcode large videos here.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {unsupportedVideoFormats.map((format) => (
                <span key={format} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700">
                  {format}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">Conversion is available for images. Video conversion requires a server encoder.</p>
        )}
      </div>

      {/* Usage */}
      <div className="p-4 flex-1">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-500" />
          Connected To
        </h3>
        {usageLoading ? (
          <p className="text-sm text-gray-500">Scanning…</p>
        ) : usage.length === 0 ? (
          <div className="rounded-lg bg-yellow-50 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium">Not referenced</p>
              <p className="text-xs text-yellow-700 mt-0.5">
                This file is not linked by any game, product, offer, or profile.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {usage.map((u, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.recordName}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {u.table} · {u.field}
                  </p>
                </div>
                <Check className="w-4 h-4 text-green-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoragePage;
