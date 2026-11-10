import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Search,
  Grid3x3,
  List,
  Image as ImageIcon,
  Video,
  File,
  Trash2,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import mediaService from '../services/mediaService';
import type { MediaAsset } from '../types/cms';

type ViewMode = 'grid' | 'list';

const MediaLibrary: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadAssets();
    loadFolders();
  }, [selectedFolder]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const response = await mediaService.getMedia({
        folder: selectedFolder || undefined,
        search: searchQuery || undefined,
      });
      setAssets(response.assets);
    } catch (error) {
      toast.error('Failed to load media');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const folderList = await mediaService.getFolders();
      setFolders(folderList);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const fileArray = Array.from(files);

      if (fileArray.length === 1) {
        await mediaService.uploadMedia({
          file: fileArray[0],
          folder: selectedFolder || undefined,
        });
        toast.success('File uploaded successfully');
      } else {
        await mediaService.uploadMultiple(fileArray, selectedFolder || undefined);
        toast.success(`${fileArray.length} files uploaded successfully`);
      }

      loadAssets();
    } catch (error) {
      toast.error('Failed to upload file(s)');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [selectedFolder]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await mediaService.deleteMedia(id);
      toast.success('File deleted successfully');
      loadAssets();
    } catch (error) {
      toast.error('Failed to delete file');
      console.error(error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssets.length === 0) return;
    if (!confirm(`Delete ${selectedAssets.length} file(s)?`)) return;

    try {
      await mediaService.bulkDelete(selectedAssets);
      toast.success(`${selectedAssets.length} file(s) deleted`);
      setSelectedAssets([]);
      loadAssets();
    } catch (error) {
      toast.error('Failed to delete files');
      console.error(error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedAssets((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredAssets = assets.filter((asset) =>
    asset.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-1">{assets.length} file(s)</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <label className="btn btn-primary btn-md cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Files'}
            <input
              type="file"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </motion.div>

      {selectedAssets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center justify-between"
        >
          <span className="text-sm font-medium text-primary-900">
            {selectedAssets.length} file(s) selected
          </span>
          <div className="flex gap-2">
            <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedAssets([])}
              className="btn btn-outline btn-sm"
            >
              Clear Selection
            </button>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="input"
            >
              <option value="">All Folders</option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
            <div className="flex border border-gray-200 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`bg-white rounded-lg shadow-sm border-2 border-dashed transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-200'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading media...</p>
            </div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center">
            <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No files found' : 'No files uploaded yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Drag and drop files here or click the upload button'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                  selectedAssets.includes(asset.id)
                    ? 'border-primary-500 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleSelect(asset.id)}
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  {asset.mimeType.startsWith('image/') ? (
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.alt || asset.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400">
                      {getFileIcon(asset.mimeType)}
                    </div>
                  )}
                </div>
                <div className="p-2 bg-white">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {asset.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(asset.size)}
                  </p>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(asset.url, '_blank');
                    }}
                    className="p-1.5 bg-white rounded-md shadow-sm hover:bg-gray-50"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(asset.id);
                    }}
                    className="p-1.5 bg-white rounded-md shadow-sm hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedAssets.length === filteredAssets.length}
                      onChange={() => {
                        if (selectedAssets.length === filteredAssets.length) {
                          setSelectedAssets([]);
                        } else {
                          setSelectedAssets(filteredAssets.map((a) => a.id));
                        }
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedAssets.includes(asset.id)}
                        onChange={() => toggleSelect(asset.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {asset.mimeType.startsWith('image/') ? (
                          <img
                            src={asset.thumbnailUrl || asset.url}
                            alt={asset.alt || asset.filename}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                            {getFileIcon(asset.mimeType)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {asset.filename}
                          </div>
                          {asset.alt && (
                            <div className="text-xs text-gray-500">{asset.alt}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.mimeType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatFileSize(asset.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(asset.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => window.open(asset.url, '_blank')}
                          className="text-primary-600 hover:text-primary-900"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MediaLibrary;
