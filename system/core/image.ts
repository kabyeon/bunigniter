// ============================================================
// BunIgniter - 이미지 편집 헬퍼
// Bun.Image 내장 기반 체인형 이미지 파이프라인
// ============================================================

// ─── 타입 정의 ────────────────────────────────────────

export type ImageFormat = "jpeg" | "png" | "webp" | "heic" | "avif";

export type ResizeFit = "fill" | "inside";

export type ResizeFilter =
	| "lanczos3"
	| "lanczos2"
	| "mitchell"
	| "cubic"
	| "mks2013"
	| "mks2021"
	| "bilinear"
	| "linear"
	| "box"
	| "nearest";

export interface ResizeOptions {
	width?: number;
	height?: number;
	fit?: ResizeFit;
	withoutEnlargement?: boolean;
	filter?: ResizeFilter;
}

export interface ImageInputOptions {
	maxPixels?: number;
	autoOrient?: boolean;
}

export interface JpegOptions {
	quality?: number;
	progressive?: boolean;
}

export interface PngOptions {
	compressionLevel?: number;
	palette?: boolean;
	colors?: number;
	dither?: boolean;
}

export interface WebpOptions {
	quality?: number;
	lossless?: boolean;
}

export interface HeicOptions {
	quality?: number;
}

export interface AvifOptions {
	quality?: number;
}

export interface ModulateOptions {
	brightness?: number;
	saturation?: number;
}

export interface ImageInfo {
	width: number;
	height: number;
	format: string;
}

export interface EditOptions {
	input: string | Blob | Uint8Array | ArrayBuffer;
	inputOptions?: ImageInputOptions;
	resize?: ResizeOptions;
	rotate?: number;
	flip?: boolean;
	flop?: boolean;
	modulate?: ModulateOptions;
	outputFormat?: ImageFormat;
	jpeg?: JpegOptions;
	png?: PngOptions;
	webp?: WebpOptions;
	heic?: HeicOptions;
	avif?: AvifOptions;
}

// ─── 이미지 편집 클래스 ────────────────────────────────

/**
 * Bun.Image 기반 이미지 편집 헬퍼
 * 체인형 API + 한 번에 편집하는 정적 메서드 제공
 */
export class ImageEditor {
	private pipeline: any; // Bun.Image 인스턴스
	private constructor(pipeline: any) {
		this.pipeline = pipeline;
	}

	// ─── 정적 팩토리 ────────────────────────────────

	/**
	 * 파일 경로에서 이미지 로드
	 */
	static fromFile(path: string, options?: ImageInputOptions): ImageEditor {
		const img = new (Bun as any).Image(path, options);
		return new ImageEditor(img);
	}

	/**
	 * BunFile에서 이미지 로드
	 */
	static fromBunFile(
		file: Bun.BunFile,
		options?: ImageInputOptions,
	): ImageEditor {
		const img = (file as any).image(options);
		return new ImageEditor(img);
	}

	/**
	 * 바이트에서 이미지 로드
	 */
	static fromBytes(
		bytes: Uint8Array | ArrayBuffer,
		options?: ImageInputOptions,
	): ImageEditor {
		const img = new (Bun as any).Image(bytes, options);
		return new ImageEditor(img);
	}

	/**
	 * Blob에서 이미지 로드
	 */
	static fromBlob(blob: Blob, options?: ImageInputOptions): ImageEditor {
		const img = new (Bun as any).Image(blob, options);
		return new ImageEditor(img);
	}

	/**
	 * 클립보드에서 이미지 로드 (macOS/Windows만)
	 */
	static fromClipboard(): ImageEditor | null {
		const img = (Bun as any).Image.fromClipboard();
		if (!img) return null;
		return new ImageEditor(img);
	}

	// ─── 체인 메서드 ─────────────────────────────────

	/**
	 * 리사이즈
	 */
	resize(
		width: number,
		height?: number,
		options?: {
			fit?: ResizeFit;
			withoutEnlargement?: boolean;
			filter?: ResizeFilter;
		},
	): ImageEditor {
		this.pipeline = this.pipeline.resize(width, height, options);
		return this;
	}

	/**
	 * 회전 (90도 단위)
	 */
	rotate(degrees: number): ImageEditor {
		this.pipeline = this.pipeline.rotate(degrees);
		return this;
	}

