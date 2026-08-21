# Last Summary

## Session: Fixed Animated GIF Resolution & Priority Deduplication

**1. Root Cause Analysis:**
- Pinterest pins with animated GIFs output both static JPEG frame thumbnails (`.../736x/hash.jpg`) AND the animated GIF source (`.../originals/hash.gif`).
- When thumbnail URLs were upgraded to `/originals/`, static `.jpg` thumbnails and animated `.gif` files shared the same 32-character asset hash.
- Previously, static `.jpg` thumbnails were saved in `seenIds` before the `.gif` URL could be processed, causing the parser to output a static JPEG photo instead of the active animated GIF.

**2. GIF Priority & Hash Deduplication (`pinterestService.ts`):**
- **Document-wide GIF Hash Scanning**: Scans raw HTML for `.gif` URLs and builds a document-wide `gifHashes` map.
- **Schema.org `SocialMediaPosting` Extraction**: Parses `application/ld+json` image payloads for `.gif` links and enforces `.gif` URLs when a matching GIF hash is present.
- **Priority Replacement**: When mapping image assets by hash, if a `.gif` variant exists for a given asset hash, all static `.jpg` or `.png` thumbnails for that hash are automatically superseded and replaced by the `.gif` URL (`https://i.pinimg.com/originals/hash.gif`).
- **MimeType & Canvas Safeguards**: Enforces `image/gif` MIME type on file uploads and skips single-frame HTML Canvas exports for GIF assets to prevent animation stripping.

**3. Verification:**
- Tested `https://pin.it/67O0mnpAh` $\rightarrow$ Correctly extracted and deduplicated the animated GIF (`de799cbf7550f044970b5415770d3d5a.gif`) with `ANIMATED GIF` badge.
- Tested `https://pin.it/1rXFSVjVd` $\rightarrow$ Retained 1080p MP4 Video stream extraction.
