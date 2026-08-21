import JSZip from 'jszip';
import { uploadMedia, MediaRecord } from './mediaService';

export interface GreppedMediaItem {
  id: string;
  pinId?: string;
  sourceUrl: string;
  mediaType: 'image' | 'video';
  originalMediaUrl: string;
  highResUrl: string;
  videoUrl?: string | null;
  videoQuality?: string | null; // e.g., '1080p', '720p', 'Original'
  videoDuration?: number | null;
  width?: number | null;
  height?: number | null;
  title: string;
  description?: string;
  boardName?: string;
  authorName?: string;
  autoFilename: string;
  suggestedExt: string;
  qualityBadge: string;
  selected: boolean;
}

export interface RenameOptions {
  template: string; // e.g. "pinterest_{board}_{slug}_{id}"
  lowercase: boolean;
  replaceSpaces: '-' | '_' | 'none';
  includeIndex: boolean;
  prefix: string;
}

export const DEFAULT_RENAME_OPTIONS: RenameOptions = {
  template: '{prefix}_{slug}_{id}',
  lowercase: true,
  replaceSpaces: '-',
  includeIndex: false,
  prefix: 'pinterest',
};

// Available template variables helper text
export const TEMPLATE_VARIABLES = [
  { key: '{prefix}', label: 'Prefix string (default: pinterest)' },
  { key: '{slug}', label: 'Pin Title / URL Slug' },
  { key: '{id}', label: 'Pinterest Pin ID' },
  { key: '{board}', label: 'Board Name' },
  { key: '{type}', label: 'Media Type (photo/video)' },
  { key: '{quality}', label: 'Quality indicator (original/1080p)' },
  { key: '{seq}', label: 'Sequence Index (001, 002...)' },
];

/**
 * Normalizes Pinterest Image URLs to maximum possible resolution
 * E.g. convert .../236x/ab/cd/ef/123.jpg -> .../originals/ab/cd/ef/123.jpg
 */
export function getHighResPinterestImageUrl(url: string): string {
  if (!url) return '';

  // If already originals, return as is
  if (url.includes('/originals/')) return url;

  // Replace common Pinterest thumbnail dimension folders with /originals/
  const upgraded = url.replace(
    /\/i\.pinimg\.com\/(?:136x136|236x|474x|564x|736x|1200x)\//i,
    '/i.pinimg.com/originals/'
  );

  return upgraded;
}

/**
 * Extract 32-character asset hash from Pinterest image/gif URL
 */
function extractAssetHash(url: string): string {
  if (!url) return '';
  const match = url.match(/\/([a-f0-9]{32}|\w{32})\.(?:jpg|png|webp|gif)/i) || url.match(/\/([a-f0-9]{12,64})/i);
  return match ? match[1].toLowerCase() : url;
}

/**
 * Format clean filename based on options & metadata
 */
export function generateAutoFilename(
  item: Partial<GreppedMediaItem>,
  index: number = 0,
  options: RenameOptions = DEFAULT_RENAME_OPTIONS
): string {
  const ext = item.suggestedExt || (item.mediaType === 'video' ? 'mp4' : 'jpg');

  // Extract slug from title or pinId
  let slug = (item.title || item.boardName || 'pin')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  if (!slug || slug === 'pin') {
    slug = item.pinId ? `pin-${item.pinId}` : `item-${Date.now()}`;
  }

  // Truncate overly long slugs
  if (slug.length > 50) {
    slug = slug.substring(0, 50).replace(/-$/, '');
  }

  const pinId = item.pinId || `id${Math.floor(Math.random() * 100000)}`;
  const board = (item.boardName || 'board')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
  const type = item.mediaType || 'photo';
  const quality = (item.qualityBadge || 'hq').toLowerCase().replace(/[^a-z0-9]/g, '');
  const seq = String(index + 1).padStart(3, '0');

  let name = options.template
    .replace(/\{prefix\}/g, options.prefix || 'pinterest')
    .replace(/\{slug\}/g, slug)
    .replace(/\{id\}/g, pinId)
    .replace(/\{board\}/g, board)
    .replace(/\{type\}/g, type)
    .replace(/\{quality\}/g, quality)
    .replace(/\{seq\}/g, seq);

  if (options.includeIndex && !options.template.includes('{seq}')) {
    name = `${name}_${seq}`;
  }

  if (options.replaceSpaces === '-') {
    name = name.replace(/\s+/g, '-');
  } else if (options.replaceSpaces === '_') {
    name = name.replace(/\s+/g, '_');
  }

  if (options.lowercase) {
    name = name.toLowerCase();
  }

  // Clean illegal characters
  name = name.replace(/[^a-zA-Z0-9_.-]/g, '');

  return `${name}.${ext}`;
}