	/**
	 * 수직 뒤집기
	 */
	flip(): ImageEditor {
		this.pipeline = this.pipeline.flip();
		return this;
	}

	/**
	 * 수평 뒤집기
	 */
	flop(): ImageEditor {
		this.pipeline = this.pipeline.flop();
		return this;
	}

	/**
	 * 밝기/채도 조절
	 */
	modulate(options: ModulateOptions): ImageEditor {
		this.pipeline = this.pipeline.modulate(options);
		return this;
	}

	/**
	 * JPEG 출력 포맷 지정
	 */
	jpeg(options?: JpegOptions): ImageEditor {
		this.pipeline = this.pipeline.jpeg(options);
		return this;
	}

	/**
	 * PNG 출력 포맷 지정
	 */
	png(options?: PngOptions): ImageEditor {
		this.pipeline = this.pipeline.png(options);
		return this;
	}

	/**
	 * WebP 출력 포맷 지정
	 */
	webp(options?: WebpOptions): ImageEditor {
		this.pipeline = this.pipeline.webp(options);
		return this;
	}

	/**
	 * HEIC 출력 포맷 지정 (macOS/Windows만)
	 */
	heic(options?: HeicOptions): ImageEditor {
		this.pipeline = this.pipeline.heic(options);
		return this;
	}

	/**
	 * AVIF 출력 포맷 지정 (macOS/Windows만)
	 */
	avif(options?: AvifOptions): ImageEditor {
		this.pipeline = this.pipeline.avif(options);
		return this;
	}

	// ─── 터미널 메서드 (await 필요) ────────────────

	/**
	 * 메타데이터 조회 (픽셀 디코딩 없음)
	 */
	async metadata(): Promise<ImageInfo> {
		return await this.pipeline.metadata();
	}

	/**
	 * Uint8Array로 인코딩
	 */
	async bytes(): Promise<Uint8Array> {
		return await this.pipeline.bytes();
	}

	/**
	 * Buffer로 인코딩
	 */
	async buffer(): Promise<Buffer> {
		return await this.pipeline.buffer();
	}

	/**
	 * Blob으로 인코딩 (MIME 타입 포함)
	 */
	async blob(): Promise<Blob> {
		return await this.pipeline.blob();
	}

	/**
	 * Base64 문자열로 인코딩 (인스턴스)
	 */
	async encodeToBase64(): Promise<string> {
		return await this.pipeline.toBase64();
	}

	/**
	 * Data URL로 인코딩
	 */
	async dataurl(): Promise<string> {
		return await this.pipeline.dataurl();
	}

	/**
	 * 파일로 저장
	 */
	async write(destination: string | Bun.BunFile): Promise<number> {
		return await this.pipeline.write(destination);
	}

	/**
	 * 플레이스홀더 생성 (ThumbHash 블러 data URL, ~400-700바이트)
	 */
	async placeholder(): Promise<string> {
		return await this.pipeline.placeholder();
	}

	/**
	 * Response로 반환 (Bun.serve 직접 사용 가능)
	 */
	async response(): Promise<Response> {
		const blob = await this.blob();
		return new Response(blob);
	}

	// ─── 정적 유틸리티 ─────────────────────────────────

	/**
	 * 한 번에 이미지 편집
	 *
	 * @example
	 * ```typescript
	 * const result = await ImageEditor.edit({
	 *   input: "photo.jpg",
	 *   resize: { width: 800, height: 600, fit: "inside" },
	 *   outputFormat: "webp",
	 *   webp: { quality: 80 },
	 * });
	 * await result.write("thumb.webp");
	 * ```
	 */
	static async edit(options: EditOptions): Promise<ImageEditor> {
		let editor: ImageEditor;

		if (typeof options.input === "string") {
			editor = ImageEditor.fromFile(options.input, options.inputOptions);
		} else if (options.input instanceof Blob) {
			editor = ImageEditor.fromBlob(options.input, options.inputOptions);
		} else {
			editor = ImageEditor.fromBytes(
				options.input as Uint8Array,
				options.inputOptions,
			);
		}

		if (options.resize) {
			const r = options.resize;
			editor = editor.resize(r.width ?? 0, r.height, {
				fit: r.fit,
				withoutEnlargement: r.withoutEnlargement,
				filter: r.filter,
			});
		}

		if (options.rotate) editor = editor.rotate(options.rotate);
		if (options.flip) editor = editor.flip();
		if (options.flop) editor = editor.flop();
		if (options.modulate) editor = editor.modulate(options.modulate);

		if (options.outputFormat === "jpeg" || options.jpeg)
			editor = editor.jpeg(options.jpeg);
		if (options.outputFormat === "png" || options.png)
			editor = editor.png(options.png);
		if (options.outputFormat === "webp" || options.webp)
			editor = editor.webp(options.webp);
		if (options.outputFormat === "heic" || options.heic)
			editor = editor.heic(options.heic);
		if (options.outputFormat === "avif" || options.avif)
			editor = editor.avif(options.avif);

		return editor;
	}

