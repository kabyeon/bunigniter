// ============================================================
// BunIgniter - Archive Utility
// Bun.Archive 내장 기능 활용
// CI3의 Zip 라이브러리 대체
// ============================================================

// ─── 인터페이스 ──────────────────────────────────────

export interface ArchiveOptions {
	/** 압축 알고리즘: "gzip" | undefined (미압축) */
	compress?: "gzip";
	/** 압축 레벨 (1-12, 기본값 6) */
	level?: number;
}

export interface ExtractOptions {
	/** 글로브 패턴 (추출 파일 필터링) */
	glob?: string | readonly string[];
}

// ─── Archive 클래스 ────────────────────────────────────

/**
 * 아카이브 유틸리티
 * Bun.Archive 내장 사용
 *
 * 사용법:
 *   import { Archive } from "system/core/archive.ts";
 *
 *   // 아카이브 생성
 *   const arc = Archive.create({
 *     "hello.txt": "Hello, World!",
 *     "data.json": JSON.stringify({ foo: "bar" }),
 *   }, { compress: "gzip" });
 *   await arc.write("./output.tar.gz");
 *
 *   // 아카이브 추출
 *   const extracted = await Archive.extract("./bundle.tar.gz", "./output");
 *
 *   // 아카이브 읽기 (추출 없이)
 *   const files = await Archive.read("./bundle.tar.gz");
 *   for (const [path, file] of files) {
 *     console.log(path, await file.text());
 *   }
 */
export class Archive {
	private bunArchive: Bun.Archive;

	private constructor(archive: Bun.Archive) {
		this.bunArchive = archive;
	}

	// ─── 정적 팩토리 메서드 ────────────────────────────

	/**
	 * 파일 목록으로 아카이브 생성
	 * Bun.Archive 내장 사용
	 */
	static create(
		files: Record<string, string | Blob | ArrayBufferView | ArrayBuffer>,
		options?: ArchiveOptions,
	): Archive {
		const bunOptions: { compress?: "gzip"; level?: number } = {};
		if (options?.compress) {
			bunOptions.compress = options.compress;
			if (options.level) bunOptions.level = options.level;
		}

		const archive = new Bun.Archive(
			files as any,
			Object.keys(bunOptions).length > 0 ? bunOptions : undefined,
		);
		return new Archive(archive);
	}

	/**
	 * 파일 경로에서 아카이브 로드
	 */
	static async fromFile(filePath: string): Promise<Archive> {
		const bytes = await Bun.file(filePath).bytes();
		const archive = new Bun.Archive(bytes);
		return new Archive(archive);
	}

	/**
	 * 바이트에서 아카이브 로드
	 */
	static fromBytes(data: ArrayBufferView | ArrayBuffer | Blob): Archive {
		const archive = new Bun.Archive(data as any);
		return new Archive(archive);
	}

	/**
	 * URL에서 아카이브 다운로드 후 로드
	 */
	static async fromUrl(url: string): Promise<Archive> {
		const response = await fetch(url);
		const blob = await response.blob();
		const archive = new Bun.Archive(blob as any);
		return new Archive(archive);
	}

	// ─── 인스턴스 메서드 ──────────────────────────────

	/**
	 * 아카이브를 디스크에 저장
	 * Bun.write() 내장 사용
	 */
	async write(filePath: string): Promise<void> {
		await Bun.write(filePath, this.bunArchive);
	}

	/**
	 * 아카이브를 바이트로 반환
	 */
	async bytes(): Promise<Uint8Array> {
		return await this.bunArchive.bytes();
	}

	/**
	 * 아카이브를 Blob으로 반환
	 */
	async blob(): Promise<Blob> {
		return await this.bunArchive.blob();
	}

	/**
	 * 아카이브 추출
	 * Bun.Archive.extract() 내장 사용
	 */
	async extract(
		targetDir: string,
		options?: ExtractOptions,
	): Promise<number> {
		if (options?.glob) {
			return await this.bunArchive.extract(targetDir, {
				glob: options.glob,
			});
		}
		return await this.bunArchive.extract(targetDir);
	}

	/**
	 * 아카이브 내용 조회 (추출 없이)
	 * Bun.Archive.files() 내장 사용
	 */
	async files(
		glob?: string | readonly string[],
	): Promise<Map<string, File>> {
		if (glob) {
			return await this.bunArchive.files(glob);
		}
		return await this.bunArchive.files();
	}

	/**
	 * 아카이브 내 파일 목록만 조회
	 */
	async listFiles(): Promise<Array<{ path: string; size: number }>> {
		const files = await this.bunArchive.files();
		const result: Array<{ path: string; size: number }> = [];
		for (const [path, file] of files) {
			result.push({ path, size: file.size });
		}
		return result;
	}

	/**
	 * 특정 파일 내용 읽기
	 */
	async readFile(filePath: string): Promise<string | null> {
		const files = await this.bunArchive.files(filePath);
		const file = files.get(filePath);
		if (!file) return null;
		return await file.text();
	}

	/**
	 * 특정 파일 내용을 JSON으로 읽기
	 */
	async readJson<T = any>(filePath: string): Promise<T | null> {
		const text = await this.readFile(filePath);
		if (!text) return null;
		try {
			return JSON.parse(text) as T;
		} catch {
			return null;
		}
	}
}

// ─── 편의 함수 ──────────────────────────────────────────

/**
 * 디렉토리를 아카이브로 생성
 * Bun.Glob 내장 사용으로 파일 수집
 */
export async function archiveDirectory(
	dir: string,
	outputPath: string,
	options?: ArchiveOptions,
): Promise<number> {
	const files: Record<string, string> = {};
	const glob = new Bun.Glob("**/*");

	for await (const path of glob.scan({ cwd: dir })) {
		const fullPath = `${dir}/${path}`;
		const stat = await Bun.file(fullPath).stat();
		if (stat && stat.isFile()) {
			const normalizedPath = path.replaceAll("\\", "/");
			files[normalizedPath] = await Bun.file(fullPath).text();
		}
	}

	const archive = Archive.create(files, options);
	await archive.write(outputPath);
	return Object.keys(files).length;
}

/**
 * 아카이브 추출 (간편 함수)
 */
export async function extractArchive(
	archivePath: string,
	targetDir: string,
	options?: ExtractOptions,
): Promise<number> {
	const archive = await Archive.fromFile(archivePath);
	return await archive.extract(targetDir, options);
}
