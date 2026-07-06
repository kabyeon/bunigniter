// ============================================================
// BunIgniter - Upload 헬퍼 테스트
// 실행: bun test tests/upload_test.ts
// ============================================================

import { describe, expect, test } from "bun:test";
import { Upload } from "../system/core/upload.ts";

describe("Upload.formatFileSize", () => {
	test("0바이트", () => {
		expect(Upload.formatFileSize(0)).toBe("0 B");
	});

	test("킬로바이트", () => {
		expect(Upload.formatFileSize(1024)).toBe("1.0 KB");
	});

	test("메가바이트", () => {
		expect(Upload.formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
	});

	test("기가바이트", () => {
		expect(Upload.formatFileSize(1024 * 1024 * 1024)).toBe("1.0 GB");
	});
});

describe("Upload.isImage", () => {
	test("이미지 MIME 타입", () => {
		expect(Upload.isImage("image/jpeg")).toBe(true);
		expect(Upload.isImage("image/png")).toBe(true);
		expect(Upload.isImage("image/gif")).toBe(true);
		expect(Upload.isImage("image/webp")).toBe(true);
	});

	test("비이미지 MIME 타입", () => {
		expect(Upload.isImage("application/pdf")).toBe(false);
		expect(Upload.isImage("text/html")).toBe(false);
	});
});
