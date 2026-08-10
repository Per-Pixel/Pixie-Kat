import React, { useRef, useState } from 'react';
import { Film, Link, Upload, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const BUCKET = 'media';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface VideoSourceFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
  previewClassName?: string;
}

const VideoSourceField: React.FC<VideoSourceFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = '/videos/hero-1.mp4 or https://...',
  folder = 'videos',
  previewClassName = 'h-44 w-full max-w-md',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please choose a video file');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'mp4';
      const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const timestamp = Date.now();
      const path = folder ? `${folder}/${base}_${timestamp}.${ext}` : `${base}_${timestamp}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

      // Index in media table
      await supabase.from('media').insert({
        filename: file.name,
        storage_path: path,
        bucket: BUCKET,
        mime_type: file.type,
        size_bytes: file.size,
        public_url: publicUrl,
      });

      onChange(publicUrl);
      toast.success('Video uploaded');
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          accept="video/*"
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
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </div>

      {value ? (
        <div className={`relative overflow-hidden rounded-lg border border-gray-200 bg-black ${previewClassName}`}>
          <video
            src={value}
            className="h-full w-full object-contain"
            controls
            muted
            preload="metadata"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white shadow-sm"
            title="Remove video"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className={`flex items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 ${previewClassName}`}>
          <div className="text-center text-gray-400">
            <Film className="mx-auto h-8 w-8 mb-1" />
            <p className="text-xs">No video selected</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoSourceField;
