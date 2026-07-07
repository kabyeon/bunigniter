# 📤 파일 업로드

## 기본 사용법

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

## 다중 업로드

```typescript
const multiResult = await Upload.saveMany(request, "photos", {
  allowedExtensions: ["jpg", "png", "gif"],
});
```

## 유틸리티

```typescript
Upload.delete("/uploads/old-file.jpg");
Upload.formatFileSize(5 * 1024 * 1024); // "5.0 MB"
Upload.isImage("image/jpeg");            // true
```

## 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `allowedMimeTypes` | 없음 | 허용 MIME 타입 |
| `allowedExtensions` | 없음 | 허용 확장자 |
| `maxSize` | 10MB | 최대 파일 크기 |
| `uploadDir` | `public/uploads` | 저장 디렉토리 |
| `naming` | `uuid` | `"original"` / `"uuid"` / `"timestamp"` / `"hash"` |
| `overwrite` | `false` | 덮어쓰기 |
