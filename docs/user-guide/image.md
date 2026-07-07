# 🖼 Image Editing

Chainable image pipeline built on Bun.Image.

## Basic Usage

```typescript
import { ImageEditor } from "system/core/image.ts";

// Chain API
await ImageEditor.fromFile("photo.jpg")
  .resize(400, 400, { fit: "inside" })
  .webp({ quality: 80 })
  .write("thumb.webp");
```

## Input Sources

```typescript
// File path
ImageEditor.fromFile("photo.jpg");

// BunFile
ImageEditor.fromBunFile(Bun.file("photo.jpg"));

// Bytes
ImageEditor.fromBytes(uint8Array);

// Blob
ImageEditor.fromBlob(blob);

// Clipboard (macOS/Windows)
const editor = ImageEditor.fromClipboard();
```

## Transform Chain

```typescript
ImageEditor.fromFile("photo.jpg")
  .resize(800, 600, { fit: "inside", withoutEnlargement: true })
  .rotate(90)
  .flip()              // vertical flip
  .flop()              // horizontal flip
  .modulate({ brightness: 1.2, saturation: 0 })  // brightness/saturation
  .webp({ quality: 80 })
  .write("output.webp");
```

## Resize Options

| fit | Description |
|-----|-------------|
| `"fill"` (default) | Stretch exactly to width × height |
| `"inside"` | Preserve aspect ratio, fit inside box |

Filters: `"lanczos3"`(default), `"lanczos2"`, `"mitchell"`, `"cubic"`, `"mks2013"`, `"mks2021"`, `"bilinear"`, `"box"`, `"nearest"`

## Output Formats

```typescript
.jpeg({ quality: 85, progressive: true })
.png({ compressionLevel: 6 })
.png({ palette: true, colors: 64, dither: true })  // indexed PNG
.webp({ quality: 80 })
.webp({ lossless: true })
.heic({ quality: 80 })   // macOS/Windows only
.avif({ quality: 60 })   // macOS/Windows only
```

## Terminal Methods

```typescript
await editor.bytes();       // Uint8Array
await editor.buffer();      // Buffer
await editor.blob();        // Blob (with MIME)
await editor.encodeToBase64();  // Base64 string
await editor.dataurl();     // "data:image/webp;base64,..."
await editor.write("out.webp"); // Save to file
await editor.placeholder(); // ThumbHash blur data URL
await editor.response();    // Response object
```

## Static Utilities

```typescript
// Edit in one call
const result = await ImageEditor.edit({
  input: "photo.jpg",
  resize: { width: 800, height: 600, fit: "inside" },
  outputFormat: "webp",
  webp: { quality: 80 },
});
await result.write("thumb.webp");

// Generate thumbnail
await ImageEditor.thumbnail("photo.jpg", 200, "thumb.webp", "webp", 80);

// Query metadata only
const info = await ImageEditor.info("photo.jpg");
// { width: 1920, height: 1080, format: "jpeg" }

// Format conversion
await ImageEditor.convert("photo.jpg", "photo.webp", "webp", { quality: 80 });

// Base64 encoding
const base64 = await ImageEditor.toBase64("photo.jpg", "webp");

// Data URL
const dataurl = await ImageEditor.toDataURL("photo.jpg", "webp");
```

## Bun.serve Integration

```typescript
Bun.serve({
  routes: {
    "/avatar/:id": async (req) => {
      const blob = await Bun.file(`avatars/${req.params.id}.png`)
        .image()
        .resize(128, 128)
        .webp()
        .blob();
      return new Response(blob);
    },
  },
});
```