/**
 * Public & Server Proxy helper with fallback sources
 */
async function fetchWithCorsProxy(url: string): Promise<string> {
  // Strategy 1: Local server proxy endpoint (Vite dev middleware)
  try {
    const localProxyUrl = `/api/pinterest-proxy?url=${encodeURIComponent(url)}`;
    const localRes = await fetch(localProxyUrl);
    if (localRes.ok) {
      const text = await localRes.text();
      if (text && text.length > 200) return text;
    }
  } catch {
    /* Fallback to public CORS proxies */
  }

  // Strategy 2: Direct fetch if allowed
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 200) return text;
    }
  } catch {
    /* CORS error expected, fall back to public proxies */
  }

  // Strategy 3: Try public CORS proxies sequentially
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (u: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(u)}`,
  ];

  for (const proxyFn of proxies) {
    try {
      const proxyUrl = proxyFn(url);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 200) return text;
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Could not fetch URL (CORS or network error): ${url}`);
}

/**
 * Extracts Pin ID from Pinterest link
 */
export function extractPinIdFromUrl(url: string): string | null {
  const match = url.match(/\/pin\/(\d+)/i) || url.match(/pin\/([a-zA-Z0-9_-]+)/i) || url.match(/pin\.it\/([a-zA-Z0-9_-]+)/i);
  if (match) return match[1];
  return null;
}

/**
 * Parses raw JSON or HTML content containing Pinterest App State or Pin items
 */
