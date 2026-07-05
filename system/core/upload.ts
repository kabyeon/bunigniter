// ============================================================
// BunIgniter - File Upload Helper
// CodeIgniter3 의 Upload 라이브러리와 동일
// ============================================================

import { writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

export interface UploadOptions {
	/** 허용된 MIME 타입 (예: ["image/jpeg", "image/png"]) */
	allowedMimeTypes?: string[];
	/** 허용된 확장자 (예: ["jpg", "png", "gif"]) */
	allowedExtensions?: string[];
	/** 최대 파일 크기 (바이트, 기본: 10MB) */
	maxSize?: number;
	/** 저장 디렉토리 (기본: "public/uploads") */
	uploadDir?: string;
	/** 파일명 생성 방식 */
	naming?: "original" | "uuid" | "timestamp" | "hash";
	/** 덮어쓰기 허용 */
	overwrite?: boolean;
}

export interface UploadResult {
	success: boolean;
	fileName: string;
	originalName: string;
	filePath: string;
	url: string;
	size: number;
	mimeType: string;
	extension: string;
	error?: string;
}

export interface MultiUploadResult {
	success: boolean;
	files: UploadResult[];
	errors: UploadResult[];
}

/**
 * 파일 업로드 헬퍼 클래스
 *
 * 사용법:
 *   const result = await Upload.save(request, "avatar", {
 *     allowedMimeTypes: ["image/jpeg", "image/png"],
 *     maxSize: 5 * 1024 * 1024, // 5MB
 *   });
 *
 *   if (result.success) {
 *     console.log(result.url); // "/uploads/uuid-xxxx.jpg"
 *   }
 */
export class Upload {
	/** 위험한 확장자 (서버 사이드 실행 가능) */
	private static DANGEROUS_EXTENSIONS = new Set([
		"php",
		"phtml",
		"php3",
		"php4",
		"php5",
		"phar",
		"jsp",
		"jspx",
		"asp",
		"aspx",
		"asa",
		"ascx",
		"cgi",
		"pl",
		"py",
		"rb",
		"sh",
		"bash",
		"zsh",
		"exe",
		"bat",
		"cmd",
		"com",
		"msi",
		"scr",
		"html",
		"htm",
		"svg",
		"js",
		"mjs",
		"vbs",
	]);

	/** 위험한 MIME 타입 */
	private static DANGEROUS_MIME_TYPES = new Set([
		"text/html",
		"application/xhtml+xml",
		"image/svg+xml",
		"application/javascript",
		"text/javascript",
		"application/x-javascript",
		"application/x-httpd-php",
		"application/x-shellscript",
		"application/x-msdos-program",
		"application/x-msdownload",
	]);

	private static DEFAULT_OPTIONS: UploadOptions = {
		maxSize: 10 * 1024 * 1024, // 10MB
		uploadDir: "public/uploads",
		naming: "uuid",
		overwrite: false,
	};

	/**
	 * 단일 파일 업로드
	 * CodeIgniter3: $this->upload->do_upload('field_name')
	 */
	static async save(
		request: Request,
		fieldName: string,
		options: UploadOptions = {},
	): Promise<UploadResult> {
		const opts = { ...Upload.DEFAULT_OPTIONS, ...options };

		let formData: FormData;
		try {
			formData = await request.formData();
		} catch {
			return {
				success: false,
				fileName: "",
				originalName: "",
				filePath: "",
				url: "",
				size: 0,
				mimeType: "",
				extension: "",
				error: "요청 본문을 FormData로 파싱할 수 없습니다",
			};
		}

		const file = formData.get(fieldName);
		if (!file || !(file instanceof File)) {
			return {
				success: false,
				fileName: "",
				originalName: "",
				filePath: "",
				url: "",
				size: 0,
				mimeType: "",
				extension: "",
				error: `"${fieldName}" 필드에 파일이 없습니다`,
			};
		}

		return Upload.processFile(file, opts);
	}

	/**
	 * 다중 파일 업로드
	 * CodeIgniter3: 여러 파일의 do_upload()
	 */
	static async saveMany(
		request: Request,
		fieldName: string,
		options: UploadOptions = {},
	): Promise<MultiUploadResult> {
		const opts = { ...Upload.DEFAULT_OPTIONS, ...options };

		let formData: FormData;
		try {
			formData = await request.formData();
		} catch {
			return { success: false, files: [], errors: [] };
		}

		const allFiles = formData
			.getAll(fieldName)
			.filter((f): f is File => f instanceof File);

		if (allFiles.length === 0) {
			return { success: false, files: [], errors: [] };
		}

		const files: UploadResult[] = [];
		const errors: UploadResult[] = [];

		for (const file of allFiles) {
			const result = await Upload.processFile(file, opts);
			if (result.success) {
				files.push(result);
			} else {
				errors.push(result);
			}
		}

		return { success: errors.length === 0, files, errors };
	}

	/**
	 * 파일 처리 (검증 + 저장)
	 */
	private static async processFile(
		file: File,
		options: UploadOptions,
	): Promise<UploadResult> {
		const originalName = file.name;
		const extension = extname(originalName).slice(1).toLowerCase();
		const mimeType = file.type;
		const size = file.size;

		// 위험한 확장자 차단 (항상 검사 — 옵션 무시)
		if (Upload.DANGEROUS_EXTENSIONS.has(extension)) {
			return {
				success: false,
				fileName: "",
				originalName,
				filePath: "",
				url: "",
				size,
				mimeType,
				extension,
				error: `위험한 확장자 .${extension} 은(는) 업로드할 수 없습니다`,
			};
		}

		// 위험한 MIME 타입 차단 (항상 검사 — 옵션 무시)
		// MIME 매개변수 제거 후 비교 (예: "text/html;charset=utf-8" → "text/html")
		const baseMimeType = mimeType.split(";")[0].trim().toLowerCase();
		if (Upload.DANGEROUS_MIME_TYPES.has(baseMimeType)) {
			return {
				success: false,
				fileName: "",
				originalName,
				filePath: "",
				url: "",
				size,
				mimeType,
				extension,
				error: `위험한 MIME 타입 ${mimeType} 은(는) 업로드할 수 없습니다`,
			};
		}

		// 파일명 경로 순회(Path Traversal) 검증
		const sanitizedName = basename(originalName);
		if (sanitizedName !== originalName || originalName.includes("..")) {
			return {
				success: false,
				fileName: "",
				originalName,
				filePath: "",
				url: "",
				size,
				mimeType,
				extension,
				error: "파일명에 경로 문자를 포함할 수 없습니다",
			};
		}

		// MIME 타입 검증
		if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
			if (!options.allowedMimeTypes.includes(baseMimeType)) {
				return {
					success: false,
					fileName: "",
					originalName,
					filePath: "",
					url: "",
					size,
					mimeType,
					extension,
					error: `허용되지 않는 MIME 타입: ${mimeType}`,
				};
			}
		}

		// 확장자 검증
		if (options.allowedExtensions && options.allowedExtensions.length > 0) {
			if (!options.allowedExtensions.includes(extension)) {
				return {
					success: false,
					fileName: "",
					originalName,
					filePath: "",
					url: "",
					size,
					mimeType,
					extension,
					error: `허용되지 않는 확장자: .${extension}`,
				};
			}
		}

		// 파일 크기 검증
		if (options.maxSize && size > options.maxSize) {
			const maxMB = (options.maxSize / (1024 * 1024)).toFixed(1);
			const fileMB = (size / (1024 * 1024)).toFixed(1);
			return {
				success: false,
				fileName: "",
				originalName,
				filePath: "",
				url: "",
				size,
				mimeType,
				extension,
				error: `파일 크기 초과: ${fileMB}MB (최대: ${maxMB}MB)`,
			};
		}

		// 파일명 생성
		const fileName = Upload.generateFileName(
			originalName,
			options.naming ?? "uuid",
		);

		// 저장 경로
		const uploadDir = options.uploadDir ?? "public/uploads";
		const fullPath = join(process.cwd(), uploadDir);

		// 디렉토리 생성
		if (!existsSync(fullPath)) {
			mkdirSync(fullPath, { recursive: true });
		}

		const filePath = join(fullPath, fileName);

		// 덮어쓰기 검사
		if (!options.overwrite && existsSync(filePath)) {
			return {
				success: false,
				fileName,
				originalName,
				filePath,
				url: "",
				size,
				mimeType,
				extension,
				error: "이미 존재하는 파일입니다",
			};
		}

		// 파일 저장
		try {
			const arrayBuffer = await file.arrayBuffer();
			writeFileSync(filePath, Buffer.from(arrayBuffer));
		} catch (err: any) {
			return {
				success: false,
				fileName,
				originalName,
				filePath,
				url: "",
				size,
				mimeType,
				extension,
				error: `파일 저장 실패: ${err.message}`,
			};
		}

		// 업로드 파일 실행 방지: 저장 경로가 public/ 내부면 .htaccess 생성
		try {
			const htaccessPath = join(fullPath, "..", ".htaccess");
			if (!existsSync(htaccessPath)) {
				writeFileSync(
					htaccessPath,
					'# BunIgniter - 업로드 파일 실행 방지\nphp_flag engine off\n\n<FilesMatch ".+">\n  Require all denied\n</FilesMatch>\n\n<IfModule mod_headers.c>\n  Header set Content-Disposition attachment\n  Header set X-Content-Type-Options nosniff\n</IfModule>\n',
					"utf-8",
				);
			}
		} catch {
			// .htaccess 생성 실패는 무시 (Nginx 등)
		}

		// URL 경로 생성
		const url = `/${uploadDir.replace(/^public\//, "")}/${fileName}`;

		return {
			success: true,
			fileName,
			originalName,
			filePath,
			url,
			size,
			mimeType,
			extension,
		};
	}

	/**
	 * 파일명 생성
	 */
	private static generateFileName(
		originalName: string,
		naming: "original" | "uuid" | "timestamp" | "hash",
	): string {
		const ext = extname(originalName);
		const base = basename(originalName, ext);

		switch (naming) {
			case "original":
				return originalName;
			case "uuid":
				return `${randomUUID()}${ext}`;
			case "timestamp":
				return `${Date.now()}_${base}${ext}`;
			case "hash":
				// 파일 내용 해시는 저장 전에 알 수 없으므로 UUID 기반
				return `${randomUUID().slice(0, 8)}_${base}${ext}`;
			default:
				return `${randomUUID()}${ext}`;
		}
	}

	/**
	 * 파일 삭제
	 */
	static delete(filePath: string): boolean {
		try {
			const fullPath = filePath.startsWith("/")
				? join(process.cwd(), "public", filePath)
				: filePath;

			if (existsSync(fullPath)) {
				unlinkSync(fullPath);
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}

	/**
	 * 파일 크기를 읽기 쉬운 형식으로 변환
	 */
	static formatFileSize(bytes: number): string {
		if (bytes === 0) return "0 B";
		const units = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
	}

	/**
	 * 이미지 파일인지 확인
	 */
	static isImage(mimeType: string): boolean {
		return mimeType.startsWith("image/");
	}
}
