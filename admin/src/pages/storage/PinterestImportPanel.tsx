import React, { useMemo, useState } from 'react';
import { Check, Download, ExternalLink, Link2, Upload, Video } from 'lucide-react';
import {
  downloadPinterestFile, downloadPinterestZip, importPinterestMedia, resolvePinterestLink,
  type PinterestMediaItem,
} from '../../services/pinterestService';
import type { MediaRecord } from '../../services/mediaService';

type PinterestImportProps =
  | { mode: 'placement'; kind: 'image' | 'video'; onUse: (file: File) => void }
  | { mode: 'library'; onImported: (records: MediaRecord[]) => void };

const PinterestImportPanel: React.FC<PinterestImportProps> = (props) => {
  const [input, setInput] = useState('');
  const [items, setItems] = useState<PinterestMediaItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [folder, setFolder] = useState('pinterest');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const selectedItems = useMemo(() => items.filter((item) => selected.includes(item.id)), [items, selected]);
  const visibleItems = props.mode === 'placement' ? items.filter((item) => item.kind === props.kind) : items;

  const resolve = async (event: React.FormEvent) => {
    event.preventDefault();
    const links = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!links.length) { setError('Paste a Pinterest pin or board link first.'); return; }
    if (links.length > 20 || (props.mode === 'placement' && links.length > 1)) {
      setError(props.mode === 'placement' ? 'Paste one Pinterest link for this graphic.' : 'Paste up to 20 links at a time.');
      return;
    }
    setLoading(true);
    setError('');
    setItems([]);
    const found = new Map<string, PinterestMediaItem>();
    const failures: string[] = [];
    for (let index = 0; index < links.length; index++) {
      setStatus(`Checking link ${index + 1} of ${links.length}...`);
      try {
        const result = await resolvePinterestLink(links[index]);
        for (const item of result) {
          if (!found.has(item.mediaUrl) && found.size < 50) found.set(item.mediaUrl, item);
        }
      } catch (err) {
        failures.push((err as Error).message || 'Pinterest could not read this link');
      }
    }
    const next = [...found.values()];
    setItems(next);
    setSelected(next.map((item) => item.id));
    if (failures.length) setError(`${failures.length} ${failures.length === 1 ? 'link' : 'links'} could not be read: ${failures[0]}`);
    else if (!next.length) setError('No images or videos were found. Try a public Pinterest pin.');
    else if (props.mode === 'placement' && !next.some((item) => item.kind === props.kind)) {
      setError(`That link contains no ${props.kind}. Choose a ${props.kind} pin for this placement.`);
    }
    setStatus('');
    setLoading(false);
  };

  const chooseItem = async (item: PinterestMediaItem) => {
    if (props.mode !== 'placement') return;
    setProcessing(true);
    setError('');
    setStatus('Downloading from Pinterest...');
    try {
      const file = await downloadPinterestFile(item);
      props.onUse(file);
    } catch (err) {
      setError((err as Error).message || 'Could not download this Pinterest file.');
    } finally {
      setProcessing(false);
      setStatus('');
    }
  };

  const importSelected = async () => {
    if (props.mode !== 'library' || !selectedItems.length) return;
    setProcessing(true);
    setError('');
    const records: MediaRecord[] = [];
    const failed: Array<{ id: string; message: string }> = [];
    for (let index = 0; index < selectedItems.length; index++) {
      const item = selectedItems[index];
      setStatus(`Importing ${index + 1} of ${selectedItems.length}: ${item.title}`);
      try {
        records.push(await importPinterestMedia(item, folder));
      } catch (err) {
        failed.push({ id: item.id, message: `${item.title}: ${(err as Error).message || 'Import failed'}` });
      }
    }
    if (records.length) props.onImported(records);
    setSelected(failed.map((item) => item.id));
    setStatus(`${records.length} ${records.length === 1 ? 'file' : 'files'} added to Media files.`);
    if (failed.length) setError(`${failed.length} could not be imported. ${failed[0].message}`);
    setProcessing(false);
  };

  const downloadZip = async () => {
    if (!selectedItems.length) return;
    setProcessing(true);
    setError('');
    try {
      await downloadPinterestZip(selectedItems, (current, total) => setStatus(`Downloading ${current} of ${total} for ZIP...`));
      setStatus(`Downloaded ${selectedItems.length} files as ZIP.`);
    } catch (err) {
      setError((err as Error).message || 'Could not download the ZIP.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section aria-label="Pinterest importer" className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900"><Link2 className="h-4 w-4 text-blue-600" />Import from Pinterest</h3>
        <p className="mt-1 text-sm text-gray-600">{props.mode === 'placement'
          ? `Paste a pin link, preview its ${props.kind}, then choose it for this location.`
          : 'Paste pin or board links, preview what Pinterest exposes, then save selected files or download a ZIP.'}</p>
      </div>
      <form onSubmit={resolve} className="space-y-3">
        <label className="block text-sm font-medium text-gray-800">
          Pinterest {props.mode === 'placement' ? 'pin link' : 'links · one per line'}
          {props.mode === 'placement' ? (
            <input type="url" value={input} onChange={(event) => setInput(event.target.value)}
              placeholder="https://www.pinterest.com/pin/..." className="input mt-1" />
          ) : (
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3}
              placeholder="https://www.pinterest.com/pin/..." className="input mt-1 h-auto min-h-24 resize-y" />
          )}
        </label>
        <button type="submit" disabled={loading || processing} className="btn btn-primary btn-sm gap-2">
          <Link2 className="h-4 w-4" />{loading ? 'Finding media...' : 'Find Pinterest media'}
        </button>
      </form>
      {props.mode === 'library' && <p className="text-xs text-gray-600">Up to 20 links per search. A board can show up to 50 pins available in its public page; private or sign-in-only pins cannot be imported.</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {status && <p role="status" className="text-sm font-medium text-blue-800">{status}</p>}
      {props.mode === 'library' && items.length > 0 && (
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-gray-100 pt-4">
          <label className="text-sm font-medium text-gray-800">Save in folder
            <input value={folder} onChange={(event) => setFolder(event.target.value)} className="input mt-1 w-48" maxLength={60} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSelected(selected.length === items.length ? [] : items.map((item) => item.id))}
              disabled={processing} className="btn btn-outline btn-sm">{selected.length === items.length ? 'Deselect all' : 'Select all'}</button>
            <button type="button" onClick={downloadZip} disabled={processing || !selectedItems.length} className="btn btn-outline btn-sm gap-1.5">
              <Download className="h-4 w-4" />Download ZIP ({selectedItems.length})
            </button>
            <button type="button" onClick={importSelected} disabled={processing || !selectedItems.length} className="btn btn-primary btn-sm gap-1.5">
              <Upload className="h-4 w-4" />Save to Media files ({selectedItems.length})
            </button>
          </div>
        </div>
      )}
      {visibleItems.length > 0 && (
        <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <div className="relative flex h-40 items-center justify-center bg-gray-950">
                {item.kind === 'image' ? <img src={item.previewUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
                  : item.previewUrl !== item.mediaUrl ? <img src={item.previewUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
                  : <Video className="h-10 w-10 text-gray-300" />}
                <span className="absolute bottom-2 left-2 rounded bg-gray-950/90 px-2 py-1 text-xs font-semibold text-white">{item.kind === 'video' ? 'Video' : 'Image'}</span>
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-gray-900" title={item.title}>{item.title}</p>
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open source for ${item.title}`}
                    className="shrink-0 text-blue-700 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {props.mode === 'library' ? (
                  <>
                    <label className="flex items-center gap-2 text-xs font-medium text-gray-800">
                      <input type="checkbox" checked={selected.includes(item.id)} disabled={processing}
                        onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />
                      Select for import or ZIP
                    </label>
                    <label className="block text-xs text-gray-700">Filename
                      <input type="text" value={item.filename} maxLength={120} className="input mt-1 h-8 text-xs"
                        onChange={(event) => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, filename: event.target.value } : entry))} />
                    </label>
                  </>
                ) : (
                  <button type="button" disabled={processing} onClick={() => chooseItem(item)} className="btn btn-primary btn-sm w-full gap-1.5">
                    <Check className="h-4 w-4" />Use this {item.kind}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PinterestImportPanel;