export function parsePinterestContent(
  rawContent: string,
  renameOpts: RenameOptions = DEFAULT_RENAME_OPTIONS,
  sourceLabel = 'Pinterest Grep'
): GreppedMediaItem[] {
  const results: GreppedMediaItem[] = [];
  const seenIds = new Set<string>();

  // 1. Scan for all GIF hashes across the document to prioritize animated GIFs over static JPG thumbnails
  const gifHashes = new Set<string>();
  const gifRegexScan = /https?:\/\/i\.pinimg\.com\/[^\s"'<>]+\/([a-f0-9]{32})\.gif/gi;
  let gifMatchScan: RegExpExecArray | null;
  while ((gifMatchScan = gifRegexScan.exec(rawContent)) !== null) {
    gifHashes.add(gifMatchScan[1].toLowerCase());
  }

  // 2. Try parsing full JSON if rawContent is JSON
  if (rawContent.trim().startsWith('{') || rawContent.trim().startsWith('[')) {
    try {
      const parsedJson = JSON.parse(rawContent);
      extractMediaFromJsonObj(parsedJson, results, seenIds, gifHashes, renameOpts, sourceLabel);
    } catch {
      /* continue to regex parsing */
    }
  }

  // 3. Priority 1: Parse application/ld+json script blocks (Schema.org VideoObject & SocialMediaPosting)
  const ldJsonMatches = [...rawContent.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of ldJsonMatches) {
    try {
      const ldData = JSON.parse(match[1]);
      // Check for VideoObject LD+JSON
      if (ldData['@type'] === 'VideoObject' || ldData.contentUrl) {
        const videoUrl = ldData.contentUrl || ldData.embedUrl;
        if (videoUrl && !seenIds.has(videoUrl)) {
          seenIds.add(videoUrl);
          const thumbUrl = ldData.thumbnailUrl || ldData.image || '';
          const highResCover = thumbUrl ? getHighResPinterestImageUrl(thumbUrl) : videoUrl;
          if (highResCover) seenIds.add(highResCover);

          const title = ldData.name || ldData.caption || sourceLabel;
          const item: GreppedMediaItem = {
            id: `vid_ld_${results.length + 1}_${Date.now()}`,
            sourceUrl: videoUrl,
            mediaType: 'video',
            originalMediaUrl: videoUrl,
            highResUrl: highResCover,
            videoUrl,
            videoQuality: '1080p HD',
            title,
            suggestedExt: 'mp4',
            qualityBadge: '1080p VIDEO',
            autoFilename: '',
            selected: true,
          };
          item.autoFilename = generateAutoFilename(item, results.length, renameOpts);
          results.push(item);
        }
      } else if ((ldData['@type'] === 'SocialMediaPosting' || ldData['@type'] === 'ImageObject') && ldData.image) {
        let imageUrl = typeof ldData.image === 'string' ? ldData.image : ldData.image?.url || '';
        if (imageUrl) {
          const hash = extractAssetHash(imageUrl);
          const isGif = imageUrl.toLowerCase().includes('.gif') || gifHashes.has(hash);
          let highRes = getHighResPinterestImageUrl(imageUrl);
          if (isGif) {
            highRes = highRes.replace(/\.(?:jpg|png|webp)$/i, '.gif');
          }

          if (!seenIds.has(highRes)) {
            seenIds.add(highRes);
            seenIds.add(hash);
            const title = ldData.headline || ldData.articleBody || sourceLabel;
            const item: GreppedMediaItem = {
              id: `img_ld_${results.length + 1}_${Date.now()}`,
              sourceUrl: imageUrl,
              mediaType: 'image',
              originalMediaUrl: highRes,
              highResUrl: highRes,
              title,
              suggestedExt: isGif ? 'gif' : 'jpg',
              qualityBadge: isGif ? 'ANIMATED GIF' : 'ORIGINAL 4K',
              autoFilename: '',
              selected: true,
            };
            item.autoFilename = generateAutoFilename(item, results.length, renameOpts);
            results.push(item);
          }
        }
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  // 4. Priority 2: Extract script tags containing __PINTEREST_APP_STATE__ or initial-state
  const appStateMatch =
    rawContent.match(/<script[^>]*id="__PINTEREST_APP_STATE__"[^>]*>([\s\S]*?)<\/script>/i) ||
    rawContent.match(/<script[^>]*id="initial-state"[^>]*>([\s\S]*?)<\/script>/i);

  if (appStateMatch && appStateMatch[1]) {
    try {
      const jsonState = JSON.parse(appStateMatch[1]);
      extractMediaFromJsonObj(jsonState, results, seenIds, gifHashes, renameOpts, sourceLabel);
    } catch {
      /* continue */
    }
  }

  // 5. Priority 3: Check Meta Tags (og:video, og:video:secure_url)
  const ogVideoMatch = rawContent.match(/meta[^>]*property="og:video(?::secure_url)?"[^>]*content="([^"]+)"/i);
  if (ogVideoMatch && ogVideoMatch[1]) {
    const videoUrl = ogVideoMatch[1];
    if (!seenIds.has(videoUrl)) {
      seenIds.add(videoUrl);
      const ogImageMatch = rawContent.match(/meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
      const thumb = ogImageMatch ? getHighResPinterestImageUrl(ogImageMatch[1]) : videoUrl;

      const item: GreppedMediaItem = {
        id: `vid_og_${results.length + 1}_${Date.now()}`,
        sourceUrl: videoUrl,
        mediaType: 'video',
        originalMediaUrl: videoUrl,
        highResUrl: thumb,
        videoUrl,
        videoQuality: 'HD Video',
        title: `${sourceLabel} Video`,
        suggestedExt: 'mp4',
        qualityBadge: 'HD VIDEO',
        autoFilename: '',
        selected: true,
      };
      item.autoFilename = generateAutoFilename(item, results.length, renameOpts);
      results.push(item);
    }
  }

  // 6. Priority 4: Regex pattern matching for direct video URLs (v1.pinimg.com/videos/...)
  const videoRegex = /https?:\/\/v1\.pinimg\.com\/videos\/[^\s"'\\]+\.mp4/gi;
  let videoMatch: RegExpExecArray | null;
  while ((videoMatch = videoRegex.exec(rawContent)) !== null) {
    const videoUrl = videoMatch[0];
    if (!seenIds.has(videoUrl)) {
      seenIds.add(videoUrl);

      let qualityBadge = '1080p HD';
      if (videoUrl.includes('720p')) qualityBadge = '720p HD';
      else if (videoUrl.includes('480p')) qualityBadge = '480p';
      else if (videoUrl.includes('1080p') || videoUrl.includes('mc')) qualityBadge = '1080p HQ';

      const item: GreppedMediaItem = {
        id: `vid_${results.length + 1}_${Date.now()}`,
        sourceUrl: videoUrl,
        mediaType: 'video',
        originalMediaUrl: videoUrl,
        highResUrl: videoUrl,
        videoUrl,
        videoQuality: qualityBadge,
        title: `${sourceLabel} Video ${results.length + 1}`,
        suggestedExt: 'mp4',
        qualityBadge,
        autoFilename: '',
        selected: true,
      };
      item.autoFilename = generateAutoFilename(item, results.length, renameOpts);
      results.push(item);
    }
  }

  // 7. Priority 5: Regex pattern matching for image URLs (i.pinimg.com/originals/...)
  const imgRegex = /https?:\/\/i\.pinimg\.com\/(?:originals|\d+x\d*|\d+x)\/([a-f0-9\/]+\.(?:jpg|png|webp|gif))/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imgRegex.exec(rawContent)) !== null) {
    const fullImgUrl = imgMatch[0];
    const pathPart = imgMatch[1];
    let highRes = getHighResPinterestImageUrl(fullImgUrl);
    const hash = extractAssetHash(highRes);
    const pinId = pathPart.replace(/[^a-f0-9]/gi, '').substring(0, 16);

    const isGif = fullImgUrl.toLowerCase().includes('.gif') || gifHashes.has(hash);
    if (isGif) {
      highRes = highRes.replace(/\.(?:jpg|png|webp)$/i, '.gif');
    }

    if (!seenIds.has(highRes) && !seenIds.has(hash)) {
      seenIds.add(highRes);
      seenIds.add(hash);
      const ext = isGif ? 'gif' : highRes.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';

      const item: GreppedMediaItem = {
        id: `img_${results.length + 1}_${Date.now()}`,
        pinId,
        sourceUrl: isGif ? highRes : fullImgUrl,
        mediaType: 'image',
        originalMediaUrl: highRes,
        highResUrl: highRes,
        title: `${sourceLabel} ${isGif ? 'Animated GIF' : 'Image'} ${results.length + 1}`,
        suggestedExt: ext,
        qualityBadge: isGif ? 'ANIMATED GIF' : 'ORIGINAL 4K',
        autoFilename: '',
        selected: true,
      };
      item.autoFilename = generateAutoFilename(item, results.length, renameOpts);
      results.push(item);
    }
  }

  return results;
}

function extractMediaFromJsonObj(
  obj: any,
  results: GreppedMediaItem[],
  seenIds: Set<string>,
  gifHashes: Set<string>,
  renameOpts: RenameOptions,
  boardOrTitleName: string
) {
  if (!obj || typeof obj !== 'object') return;

  if (obj.images || obj.video_list || obj.videos || obj.type === 'pin' || obj.id) {
    const pinId = String(obj.id || obj.pin_id || '');
    const title = obj.title || obj.grid_title || obj.description || obj.link || `Pin ${pinId}`;
    const boardName = obj.board?.name || boardOrTitleName;

    let videoUrl: string | null = null;
    let videoQuality = '1080p HD';
    let videoDuration: number | null = null;

    if (obj.videos?.video_list || obj.video_list) {
      const vList = obj.videos?.video_list || obj.video_list;
      const bestVideo =
        vList.V_1080P ||
        vList.V_720P ||
        vList.V_EXP7 ||
        vList.V_480P ||
        Object.values(vList)[0];

      if (bestVideo?.url) {
        videoUrl = bestVideo.url;
        videoDuration = bestVideo.duration ? Math.round(bestVideo.duration / 1000) : null;
        if (bestVideo.height >= 1080) videoQuality = '1080p HQ';
        else if (bestVideo.height >= 720) videoQuality = '720p HD';
        else videoQuality = `${bestVideo.height || 480}p`;
      }
    }

    let imageUrl = '';
    if (obj.images) {
      imageUrl =
        obj.images.originals?.url ||
        obj.images['1200x']?.url ||
        obj.images['736x']?.url ||
        obj.images['564x']?.url ||
        obj.images['474x']?.url ||
        obj.images['236x']?.url ||
        '';
    }

    if (videoUrl && !seenIds.has(videoUrl)) {
      seenIds.add(videoUrl);
      const highResImg = imageUrl ? getHighResPinterestImageUrl(imageUrl) : '';
      if (highResImg) seenIds.add(highResImg);

      const item: GreppedMediaItem = {
        id: `vid_${pinId}_${results.length}`,
        pinId,
        sourceUrl: videoUrl,
        mediaType: 'video',
        originalMediaUrl: videoUrl,
        highResUrl: highResImg || videoUrl,
        videoUrl,
        videoQuality,
        videoDuration,
        width: obj.videos?.video_list?.V_720P?.width || null,
        height: obj.videos?.video_list?.V_720P?.height || null,
        title,
        boardName,
        suggestedExt: 'mp4',
        qualityBadge: videoQuality,
        autoFilename: '',
        selected: true,
      };
      item.autoFilename = generateAutoFilename(item, results.length, renameOpts);
      results.push(item);
    } else if (imageUrl) {
      let highRes = getHighResPinterestImageUrl(imageUrl);
      const hash = extractAssetHash(highRes);
      const isGif = obj.is_animated || obj.media_type === 'gif' || imageUrl.toLowerCase().includes('.gif') || gifHashes.has(hash);
      if (isGif) {
        highRes = highRes.replace(/\.(?:jpg|png|webp)$/i, '.gif');
      }

      if (!seenIds.has(highRes) && !seenIds.has(hash)) {
        seenIds.add(highRes);
        seenIds.add(hash);
        const ext = isGif ? 'gif' : highRes.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';

        const item: GreppedMediaItem = {
          id: `img_${pinId}_${results.length}`,
          pinId,
          sourceUrl: isGif ? highRes : imageUrl,
          mediaType: 'image',
          originalMediaUrl: highRes,
          highResUrl: highRes,
          width: obj.images?.originals?.width || null,
          height: obj.images?.originals?.height || null,
          title,
          boardName,
          suggestedExt: ext,
          qualityBadge: isGif ? 'ANIMATED GIF' : 'ORIGINAL 4K',
          autoFilename: '',
          selected: true,
        };
        item.autoFilename = generateAutoFilename(item, results.length, renameOpts);
        results.push(item);
      }
    }
  }

  if (Array.isArray(obj)) {
    for (const child of obj) {
      extractMediaFromJsonObj(child, results, seenIds, gifHashes, renameOpts, boardOrTitleName);
    }
  } else {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        extractMediaFromJsonObj(obj[key], results, seenIds, gifHashes, renameOpts, boardOrTitleName);
      }
    }
  }
}

export async function grepPinterestMedia(
  input: string,
  renameOpts: RenameOptions = DEFAULT_RENAME_OPTIONS,
  onProgress?: (msg: string) => void
): Promise<GreppedMediaItem[]> {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('Please enter at least one Pinterest link or raw HTML/JSON content.');
  }

  const firstLine = lines[0];
  if (firstLine.startsWith('<') || firstLine.startsWith('{') || firstLine.startsWith('[')) {
    onProgress?.('Parsing raw HTML / JSON content...');
    const items = parsePinterestContent(input, renameOpts, 'Pasted Data');
    if (items.length === 0) {
      throw new Error('No valid Pinterest images or videos could be parsed from the pasted content.');
    }
    return items;
  }

  const allResults: GreppedMediaItem[] = [];
  const seenUrls = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const rawUrl = lines[i];
    onProgress?.(`Processing link ${i + 1} of ${lines.length}...`);

    try {
      if (rawUrl.includes('i.pinimg.com') || rawUrl.includes('v1.pinimg.com')) {
        const isVideo = rawUrl.endsWith('.mp4') || rawUrl.includes('/videos/');
        let highRes = isVideo ? rawUrl : getHighResPinterestImageUrl(rawUrl);
        const isGif = rawUrl.toLowerCase().includes('.gif');
        if (isGif) {
          highRes = highRes.replace(/\.(?:jpg|png|webp)$/i, '.gif');
        }

        if (!seenUrls.has(highRes)) {
          seenUrls.add(highRes);
          const ext = isVideo ? 'mp4' : isGif ? 'gif' : highRes.split('?')[0].split('.').pop() || 'jpg';

          const item: GreppedMediaItem = {
            id: `direct_${Date.now()}_${i}`,
            sourceUrl: rawUrl,
            mediaType: isVideo ? 'video' : 'image',
            originalMediaUrl: rawUrl,
            highResUrl: highRes,
            videoUrl: isVideo ? rawUrl : null,
            title: `Pinterest Media ${i + 1}`,
            suggestedExt: ext,
            qualityBadge: isVideo ? '1080p MP4' : isGif ? 'ANIMATED GIF' : 'ORIGINAL 4K',
            autoFilename: '',
            selected: true,
          };
          item.autoFilename = generateAutoFilename(item, allResults.length, renameOpts);
          allResults.push(item);
        }
        continue;
      }

      const htmlContent = await fetchWithCorsProxy(rawUrl);
      const boardOrSlug = rawUrl.split('/').filter(Boolean).pop() || 'pinterest';
      const items = parsePinterestContent(htmlContent, renameOpts, boardOrSlug);

      for (const item of items) {
        if (!seenUrls.has(item.highResUrl) && (!item.videoUrl || !seenUrls.has(item.videoUrl))) {
          if (item.videoUrl) seenUrls.add(item.videoUrl);
          seenUrls.add(item.highResUrl);
          item.autoFilename = generateAutoFilename(item, allResults.length, renameOpts);
          allResults.push(item);
        }
      }
    } catch (err) {
      console.warn(`Failed to grep link ${rawUrl}:`, err);
      if (rawUrl.startsWith('http')) {
        const highRes = getHighResPinterestImageUrl(rawUrl);
        const item: GreppedMediaItem = {
          id: `fallback_${Date.now()}_${i}`,
          sourceUrl: rawUrl,
          mediaType: 'image',
          originalMediaUrl: rawUrl,
          highResUrl: highRes,
          title: `Pinterest Link ${i + 1}`,
          suggestedExt: 'jpg',
          qualityBadge: 'HQ Link',
          autoFilename: generateAutoFilename({ title: `pinterest-${i + 1}` }, allResults.length, renameOpts),
          selected: true,
        };
        allResults.push(item);
      }
    }
  }

  if (allResults.length === 0) {
    throw new Error('No images or videos could be extracted. Please check the links or try pasting raw page HTML/JSON.');
  }

  return allResults;
}

