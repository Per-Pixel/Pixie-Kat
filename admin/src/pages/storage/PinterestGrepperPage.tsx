import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wand2,
  Download,
  Upload,
  Search,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  ArrowLeft,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Video,
  FileArchive,
  HardDrive,
  Copy,
  ExternalLink,
  Sparkles,
  Settings2,
  Check,
  X,
  Play,
  Layers,
  HelpCircle,
  Code,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  GreppedMediaItem,
  RenameOptions,
  DEFAULT_RENAME_OPTIONS,
  TEMPLATE_VARIABLES,
  grepPinterestMedia,
  generateAutoFilename,
  downloadBulkAsZip,
  saveBulkToSupabaseStorage,
  fetchMediaBlob,
} from '../../services/pinterestService';

const SAMPLE_DEMO_LINKS = [
  'https://i.pinimg.com/originals/7b/9e/7b/7b9e7b9213898f8280f82bd6d38e2bc1.jpg',
  'https://www.pinterest.com/pin/1137088724647167699/',
  'https://v1.pinimg.com/videos/mc/720p/fb/11/49/fb11496a7578332155bc1fca317d7b05.mp4',
].join('\n');

const PinterestGrepperPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [inputText, setInputText] = useState('');
  const [pasteMode, setPasteMode] = useState<'urls' | 'raw'>('urls');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [items, setItems] = useState<GreppedMediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [targetFolder, setTargetFolder] = useState('pinterest');

  // Auto-rename options
  const [renameOpts, setRenameOpts] = useState<RenameOptions>(DEFAULT_RENAME_OPTIONS);
  const [showRenameConfig, setShowRenameConfig] = useState(false);

  // Modals & Lightbox
  const [activeItem, setActiveItem] = useState<GreppedMediaItem | null>(null);
  const [previewMedia, setPreviewMedia] = useState<GreppedMediaItem | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; title: string }>({
    current: 0,
    total: 0,
    title: '',
  });

  // Calculate statistics
  const totalCount = items.length;
  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items]);
  const imageCount = useMemo(() => items.filter((i) => i.mediaType === 'image').length, [items]);
  const videoCount = useMemo(() => items.filter((i) => i.mediaType === 'video').length, [items]);

  // Filtered items based on search and media type filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.mediaType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchFilename = item.autoFilename.toLowerCase().includes(q);
        const matchBoard = (item.boardName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchFilename && !matchBoard) return false;
      }
      return true;
    });
  }, [items, typeFilter, search]);

  // Run Grepper
  const handleGrep = async (textToProcess = inputText) => {
    if (!textToProcess.trim()) {
      toast.error('Please enter at least one Pinterest link or paste page content');
      return;
    }

    setLoading(true);
    setStatusMessage('Connecting & resolving Pinterest media...');

    try {
      const grepped = await grepPinterestMedia(textToProcess, renameOpts, (msg) => setStatusMessage(msg));
      setItems(grepped);
      toast.success(`Successfully extracted ${grepped.length} photo & video asset(s)!`);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to grep Pinterest media');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  // Re-apply auto-renaming when config changes
  const handleUpdateRenameOpts = (newOpts: RenameOptions) => {
    setRenameOpts(newOpts);
    setItems((prev) =>
      prev.map((item, idx) => ({
        ...item,
        autoFilename: generateAutoFilename(item, idx, newOpts),
      }))
    );
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  const selectAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: true })));
  };

  const deselectAll = () => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: false })));
  };

  const removeSelected = () => {
    setItems((prev) => prev.filter((i) => !i.selected));
    toast.success('Removed selected items');
  };

  const removeSingle = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Single Item Download
  const handleSingleDownload = async (item: GreppedMediaItem) => {
    try {
      toast.loading(`Downloading ${item.autoFilename}...`, { id: 'dl' });
      const mediaUrl = item.videoUrl || item.highResUrl || item.originalMediaUrl;
      const blob = await fetchMediaBlob(mediaUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.autoFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${item.autoFilename}`, { id: 'dl' });
    } catch (err) {
      toast.error((err as Error).message || 'Download failed', { id: 'dl' });
    }
  };

  // Single Item Direct Save to Supabase Storage
  const handleSingleSaveToStorage = async (item: GreppedMediaItem) => {
    try {
      toast.loading(`Uploading to Storage: ${targetFolder}/${item.autoFilename}...`, { id: 'save' });
      const result = await saveBulkToSupabaseStorage([item], targetFolder);
      if (result.success > 0) {
        toast.success(`Saved to Storage (${targetFolder}/${item.autoFilename})!`, { id: 'save' });
      } else {
        toast.error(`Failed to save to storage: ${result.lastError || 'Download/Upload error'}`, { id: 'save' });
      }
    } catch (err) {
      toast.error((err as Error).message || 'Save failed', { id: 'save' });
    }
  };

  // Bulk ZIP Download
  const handleBulkZipDownload = async () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected for ZIP download');
      return;
    }

    setBulkProcessing(true);
    setBulkProgress({ current: 0, total: selectedItems.length, title: 'Creating ZIP file...' });

    try {
      await downloadBulkAsZip(
        selectedItems,
        `pinterest_grep_${targetFolder}_${Date.now()}.zip`,
        (current, total, filename) => {
          setBulkProgress({ current, total, title: `Packaging ${filename}...` });
        }
      );
      toast.success(`Successfully downloaded ${selectedItems.length} items as ZIP!`);
    } catch (err) {
      toast.error((err as Error).message || 'Bulk ZIP download failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk Save to Supabase Storage
  const handleBulkSaveToStorage = async () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected for storage upload');
      return;
    }

    setBulkProcessing(true);
    setBulkProgress({ current: 0, total: selectedItems.length, title: `Uploading to folder: ${targetFolder}/` });

    try {
      const result = await saveBulkToSupabaseStorage(
        selectedItems,
        targetFolder,
        (current, total, filename) => {
          setBulkProgress({ current, total, title: `Uploading ${filename}...` });
        }
      );
      if (result.success > 0) {
        toast.success(`Uploaded ${result.success} item(s) to Admin Storage (${targetFolder}/)!`);
      }
      if (result.failed > 0) {
        toast.error(`Failed to upload ${result.failed} item(s): ${result.lastError || 'Check network connection'}`);
      }
    } catch (err) {
      toast.error((err as Error).message || 'Bulk upload failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-4"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/storage')}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors border border-gray-200 bg-white"
            title="Back to Storage Manager"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-sm">
                <Wand2 className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pinterest Photo & Video Grepper</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs font-bold uppercase tracking-wider">
                Pro Admin Tool
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Grep high-resolution photos & videos from Pinterest boards, auto-rename with custom link slugs, bulk download ZIP, or upload directly to Admin Storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/storage')}
            className="btn btn-outline btn-sm bg-white"
          >
            <HardDrive className="w-4 h-4 mr-1.5 text-violet-600" />
            Storage Manager
          </button>
        </div>
      </motion.div>

      {/* Main Input Drawer & Grepper Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 p-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                Pinterest Media Scraper & Extractor
              </h2>
              <p className="text-xs text-gray-300 mt-0.5">
                Paste Pinterest pin links, board URLs, or raw HTML/JSON page contents to extract maximum resolution media.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPasteMode(pasteMode === 'urls' ? 'raw' : 'urls')}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors flex items-center gap-1.5"
              >
                {pasteMode === 'urls' ? <Code className="w-4 h-4 text-cyan-300" /> : <Layers className="w-4 h-4 text-pink-300" />}
                {pasteMode === 'urls' ? 'Switch to Raw Code / JSON Paste' : 'Switch to URL Links Paste'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Input Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                {pasteMode === 'urls' ? 'Pinterest Links & Board URLs' : 'Raw HTML Code or Pinterest App State JSON'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setInputText(SAMPLE_DEMO_LINKS);
                  handleGrep(SAMPLE_DEMO_LINKS);
                }}
                className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1 hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Demo Board & Video Sample
              </button>
            </div>

            <textarea
              rows={pasteMode === 'urls' ? 4 : 6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                pasteMode === 'urls'
                  ? 'Paste Pinterest links here (one per line). Examples:\nhttps://www.pinterest.com/pin/1137088724647167699/\nhttps://www.pinterest.com/username/board-name/\nhttps://i.pinimg.com/564x/...'
                  : 'Paste Pinterest page source HTML or __PINTEREST_APP_STATE__ JSON block here...'
              }
              className="w-full rounded-xl border border-gray-300 p-3.5 text-xs text-gray-900 font-mono bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all outline-none"
            />
          </div>

          {/* Quick Config & Target Storage Folder toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-gray-100">
            {/* Target Storage Folder */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                Target Storage Folder
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. pinterest, videos, hero, games"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">/storage/media/</span>
              </div>
            </div>

            {/* Auto Rename Pattern Preview */}
            <div className="space-y-1 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <Settings2 className="w-3.5 h-3.5 text-violet-500" />
                  Auto-Rename Format Template
                </label>
                <button
                  type="button"
                  onClick={() => setShowRenameConfig(!showRenameConfig)}
                  className="text-[11px] font-bold text-violet-600 hover:text-violet-800 underline"
                >
                  {showRenameConfig ? 'Close Naming Settings' : 'Customize Naming Rules'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 font-semibold border border-gray-200 truncate">
                  Pattern: <span className="text-violet-700">{renameOpts.template}</span>
                </div>
                <div className="text-[10px] text-gray-500 bg-violet-50 text-violet-800 px-2 py-1.5 rounded-lg font-mono font-medium border border-violet-100">
                  Preview: pinterest_cyberpunk-art_123.jpg
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Naming Config Drawer */}
          <AnimatePresence>
            {showRenameConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-200/80 space-y-3 text-xs">
                  <div className="font-bold text-violet-900 flex items-center justify-between">
                    <span>Auto-Rename Template & Formatter Settings</span>
                    <span className="text-[11px] font-normal text-violet-700">Dynamic placeholders supported</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 uppercase">Prefix</label>
                      <input
                        type="text"
                        value={renameOpts.prefix}
                        onChange={(e) => handleUpdateRenameOpts({ ...renameOpts, prefix: e.target.value })}
                        className="w-full mt-1 p-1.5 text-xs rounded border border-gray-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 uppercase">Pattern Template</label>
                      <input
                        type="text"
                        value={renameOpts.template}
                        onChange={(e) => handleUpdateRenameOpts({ ...renameOpts, template: e.target.value })}
                        className="w-full mt-1 p-1.5 text-xs rounded border border-gray-300 bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 uppercase">Space Replacement</label>
                      <select
                        value={renameOpts.replaceSpaces}
                        onChange={(e) =>
                          handleUpdateRenameOpts({ ...renameOpts, replaceSpaces: e.target.value as any })
                        }
                        className="w-full mt-1 p-1.5 text-xs rounded border border-gray-300 bg-white"
                      >
                        <option value="-">Hyphens (-)</option>
                        <option value="_">Underscores (_)</option>
                        <option value="none">Keep spaces</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-4 gap-2">
                      <label className="flex items-center gap-1.5 font-medium text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={renameOpts.lowercase}
                          onChange={(e) => handleUpdateRenameOpts({ ...renameOpts, lowercase: e.target.checked })}
                          className="rounded text-pink-600 focus:ring-pink-500"
                        />
                        Force Lowercase
                      </label>
                    </div>
                  </div>

                  {/* Template Variable Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mr-1">Placeholders:</span>
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => {
                          if (!renameOpts.template.includes(v.key)) {
                            handleUpdateRenameOpts({ ...renameOpts, template: `${renameOpts.template}_${v.key}` });
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-white text-violet-800 text-[10px] font-mono border border-violet-200 hover:bg-violet-100 transition-colors"
                        title={`Click to insert ${v.label}`}
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Trigger Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
              <span>Converts all thumbnails automatically to Original 4K resolution</span>
            </div>

            <button
              onClick={() => handleGrep()}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 text-white font-bold text-xs shadow-md hover:shadow-lg hover:from-pink-500 hover:to-red-500 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? statusMessage || 'Grepping Media...' : 'Grep & Auto-Rename Photos & Videos'}
            </button>
          </div>
        </div>
      </div>

      {/* Results Header Toolbar & Selection Actions */}
      {items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Main Results Stats & Bulk Actions Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-pink-600" />
                  Extracted Media Gallery ({filteredItems.length})
                </h3>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
                    {imageCount} Photos
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-100">
                    {videoCount} Videos
                  </span>
                </div>
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleBulkZipDownload}
                  disabled={selectedItems.length === 0 || bulkProcessing}
                  className="btn btn-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 border-none shadow-sm disabled:opacity-50"
                  title="Download all selected items in a single ZIP file"
                >
                  <FileArchive className="w-4 h-4 mr-1.5" />
                  Bulk Download ZIP ({selectedItems.length})
                </button>

                <button
                  onClick={handleBulkSaveToStorage}
                  disabled={selectedItems.length === 0 || bulkProcessing}
                  className="btn btn-sm bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:from-violet-500 hover:to-purple-600 border-none shadow-sm disabled:opacity-50"
                  title={`Upload selected items directly to Supabase storage under /${targetFolder}/`}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  Bulk Save to Storage ({selectedItems.length})
                </button>

                <button
                  onClick={removeSelected}
                  disabled={selectedItems.length === 0}
                  className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter, Search, Select All Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 items-center">
              {/* Type Filter Buttons */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  onClick={() => setTypeFilter('image')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === 'image' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Photos ({imageCount})
                </button>
                <button
                  onClick={() => setTypeFilter('video')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === 'video' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Videos ({videoCount})
                </button>
              </div>

              {/* Search input */}
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title, filename, or board..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                />
              </div>

              {/* Toggle Selection All */}
              <div className="flex items-center justify-end gap-2 text-xs font-semibold text-gray-600">
                <button
                  onClick={selectAll}
                  className="hover:text-pink-600 transition-colors flex items-center gap-1"
                >
                  <CheckSquare className="w-4 h-4 text-pink-600" />
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={deselectAll}
                  className="hover:text-gray-900 transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* Media Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => {
              const isVideo = item.mediaType === 'video';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`group relative bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md ${
                    item.selected ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Select Checkbox badge */}
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className="absolute top-3 left-3 z-20 p-1 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-black/70 transition-colors"
                  >
                    {item.selected ? (
                      <CheckSquare className="w-5 h-5 text-pink-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300" />
                    )}
                  </button>

                  {/* Quality & Type Badge */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md backdrop-blur-md text-white ${
                        isVideo
                          ? 'bg-purple-600/90'
                          : 'bg-emerald-600/90'
                      }`}
                    >
                      {item.qualityBadge}
                    </span>
                  </div>

                  {/* Media Visual Preview Container */}
                  <div
                    className="relative aspect-video sm:aspect-square bg-gray-900 cursor-pointer group-hover:opacity-95 transition-opacity overflow-hidden"
                    onClick={() => setPreviewMedia(item)}
                  >
                    {isVideo ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                        {item.highResUrl && item.highResUrl !== item.videoUrl ? (
                          <img
                            src={item.highResUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-purple-300 bg-gradient-to-b from-slate-800 to-slate-950 p-4">
                            <Video className="w-12 h-12 mb-2 opacity-80" />
                            <span className="text-[11px] font-bold tracking-wide">HD Video Stream</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.highResUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to original media URL if high res 404s
                          (e.target as HTMLImageElement).src = item.originalMediaUrl;
                        }}
                      />
                    )}

                    {/* Quick Lightbox Trigger Hover */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="p-2 rounded-full bg-white/90 text-gray-900 shadow-md">
                        <Eye className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* Card Info & Renaming Section */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-gray-900 line-clamp-1" title={item.title}>
                        {item.title}
                      </p>
                      {item.sourceUrl && (
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-pink-600 transition-colors shrink-0"
                          title="Open original Pinterest page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>

                    {/* Auto-Renamed Filename Field */}
                    <div className="bg-gray-50 rounded-lg p-1.5 border border-gray-200">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                        Auto-Renamed Filename
                      </div>
                      <input
                        type="text"
                        value={item.autoFilename}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, autoFilename: val } : i))
                          );
                        }}
                        className="w-full text-xs font-mono font-bold text-violet-900 bg-white border border-gray-200 rounded px-1.5 py-1 focus:ring-1 focus:ring-pink-500 outline-none"
                      />
                    </div>

                    {/* Action buttons footer */}
                    <div className="flex items-center justify-between pt-1 gap-1">
                      <button
                        onClick={() => handleSingleDownload(item)}
                        className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors text-xs font-bold flex items-center gap-1"
                        title="Download file directly"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Save</span>
                      </button>

                      <button
                        onClick={() => handleSingleSaveToStorage(item)}
                        className="p-1.5 rounded-lg text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors text-xs font-bold flex items-center gap-1"
                        title={`Upload into PixieKat Admin Storage under /${targetFolder}/`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Upload</span>
                      </button>

                      <button
                        onClick={() => copyToClipboard(item.highResUrl, 'High-Res URL')}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                        title="Copy High-Res URL"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => removeSingle(item.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Remove from gallery"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Lightbox Preview Modal */}
      <AnimatePresence>
        {previewMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setPreviewMedia(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lightbox Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-950 text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1.5 rounded bg-pink-600 text-white font-bold text-xs uppercase">
                    {previewMedia.mediaType}
                  </span>
                  <h3 className="text-sm font-bold truncate text-gray-200">{previewMedia.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSingleDownload(previewMedia)}
                    className="btn btn-sm btn-primary"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => setPreviewMedia(null)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Lightbox Media Player Body */}
              <div className="flex-1 overflow-hidden bg-black flex items-center justify-center p-4 min-h-[300px]">
                {previewMedia.mediaType === 'video' ? (
                  <video
                    src={previewMedia.videoUrl || previewMedia.highResUrl}
                    controls
                    autoPlay
                    className="max-h-[65vh] w-auto rounded-lg shadow-2xl"
                  />
                ) : (
                  <img
                    src={previewMedia.highResUrl}
                    alt={previewMedia.title}
                    className="max-h-[65vh] w-auto object-contain rounded-lg shadow-2xl"
                  />
                )}
              </div>

              {/* Lightbox Footer Details */}
              <div className="p-4 bg-slate-950 border-t border-white/10 text-xs text-gray-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-mono text-pink-400 font-bold flex items-center gap-2">
                    <span>Filename: {previewMedia.autoFilename}</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-white">
                      {previewMedia.qualityBadge}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 truncate max-w-xl">
                    Source: {previewMedia.highResUrl}
                  </div>
                </div>

                <button
                  onClick={() => handleSingleSaveToStorage(previewMedia)}
                  className="btn btn-sm bg-violet-600 hover:bg-violet-700 text-white border-none shrink-0"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Save to Admin Storage
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Processing Progress Modal */}
      <AnimatePresence>
        {bulkProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 mx-auto flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>

              <div>
                <h3 className="text-base font-bold text-gray-900">Processing Bulk Request</h3>
                <p className="text-xs text-gray-500 mt-1">{bulkProgress.title}</p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-300"
                    style={{
                      width: `${
                        bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold text-gray-600">
                  <span>
                    {bulkProgress.current} / {bulkProgress.total} items
                  </span>
                  <span>
                    {bulkProgress.total > 0
                      ? Math.round((bulkProgress.current / bulkProgress.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PinterestGrepperPage;