	/**
	 * 썸네일 생성
	 */
	static async thumbnail(
		input: string | Blob | Uint8Array,
		size: number,
		outputPath: string,
		format: ImageFormat = "webp",
		quality: number = 80,
	): Promise<number> {
		const editor = (
			typeof input === "string"
				? ImageEditor.fromFile(input)
				: input instanceof Blob
					? ImageEditor.fromBlob(input)
					: ImageEditor.fromBytes(input as Uint8Array)
		).resize(size, size, { fit: "inside" });

		switch (format) {
			case "jpeg":
				editor.jpeg({ quality });
				break;
			case "png":
				editor.png();
				break;
			case "webp":
				editor.webp({ quality });
				break;
			case "heic":
				editor.heic({ quality });
				break;
			case "avif":
				editor.avif({ quality });
				break;
		}

		return await editor.write(outputPath);
	}

	/**
	 * 이미지 메타데이터만 조회
	 */
	static async info(input: string | Blob | Uint8Array): Promise<ImageInfo> {
		const editor =
			typeof input === "string"
				? ImageEditor.fromFile(input)
				: input instanceof Blob
					? ImageEditor.fromBlob(input)
					: ImageEditor.fromBytes(input as Uint8Array);
		return await editor.metadata();
	}

	/**
	 * 이미지 포맷 변환
	 */
	static async convert(
		input: string | Blob | Uint8Array,
		outputPath: string,
		format: ImageFormat,
		options?: JpegOptions | PngOptions | WebpOptions,
	): Promise<number> {
		const editor =
			typeof input === "string"
				? ImageEditor.fromFile(input)
				: input instanceof Blob
					? ImageEditor.fromBlob(input)
					: ImageEditor.fromBytes(input as Uint8Array);

		switch (format) {
			case "jpeg":
				editor.jpeg(options as JpegOptions);
				break;
			case "png":
				editor.png(options as PngOptions);
				break;
			case "webp":
				editor.webp(options as WebpOptions);
				break;
			case "heic":
				editor.heic(options as HeicOptions);
				break;
			case "avif":
				editor.avif(options as AvifOptions);
				break;
		}

		return await editor.write(outputPath);
	}

	/**
	 * Base64로 인코딩
	 */
	static async toBase64(
		input: string | Blob | Uint8Array,
		format: ImageFormat = "webp",
	): Promise<string> {
		const editor =
			typeof input === "string"
				? ImageEditor.fromFile(input)
				: input instanceof Blob
					? ImageEditor.fromBlob(input)
					: ImageEditor.fromBytes(input as Uint8Array);

		switch (format) {
			case "jpeg":
				editor.jpeg();
				break;
			case "png":
				editor.png();
				break;
			case "webp":
				editor.webp();
				break;
			case "heic":
				editor.heic();
				break;
			case "avif":
				editor.avif();
				break;
		}

		return await editor.encodeToBase64();
	}

	/**
	 * Data URL로 인코딩
	 */
	static async toDataURL(
		input: string | Blob | Uint8Array,
		format: ImageFormat = "webp",
	): Promise<string> {
		const editor =
			typeof input === "string"
				? ImageEditor.fromFile(input)
				: input instanceof Blob
					? ImageEditor.fromBlob(input)
					: ImageEditor.fromBytes(input as Uint8Array);

		switch (format) {
			case "jpeg":
				editor.jpeg();
				break;
			case "png":
				editor.png();
				break;
			case "webp":
				editor.webp();
				break;
			case "heic":
				editor.heic();
				break;
			case "avif":
				editor.avif();
				break;
		}

		return await editor.dataurl();
	}
}