/**
 * Downloads an image via HTMLCanvasElement as a fallback if direct fetch fails CORS
 */
function fetchImageViaCanvas(url: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (url.toLowerCase().includes('.gif')) {
      return resolve(null);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
        const format = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 200) resolve(blob);
            else resolve(null);
          },
          format,
          0.95
        );
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Robust Media Blob Fetcher: Uses server-side Vite proxy first, direct fetch second, canvas third, and public proxies fourth
 */
export async function fetchMediaBlob(primaryUrl: string, fallbackUrls: string[] = []): Promise<Blob> {
  const candidateUrls = [primaryUrl, ...fallbackUrls].filter(Boolean);

  for (const url of candidateUrls) {
    // Strategy 1: Server-side Vite proxy endpoint (Bypasses all CORS blocks & un-shortens pin.it)
    try {
      const localProxyUrl = `/api/pinterest-proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(localProxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 200) return blob;
      }
    } catch {
      /* Fallback to strategy 2 */
    }

    // Strategy 2: Direct fetch
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 200) return blob;
      }
    } catch {
      /* Fallback to strategy 3 */
    }

    // Strategy 3: Canvas image export (for static images only, never for animated GIFs)
    if (!url.endsWith('.mp4') && !url.includes('/videos/') && !url.toLowerCase().includes('.gif')) {
      try {
        const canvasBlob = await fetchImageViaCanvas(url);
        if (canvasBlob) return canvasBlob;
      } catch {
        /* Fallback to strategy 4 */
      }
    }

    // Strategy 4: Multi-CORS Public Proxies
    const proxies = [
      (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      (u: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(u)}`,
    ];

    for (const proxyFn of proxies) {
      try {
        const proxyUrl = proxyFn(url);
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 200) return blob;
        }
      } catch {
        continue;
      }
    }
  }

  throw new Error(`Failed to download media file from ${primaryUrl}. CORS or Network blocked.`);
}

