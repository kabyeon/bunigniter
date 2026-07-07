# 📦 Archive

Tar/gzip archive utilities built on `Bun.Archive`.

Replaces CI3's Zip library.

## Creating Archives

```typescript
import { Archive, archiveDirectory } from "system/core/archive.ts";

// Create from file list
const archive = Archive.create({
  "hello.txt": "Hello, World!",
  "data.json": JSON.stringify({ foo: "bar" }),
  "nested/file.txt": "Nested content",
});

// Gzip compression
const compressed = Archive.create(
  { "src/index.ts": "console.log('Hello');" },
  { compress: "gzip" },
);

// Write to disk
await archive.write("./output.tar");
await compressed.write("./output.tar.gz");
```

## Extracting Archives

```typescript
const archive = await Archive.fromFile("./bundle.tar.gz");
const count = await archive.extract("./output");
console.log(`Extracted ${count} entries`);

// Selective extraction with glob pattern
const tsCount = await archive.extract("./output", { glob: "**/*.ts" });
```

## Reading Archives

```typescript
const archive = await Archive.fromFile("./bundle.tar.gz");

// List files
const files = await archive.listFiles();
// [{ path: "src/index.ts", size: 25 }, ...]

// Read specific file
const content = await archive.readFile("src/index.ts");

// Read JSON file
const pkg = await archive.readJson("package.json");
```

## Directory Archive

```typescript
import { archiveDirectory, extractArchive } from "system/core/archive.ts";

// Directory → tar.gz
const fileCount = await archiveDirectory("./src", "./src.tar.gz", { compress: "gzip" });

// tar.gz → Directory
const count = await extractArchive("./src.tar.gz", "./extracted");
```

## Loading from URL

```typescript
const archive = await Archive.fromUrl("https://example.com/package.tar.gz");
await archive.extract("./output");
```

## Using Bun.Archive Natively

This module wraps Bun's built-in `Bun.Archive` API:

- `new Bun.Archive(files, options)` → create archive
- `archive.extract(dir, options)` → extract
- `archive.files(glob?)` → list contents
- `archive.bytes()` / `archive.blob()` → return bytes/Blob
