# 📤 File Upload

## Basic Usage

```typescript
import { Upload } from "system/core/upload.ts";

const result = await Upload.save(request, "avatar", {
  allowedMimeTypes: ["image/jpeg", "image/png"],
  maxSize: 5 * 1024 * 1024,
  uploadDir: "public/uploads",
  naming: "uuid",
});

if (result.success) {
  console.log(result.url);       // "/uploads/xxxx.jpg"
  console.log(result.fileName);  // "xxxx.jpg"
  console.log(result.size);      // 102400
}
```

## Multiple Upload

```typescript
const multiResult = await Upload.saveMany(request, "photos", {
  allowedExtensions: ["jpg", "png", "gif"],
});
```

## Utilities

```typescript
Upload.delete("/uploads/old-file.jpg");
Upload.formatFileSize(5 * 1024 * 1024); // "5.0 MB"
Upload.isImage("image/jpeg");            // true
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `allowedMimeTypes` | none | Allowed MIME types |
| `allowedExtensions` | none | Allowed file extensions |
| `maxSize` | 10MB | Maximum file size |
| `uploadDir` | `public/uploads` | Upload directory |
| `naming` | `uuid` | `"original"` / `"uuid"` / `"timestamp"` / `"hash"` |
| `overwrite` | `false` | Overwrite existing files |