export async function downloadBulkAsZip(
  items: GreppedMediaItem[],
  zipFilename = `pinterest_grep_${Date.now()}.zip`,
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('pinterest_media') || zip;
  let count = 0;

  for (const item of items) {
    count++;
    onProgress?.(count, items.length, item.autoFilename);

    try {
      const mediaUrl = item.videoUrl || item.highResUrl || item.originalMediaUrl;
      const fallbacks = [item.originalMediaUrl, item.sourceUrl].filter((u) => u !== mediaUrl);
      const blob = await fetchMediaBlob(mediaUrl, fallbacks);
      folder.file(item.autoFilename, blob);
    } catch (err) {
      console.error(`Failed to add ${item.autoFilename} to ZIP:`, err);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  const blobUrl = URL.createObjectURL(content);
  a.href = blobUrl;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export async function saveBulkToSupabaseStorage(
  items: GreppedMediaItem[],
  targetFolder = 'pinterest',
  onProgress?: (current: number, total: number, filename: string) => void
): Promise<{ success: number; failed: number; records: MediaRecord[]; lastError?: string }> {
  let success = 0;
  let failed = 0;
  let lastError: string | undefined;
  const records: MediaRecord[] = [];

  let count = 0;
  for (const item of items) {
    count++;
    onProgress?.(count, items.length, item.autoFilename);

    try {
      const mediaUrl = item.videoUrl || item.highResUrl || item.originalMediaUrl;
      const fallbacks = [item.originalMediaUrl, item.sourceUrl].filter((u) => u !== mediaUrl);
      const blob = await fetchMediaBlob(mediaUrl, fallbacks);

      const isGif = item.suggestedExt === 'gif' || mediaUrl.toLowerCase().includes('.gif');
      const mimeType = blob.type && blob.type !== 'application/octet-stream'
        ? blob.type
        : isGif
        ? 'image/gif'
        : item.mediaType === 'video'
        ? 'video/mp4'
        : 'image/jpeg';

      const file = new File([blob], item.autoFilename, { type: mimeType });

      const record = await uploadMedia(file, targetFolder, {
        alt_text: item.title || `Pinterest ${item.mediaType}`,
        tags: ['pinterest', item.boardName || 'grepper', item.mediaType, ...(isGif ? ['gif'] : [])],
      });

      records.push(record);
      success++;
    } catch (err) {
      const errMsg = (err as Error).message || String(err);
      console.error(`Failed to save ${item.autoFilename} to Supabase:`, err);
      lastError = errMsg;
      failed++;
    }
  }

  return { success, failed, records, lastError };
}
