# 📦 아카이브

`Bun.Archive` 내장 기능을 활용한 tar/gzip 아카이브 유틸리티입니다。

CI3의 Zip 라이브러리 대체.

## 아카이브 생성

```typescript
import { Archive, archiveDirectory } from "system/core/archive.ts";

// 파일 목록으로 생성
const archive = Archive.create({
  "hello.txt": "Hello, World!",
  "data.json": JSON.stringify({ foo: "bar" }),
  "nested/file.txt": "Nested content",
});

// gzip 압축
const compressed = Archive.create(
  { "src/index.ts": "console.log('Hello');" },
  { compress: "gzip" },
);

// 디스크에 저장
await archive.write("./output.tar");
await compressed.write("./output.tar.gz");
```

## 아카이브 추출

```typescript
const archive = await Archive.fromFile("./bundle.tar.gz");
const count = await archive.extract("./output");
console.log(`Extracted ${count} entries`);

// 글로브 패턴으로 선택적 추출
const tsCount = await archive.extract("./output", { glob: "**/*.ts" });
```

## 아카이브 읽기

```typescript
const archive = await Archive.fromFile("./bundle.tar.gz");

// 파일 목록
const files = await archive.listFiles();
// [{ path: "src/index.ts", size: 25 }, ...]

// 특정 파일 읽기
const content = await archive.readFile("src/index.ts");

// JSON 파일 읽기
const pkg = await archive.readJson("package.json");
```

## 디렉토리 아카이브

```typescript
import { archiveDirectory, extractArchive } from "system/core/archive.ts";

// 디렉토리 → tar.gz
const fileCount = await archiveDirectory("./src", "./src.tar.gz", { compress: "gzip" });

// tar.gz → 디렉토리
const count = await extractArchive("./src.tar.gz", "./extracted");
```

## URL에서 로드

```typescript
const archive = await Archive.fromUrl("https://example.com/package.tar.gz");
await archive.extract("./output");
```

## Bun.Archive 내장 사용

이 모듈은 Bun의 `Bun.Archive` 내장 API를 래핑합니다:

- `new Bun.Archive(files, options)` → 아카이브 생성
- `archive.extract(dir, options)` → 추출
- `archive.files(glob?)` → 내용 조회
- `archive.bytes()` / `archive.blob()` → 바이트/Blob 반환
