# 🖼 이미지 편집

Bun.Image 내장 기반 체인형 이미지 파이프라인.

## 기본 사용법

```typescript
import { ImageEditor } from "system/core/image.ts";

// 체인 API
await ImageEditor.fromFile("photo.jpg")
  .resize(400, 400, { fit: "inside" })
  .webp({ quality: 80 })
  .write("thumb.webp");
```

## 입력 소스

```typescript
// 파일 경로
ImageEditor.fromFile("photo.jpg");

// BunFile
ImageEditor.fromBunFile(Bun.file("photo.jpg"));

// 바이트
ImageEditor.fromBytes(uint8Array);

// Blob
ImageEditor.fromBlob(blob);

// 클립보드 (macOS/Windows)
const editor = ImageEditor.fromClipboard();
```

## 변환 체인

```typescript
ImageEditor.fromFile("photo.jpg")
  .resize(800, 600, { fit: "inside", withoutEnlargement: true })
  .rotate(90)
  .flip()              // 수직 뒤집기
  .flop()              // 수평 뒤집기
  .modulate({ brightness: 1.2, saturation: 0 })  // 밝기/채도
  .webp({ quality: 80 })
  .write("output.webp");
```

## 리사이즈 옵션

| fit | 설명 |
|-----|------|
| `"fill"` (기본) | 정확히 width × height로 늘림 |
| `"inside"` | 비율 유지, 박스 안에 맞춤 |

필터: `"lanczos3"`(기본), `"lanczos2"`, `"mitchell"`, `"cubic"`, `"mks2013"`, `"mks2021"`, `"bilinear"`, `"box"`, `"nearest"`

## 출력 포맷

```typescript
.jpeg({ quality: 85, progressive: true })
.png({ compressionLevel: 6 })
.png({ palette: true, colors: 64, dither: true })  // 인덱스 PNG
.webp({ quality: 80 })
.webp({ lossless: true })
.heic({ quality: 80 })   // macOS/Windows만
.avif({ quality: 60 })   // macOS/Windows만
```

## 터미널 메서드

```typescript
await editor.bytes();       // Uint8Array
await editor.buffer();      // Buffer
await editor.blob();        // Blob (MIME 포함)
await editor.encodeToBase64();  // Base64 문자열
await editor.dataurl();     // "data:image/webp;base64,..."
await editor.write("out.webp"); // 파일 저장
await editor.placeholder(); // ThumbHash 블러 data URL
await editor.response();    // Response 객체
```

## 정적 유틸리티

```typescript
// 한 번에 편집
const result = await ImageEditor.edit({
  input: "photo.jpg",
  resize: { width: 800, height: 600, fit: "inside" },
  outputFormat: "webp",
  webp: { quality: 80 },
});
await result.write("thumb.webp");

// 썸네일 생성
await ImageEditor.thumbnail("photo.jpg", 200, "thumb.webp", "webp", 80);

// 메타데이터만 조회
const info = await ImageEditor.info("photo.jpg");
// { width: 1920, height: 1080, format: "jpeg" }

// 포맷 변환
await ImageEditor.convert("photo.jpg", "photo.webp", "webp", { quality: 80 });

// Base64 인코딩
const base64 = await ImageEditor.toBase64("photo.jpg", "webp");

// Data URL
const dataurl = await ImageEditor.toDataURL("photo.jpg", "webp");
```

## Bun.serve 통합

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
