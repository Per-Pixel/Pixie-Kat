import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2, Save } from 'lucide-react';
import { downloadMedia, type MediaRecord } from '../../services/mediaService';
import {
  cropRatios, cropRectangle, defaultImageEdits, exportImage, loadEditableImage, outputDimensions, renderImage,
  type CropRatio, type ImageEdits,
} from '../../services/imageEditing';

const sliders: Array<{ key: 'brightness' | 'contrast' | 'saturation' | 'grayscale' | 'sepia' | 'blur'; label: string; max: number }> = [
  { key: 'brightness', label: 'Brightness', max: 200 },
  { key: 'contrast', label: 'Contrast', max: 200 },
  { key: 'saturation', label: 'Saturation', max: 200 },
  { key: 'grayscale', label: 'Grayscale', max: 100 },
  { key: 'sepia', label: 'Sepia', max: 100 },
  { key: 'blur', label: 'Blur', max: 12 },
];

const formatExtensions = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' } as const;

export default function ImageEditor({ record, onClose, onSave, onReplace }: {
  record: MediaRecord;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
  onReplace: (file: File) => Promise<boolean>;
}) {
  const [source, setSource] = useState<{ image: HTMLImageElement; url: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [edits, setEdits] = useState<ImageEdits>(defaultImageEdits);
  const [format, setFormat] = useState<'image/webp' | 'image/png' | 'image/jpeg'>('image/webp');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    let url = '';
    downloadMedia(record)
      .then(loadEditableImage)
      .then((result) => {
        url = result.url;
        if (disposed) URL.revokeObjectURL(url);
        else setSource(result);
      })
      .catch((err: Error) => { if (!disposed) setError(err.message); });
    return () => { disposed = true; if (url) URL.revokeObjectURL(url); };
  }, [record]);

  useEffect(() => {
    if (!source || !canvasRef.current) return;
    try {
      const preview = renderImage(source.image, source.image.naturalWidth, source.image.naturalHeight, edits, 800);
      const canvas = canvasRef.current;
      canvas.width = preview.width;
      canvas.height = preview.height;
      canvas.getContext('2d')?.drawImage(preview, 0, 0);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [source, edits]);

  const change = <K extends keyof ImageEdits>(key: K, value: ImageEdits[K]) =>
    setEdits((prev) => ({ ...prev, [key]: value }));

  const sourceExtension = record.storage_path.split('.').pop()?.toLowerCase() || '';
  const canReplaceOriginal = sourceExtension === formatExtensions[format]
    || (format === 'image/jpeg' && sourceExtension === 'jpeg' && record.mime_type === 'image/jpeg');
  const outputExtension = canReplaceOriginal ? sourceExtension : formatExtensions[format];

  const exportEdits = async () => {
    if (!source) throw new Error('The image is still loading');
    const canvas = renderImage(source.image, source.image.naturalWidth, source.image.naturalHeight, edits);
    return exportImage(canvas, record.filename, format, 0.85, outputExtension);
  };

  const save = async () => {
    if (!source || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSave(await exportEdits());
    } catch (err) {
      setError((err as Error).message || 'Could not save the edited image');
    } finally {
      setBusy(false);
    }
  };

  const replaceOriginal = async () => {
    if (!source || busy) return;
    setBusy(true);
    setError('');
    try {
      const replaced = await onReplace(await exportEdits());
      if (replaced) onClose();
    } catch (err) {
      setError((err as Error).message || 'Could not replace the original image');
    } finally {
      setBusy(false);
    }
  };

  const outputSize = source ? (() => {
    const crop = cropRectangle(source.image.naturalWidth, source.image.naturalHeight, cropRatios[edits.ratio], edits.focal, edits.freeCrop);
    return outputDimensions(crop.width, crop.height, edits.rotation);
  })() : null;
  const preview = source && outputSize
    ? <canvas ref={canvasRef} role="img" aria-label="Edited crop preview" className="mx-auto max-h-[460px] max-w-full object-contain" style={{ aspectRatio: outputSize.width / outputSize.height }} />
    : null;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
        <button type="button" onClick={onClose} className="btn btn-outline btn-sm flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Back</button>
        <h2 className="truncate text-base font-semibold text-gray-900">Edit {record.filename}</h2>
        <button type="button" onClick={save} disabled={!source || busy} className="btn btn-primary btn-sm flex items-center gap-1 disabled:opacity-50">
          <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save new copy'}
        </button>
      </div>
      <div className="grid flex-1 gap-5 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-xl bg-gray-900 p-4">
            {source ? preview : <p className="text-sm text-white">{error || 'Loading image…'}</p>}
          </div>
          {source && <div className="grid grid-cols-2 gap-3 text-center text-xs text-gray-600">
            <div className="rounded-lg border border-gray-200 p-2"><p className="mb-1 font-semibold">Original</p>
              <button type="button" className="relative mx-auto block cursor-crosshair" aria-label="Set focal point on original image"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  change('focal', {
                    x: Math.round((event.clientX - rect.left) / rect.width * 100),
                    y: Math.round((event.clientY - rect.top) / rect.height * 100),
                  });
                }}>
                <img src={source.url} alt="Original image" className="h-28 max-w-full object-contain" />
                <span className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-600 shadow-md"
                  style={{ left: `${edits.focal.x}%`, top: `${edits.focal.y}%` }} />
              </button>
              <p className="mt-1 text-gray-500">Click to choose the focal point.</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-2"><p className="mb-1 font-semibold">Output</p><p className="text-gray-500 tabular-nums">{outputSize ? `${Math.round(outputSize.width)} × ${Math.round(outputSize.height)} px` : '—'}</p></div>
          </div>}
        </div>
        <div className="space-y-5">
          <div>
            <label htmlFor="editor-ratio" className="label mb-1 block">Crop shape</label>
            <select id="editor-ratio" className="input" value={edits.ratio} onChange={(e) => change('ratio', e.target.value as CropRatio)}>
              <option value="free">Free crop</option><option value="landscape">16:9 landscape</option><option value="standard">4:3 standard</option><option value="square">1:1 square</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline btn-sm" title="Rotate left" aria-label="Rotate left" onClick={() => change('rotation', ((edits.rotation + 270) % 360) as ImageEdits['rotation'])}><RotateCcw className="h-4 w-4" /></button>
            <button type="button" className="btn btn-outline btn-sm" title="Rotate right" aria-label="Rotate right" onClick={() => change('rotation', ((edits.rotation + 90) % 360) as ImageEdits['rotation'])}><RotateCw className="h-4 w-4" /></button>
            <button type="button" className="btn btn-outline btn-sm" aria-label="Flip horizontally" aria-pressed={edits.flipHorizontal} onClick={() => change('flipHorizontal', !edits.flipHorizontal)}><FlipHorizontal2 className="h-4 w-4" /></button>
            <button type="button" className="btn btn-outline btn-sm" aria-label="Flip vertically" aria-pressed={edits.flipVertical} onClick={() => change('flipVertical', !edits.flipVertical)}><FlipVertical2 className="h-4 w-4" /></button>
          </div>
          {edits.ratio === 'free' && <div className="space-y-3">
            {(['width', 'height'] as const).map((axis) => <label key={axis} className="block text-xs font-medium text-gray-700">
              <span className="flex justify-between"><span>Crop {axis}</span><span className="tabular-nums">{edits.freeCrop[axis]}%</span></span>
              <input type="range" className="mt-1 w-full accent-violet-600" min={5} max={100} value={edits.freeCrop[axis]}
                onChange={(e) => change('freeCrop', { ...edits.freeCrop, [axis]: Number(e.target.value) })} />
            </label>)}
          </div>}
          <div className="space-y-3">
            {(['x', 'y'] as const).map((axis) => <label key={axis} className="block text-xs font-medium text-gray-700">
              <span className="flex justify-between"><span>Focal {axis === 'x' ? 'horizontal' : 'vertical'}</span><span className="tabular-nums">{edits.focal[axis]}%</span></span>
              <input type="range" className="mt-1 w-full accent-violet-600" min={0} max={100} value={edits.focal[axis]}
                onChange={(e) => change('focal', { ...edits.focal, [axis]: Number(e.target.value) })} />
            </label>)}
          </div>
          <div className="space-y-3">{sliders.map(({ key, label, max }) => <label key={key} className="block text-xs font-medium text-gray-700">
            <span className="flex justify-between"><span>{label}</span><span className="tabular-nums">{edits[key]}{key === 'blur' ? 'px' : '%'}</span></span>
            <input type="range" className="mt-1 w-full accent-violet-600" min={0} max={max} value={edits[key]} onChange={(e) => change(key, Number(e.target.value))} />
          </label>)}</div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setEdits(defaultImageEdits)}>Reset edits</button>
          <div><label htmlFor="editor-format" className="label mb-1 block">Save format</label>
            <select id="editor-format" className="input" value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
              <option value="image/webp">WebP</option><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option>
            </select>
          </div>
          <button type="button" onClick={replaceOriginal} disabled={!canReplaceOriginal || !source || busy}
            className="btn btn-outline btn-sm w-full border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
            Replace original everywhere
          </button>
          <p className="text-xs leading-5 text-gray-600">
            {canReplaceOriginal
              ? 'Replacing keeps the same file path and updates every placement after confirmation. Saving a copy is safer.'
              : `To replace the original, choose the same file extension (.${record.storage_path.split('.').pop()}).`}
          </p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
