import React, { useRef, useState } from 'react';
import { ImagePlus, Link, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { listMedia, MediaRecord, uploadMedia } from '../../services/mediaService';

interface ImageSourceFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
  previewClassName?: string;
}

const ImageSourceField: React.FC<ImageSourceFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = '/img/games/example.webp or https://...',
  folder = 'admin',
  previewClassName = 'h-28 w-40',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [media, setMedia] = useState<MediaRecord[]>([]);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadMedia(file, folder);
      onChange(uploaded.public_url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setLoadingMedia(true);
    try {
      const result = await listMedia({ mimeType: 'image/', limit: 48 });
      setMedia(result.data);
    } catch (err) {
      toast.error((err as Error).message || 'Could not load storage images');
    } finally {
      setLoadingMedia(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="label mb-1.5 block">{label}</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10"
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleUpload(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn btn-outline btn-md whitespace-nowrap"
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button type="button" onClick={openPicker} className="btn btn-outline btn-md whitespace-nowrap">
          <ImagePlus className="mr-2 h-4 w-4" />
          Pick from Storage
        </button>
      </div>

      {value ? (
        <div className={`relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${previewClassName}`}>
          <img src={value} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white shadow-sm"
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {pickerOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[82vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pick image from storage</h3>
                <p className="text-sm text-gray-500">Choose an uploaded image to fill this field.</p>
              </div>
              <button type="button" onClick={() => setPickerOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="max-h-[64vh] overflow-y-auto p-5">
              {loadingMedia ? (
                <div className="p-10 text-center text-gray-500">Loading images...</div>
              ) : media.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
                  No images found in storage yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {media.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onChange(item.public_url);
                        setPickerOpen(false);
                      }}
                      className="group overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-left transition hover:border-primary-400 hover:ring-2 hover:ring-primary-100"
                    >
                      <div className="aspect-square overflow-hidden bg-gray-100">
                        <img src={item.public_url} alt={item.alt_text ?? item.filename} className="h-full w-full object-cover transition group-hover:scale-105" />
                      </div>
                      <p className="truncate px-2 py-1.5 text-xs text-gray-600">{item.filename}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ImageSourceField;
