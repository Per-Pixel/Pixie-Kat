import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPinterestUrl,
  parsePinterestHtml,
  resolvePinterestLink,
  downloadPinterestMedia,
} from '../pinterest.js';

const image = 'https://i.pinimg.com/736x/aa/bb/cc/asset.jpg';
const original = 'https://i.pinimg.com/originals/aa/bb/cc/asset.jpg';
const video = 'https://v1.pinimg.com/videos/mc/720p/a/b/clip.mp4';

const page = `<html><head>
<meta property="og:title" content="A pin &amp; title">
<meta content="${image}" property="og:image">
</head></html>`;

function mockResponse(body, type = 'text/html; charset=utf-8', status = 200, headers = {}) {
  return new Response(body, { status, headers: { 'content-type': type, ...headers } });
}

test('only Pinterest pages and Pinterest media hosts can be fetched', () => {
  assert.equal(assertPinterestUrl('https://pin.it/Ab12', 'page').hostname, 'pin.it');
  assert.equal(assertPinterestUrl(image, 'media').hostname, 'i.pinimg.com');
  for (const url of [
    'http://www.pinterest.com/pin/123/',
    'https://pinterest.com.evil.test/pin/123/',
    'https://127.0.0.1/pin/123/',
    'https://www.pinterest.com:8443/pin/123/',
    'https://name:pass@www.pinterest.com/pin/123/',
  ]) assert.throws(() => assertPinterestUrl(url, 'page'));
  assert.throws(() => assertPinterestUrl('https://www.pinterest.com/pin/123/', 'media'));
  assert.throws(() => assertPinterestUrl('https://i.pinimg.com/originals/asset.svg', 'media'));
});

test('selects the actual pin image instead of unrelated media and keeps an original-size fallback', () => {
  const [result] = parsePinterestHtml(page, 'https://www.pinterest.com/pin/123456789/');
  assert.equal(result.kind, 'image');
  assert.equal(result.title, 'A pin & title');
  assert.equal(result.mediaUrl, original);
  assert.equal(result.previewUrl, image);
  assert.equal(result.fallbackUrl, image);
  assert.match(result.filename, /^pinterest-123456789-.*\.jpg$/);
});

test('prefers the pinned video when a page also has its cover image', () => {
  const html = `<meta property="og:image" content="${image}"><meta property="og:video:secure_url" content="${video}">`;
  const [result] = parsePinterestHtml(html, 'https://www.pinterest.com/pin/987654321/');
  assert.equal(result.kind, 'video');
  assert.equal(result.mediaUrl, video);
  assert.equal(result.previewUrl, image);
});

test('extracts distinct pin assets from a board page without importing non-Pinterest URLs', () => {
  const state = {
    resources: { items: [
      { id: '123456789', title: 'First', images: { originals: { url: original } } },
      { id: '123456789', images: { originals: { url: original } } },
      { id: '987654321', title: 'Second', images: { originals: { url: 'https://evil.test/asset.jpg' }, '736x': { url: image } } },
    ] },
  };
  const html = `<script id="__PINTEREST_APP_STATE__" type="application/json">${JSON.stringify(state)}</script>`;
  const items = parsePinterestHtml(html, 'https://www.pinterest.com/example/my-board/');
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((item) => item.pinId), ['123456789', '987654321']);
  assert.equal(items[1].mediaUrl, original);
});

test('validates every redirect when resolving pin.it links', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'manual');
    return calls.length === 1
      ? mockResponse(null, 'text/plain', 302, { location: 'https://www.pinterest.com/pin/123456789/' })
      : mockResponse(page);
  };
  const items = await resolvePinterestLink('https://pin.it/abc123', { fetcher });
  assert.equal(items[0].pinId, '123456789');
  assert.equal(calls.length, 2);

  const badFetcher = async () => mockResponse(null, 'text/plain', 302, { location: 'http://127.0.0.1/private' });
  await assert.rejects(() => resolvePinterestLink('https://pin.it/abc123', { fetcher: badFetcher }), /Pinterest|allowed/i);
});

test('rejects HTML masquerading as an image and oversized media before returning bytes', async () => {
  await assert.rejects(
    () => downloadPinterestMedia({ mediaUrl: image }, { fetcher: async () => mockResponse('<html>login</html>') }),
    /image|video|format/i,
  );
  await assert.rejects(
    () => downloadPinterestMedia({ mediaUrl: image }, { fetcher: async () => mockResponse('x', 'image/jpeg', 200, { 'content-length': '999999999' }) }),
    /large|limit/i,
  );
});

test('falls back to the pin thumbnail if the original-size file is unavailable', async () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const requested = [];
  const fetcher = async (url) => {
    requested.push(url);
    return url === original ? mockResponse('missing', 'text/plain', 404) : mockResponse(bytes, 'image/jpeg');
  };
  const result = await downloadPinterestMedia({ mediaUrl: original, fallbackUrl: image }, { fetcher });
  assert.deepEqual(requested, [original, image]);
  assert.equal(result.mimeType, 'image/jpeg');
  assert.deepEqual(result.bytes, bytes);
});
