// ============================================================
// BunIgniter - 암호화 헬퍼
// Bun 내장: Bun.CryptoHasher, Bun.hash, Bun.password, crypto.randomUUID
// ============================================================

// ─── 타입 정의 ────────────────────────────────────────

export type CryptoAlgorithm =
	| "blake2b256"
	| "blake2b512"
	| "md4"
	| "md5"
	| "ripemd160"
	| "sha1"
	| "sha224"
	| "sha256"
	| "sha384"
	| "sha512"
	| "sha512-224"
	| "sha512-256"
	| "sha3-224"
	| "sha3-256"
	| "sha3-384"
	| "sha3-512"
	| "shake128"
	| "shake256";

export type HmacAlgorithm =
	| "blake2b512"
	| "md5"
	| "sha1"
	| "sha224"
	| "sha256"
	| "sha384"
	| "sha512-224"
	| "sha512-256"
	| "sha512";

export type PasswordAlgorithm = "bcrypt" | "argon2id" | "argon2i" | "argon2d";

export type NonCryptoAlgorithm =
	| "wyhash"
	| "crc32"
	| "adler32"
	| "cityHash32"
	| "cityHash64"
	| "xxHash32"
	| "xxHash64"
	| "xxHash3"
	| "murmur32v3"
	| "murmur32v2"
	| "murmur64v2"
	| "rapidhash";

export type DigestEncoding = "hex" | "base64" | "base64url";

export interface HashOptions {
	algorithm?: CryptoAlgorithm;
	encoding?: DigestEncoding;
}

export interface HmacOptions {
	algorithm?: HmacAlgorithm;
	encoding?: DigestEncoding;
}

export interface PasswordHashOptions {
	algorithm?: PasswordAlgorithm;
	/** bcrypt cost (4-31) */
	cost?: number;
	/** argon2 memory cost in kibibytes (min 8) */
	memoryCost?: number;
	/** argon2 iterations */
	timeCost?: number;
}

// ─── Crypto 헬퍼 클래스 ────────────────────────────────

/**
 * Bun 내장 암호화 기능 래퍼
 * Bun.CryptoHasher, Bun.hash, Bun.password, crypto.randomUUID 활용
 */
export class Crypto {
	// ─── 해시 ────────────────────────────────────────

	/** 약한 해시 알고리즘 (보안 목적 사용 금지) */
	private static WEAK_ALGORITHMS = new Set(["md4", "md5", "ripemd160", "sha1"]);

	/**
	 * 데이터 해시 (Bun.CryptoHasher)
	 *
	 * @example
	 * ```typescript
	 * Crypto.hash("hello world");                          // sha256 hex 기본
	 * Crypto.hash("hello world", { algorithm: "sha512" }); // sha512 hex
	 * Crypto.hash("hello world", { encoding: "base64" });  // sha256 base64
	 * ```
	 */
	static hash(
		data: string | Uint8Array | ArrayBuffer,
		options?: HashOptions,
	): string {
		const algorithm = options?.algorithm ?? "sha256";
		const encoding = options?.encoding ?? "hex";

		// 약한 알고리즘 사용 시 경고
		if (Crypto.WEAK_ALGORITHMS.has(algorithm)) {
			console.warn(
				`[BunIgniter Crypto] ⚠️ ${algorithm}은(는) 보안 목적으로 사용할 수 없습니다. sha256 이상을 사용하세요.`,
			);
		}

		const hasher = new Bun.CryptoHasher(algorithm);
		hasher.update(data);
		return hasher.digest(encoding);
	}

	/**
	 * 증분 해시 (스트리밍)
	 *
	 * @example
	 * ```typescript
	 * const hasher = Crypto.createHasher("sha256");
	 * hasher.update("hello");
	 * hasher.update(" ");
	 * hasher.update("world");
	 * const result = hasher.digest("hex");
	 * ```
	 */
	static createHasher(algorithm: CryptoAlgorithm = "sha256"): Bun.CryptoHasher {
		return new Bun.CryptoHasher(algorithm);
	}

	/**
	 * 파일 해시
	 *
	 * @example
	 * ```typescript
	 * const fileHash = await Crypto.hashFile("photo.jpg", { algorithm: "sha256" });
	 * ```
	 */
	static async hashFile(
		filePath: string,
		options?: HashOptions,
	): Promise<string> {
		const algorithm = options?.algorithm ?? "sha256";
		const encoding = options?.encoding ?? "hex";

		const hasher = new Bun.CryptoHasher(algorithm);
		const file = Bun.file(filePath);
		const buffer = await file.arrayBuffer();
		hasher.update(buffer);
		return hasher.digest(encoding);
	}

	// ─── HMAC ────────────────────────────────────────

	/**
	 * HMAC 서명 생성
	 *
	 * @example
	 * ```typescript
	 * Crypto.hmac("hello world", "secret-key");
	 * Crypto.hmac("hello world", "secret-key", { algorithm: "sha512" });
	 * ```
	 */
	static hmac(
		data: string | Uint8Array | ArrayBuffer,
		key: string,
		options?: HmacOptions,
	): string {
		const algorithm = options?.algorithm ?? "sha256";
		const encoding = options?.encoding ?? "hex";

		const hasher = new Bun.CryptoHasher(algorithm, key);
		hasher.update(data);
		return hasher.digest(encoding as "hex" | "base64" | "base64url");
	}

	/**
	 * HMAC 검증
	 *
	 * @example
	 * ```typescript
	 * const signature = Crypto.hmac("payload", "secret");
	 * Crypto.hmacVerify("payload", "secret", signature); // true
	 * ```
	 */
	static hmacVerify(
		data: string | Uint8Array | ArrayBuffer,
		key: string,
		expected: string,
		options?: HmacOptions,
	): boolean {
		const actual = Crypto.hmac(data, key, options);
		return Crypto.secureCompare(actual, expected);
	}

	// ─── 비암호학적 해시 (Bun.hash) ─────────────────────

	/**
	 * 비암호학적 빠른 해시 (Wyhash 기본)
	 *
	 * @example
	 * ```typescript
	 * Crypto.fastHash("some data");       // 64-bit bigint
	 * Crypto.fastHash("data", 1234);      // 시드 포함
	 * Crypto.fastHash("data", undefined, "crc32"); // CRC32
	 * ```
	 */
	static fastHash(
		data: string | Uint8Array | ArrayBuffer | DataView,
		seed?: number | bigint,
		algorithm: NonCryptoAlgorithm = "wyhash",
	): number | bigint {
		const hasher = (Bun.hash as any)[algorithm] ?? Bun.hash;
		return hasher(data, seed);
	}

	/**
	 * CRC32 체크섬
	 */
	static crc32(data: string | Uint8Array | ArrayBuffer, seed?: number): number {
		return Bun.hash.crc32(data, seed);
	}

	/**
	 * xxHash64
	 */
	static xxHash64(
		data: string | Uint8Array | ArrayBuffer,
		seed?: bigint,
	): bigint {
		return Bun.hash.xxHash64(data, seed);
	}

	// ─── 비밀번호 해시 ────────────────────────────────

	/**
	 * 비밀번호 해시 (Bun.password)
	 *
	 * @example
	 * ```typescript
	 * const hash = await Crypto.hashPassword("mypassword");
	 * const hash = await Crypto.hashPassword("mypassword", { algorithm: "bcrypt", cost: 12 });
	 * ```
	 */
	static async hashPassword(
		password: string,
		options?: PasswordHashOptions,
	): Promise<string> {
		const algorithm = options?.algorithm ?? "argon2id";

		if (algorithm === "bcrypt") {
			return await Bun.password.hash(password, {
				algorithm: "bcrypt",
				cost: options?.cost ?? 10,
			});
		}

		return await Bun.password.hash(password, {
			algorithm,
			memoryCost: options?.memoryCost ?? 65536,
			timeCost: options?.timeCost ?? 3,
		});
	}

	/**
	 * 비밀번호 해시 (동기)
	 */
	static hashPasswordSync(
		password: string,
		options?: PasswordHashOptions,
	): string {
		const algorithm = options?.algorithm ?? "argon2id";

		if (algorithm === "bcrypt") {
			return Bun.password.hashSync(password, {
				algorithm: "bcrypt",
				cost: options?.cost ?? 10,
			});
		}

		return Bun.password.hashSync(password, {
			algorithm,
			memoryCost: options?.memoryCost ?? 65536,
			timeCost: options?.timeCost ?? 3,
		});
	}

	/**
	 * 비밀번호 검증
	 *
	 * @example
	 * ```typescript
	 * const valid = await Crypto.verifyPassword("mypassword", storedHash);
	 * ```
	 */
	static async verifyPassword(
		password: string,
		hash: string,
	): Promise<boolean> {
		return await Bun.password.verify(password, hash);
	}

	/**
	 * 비밀번호 검증 (동기)
	 */
	static verifyPasswordSync(password: string, hash: string): boolean {
		return Bun.password.verifySync(password, hash);
	}

	// ─── UUID ────────────────────────────────────────

	/**
	 * UUID v4 생성 (crypto.randomUUID)
	 */
	static uuid(): string {
		return crypto.randomUUID();
	}

	/**
	 * UUID v4 여러 개 생성
	 */
	static uuidBatch(count: number): string[] {
		return Array.from({ length: count }, () => crypto.randomUUID());
	}

	// ─── 랜덤 바이트 ──────────────────────────────────

	/**
	 * 암호학적으로 안전한 랜덤 바이트
	 */
	static randomBytes(length: number): Uint8Array {
		return crypto.getRandomValues(new Uint8Array(length));
	}

	/**
	 * 랜덤 hex 문자열
	 */
	static randomHex(length: number = 32): string {
		const bytes = Crypto.randomBytes(Math.ceil(length / 2));
		return Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("")
			.slice(0, length);
	}

	/**
	 * 랜덤 Base64 문자열
	 */
	static randomBase64(length: number = 32): string {
		const bytes = Crypto.randomBytes(length);
		return btoa(String.fromCharCode(...bytes));
	}

	// ─── 토큰 생성 ──────────────────────────────────

	/**
	 * API 토큰 생성
	 */
	static generateToken(prefix: string = "bgn", length: number = 32): string {
		return `${prefix}_${Crypto.randomHex(length)}`;
	}

	/**
	 * 암호화 서명 토큰 (HMAC 기반)
	 */
	static createSignedToken(
		payload: string,
		secret: string,
		algorithm: HmacAlgorithm = "sha256",
	): string {
		const signature = Crypto.hmac(payload, secret, { algorithm });
		return `${payload}.${signature}`;
	}

	/**
	 * 서명 토큰 검증
	 */
	static verifySignedToken(
		token: string,
		secret: string,
		algorithm: HmacAlgorithm = "sha256",
	): { valid: boolean; payload: string | null } {
		const idx = token.lastIndexOf(".");
		if (idx === -1) return { valid: false, payload: null };

		const payload = token.slice(0, idx);
		const signature = token.slice(idx + 1);
		const valid = Crypto.hmacVerify(payload, secret, signature, { algorithm });

		return { valid, payload: valid ? payload : null };
	}

	// ─── 유틸리티 ────────────────────────────────────

	/**
	 * 타이밍 공격 방지 문자열 비교
	 */
	static secureCompare(a: string, b: string): boolean {
		if (a.length !== b.length) return false;
		const encoder = new TextEncoder();
		const bufA = encoder.encode(a);
		const bufB = encoder.encode(b);
		let result = 0;
		for (let i = 0; i < bufA.length; i++) {
			result |= bufA[i] ^ bufB[i];
		}
		return result === 0;
	}

	/**
	 * 해시 알고리즘 목록
	 */
	static getAlgorithms(): CryptoAlgorithm[] {
		return [
			"blake2b256",
			"blake2b512",
			"md4",
			"md5",
			"ripemd160",
			"sha1",
			"sha224",
			"sha256",
			"sha384",
			"sha512",
			"sha512-224",
			"sha512-256",
			"sha3-224",
			"sha3-256",
			"sha3-384",
			"sha3-512",
			"shake128",
			"shake256",
		];
	}

	/**
	 * HMAC 알고리즘 목록
	 */
	static getHmacAlgorithms(): HmacAlgorithm[] {
		return [
			"blake2b512",
			"md5",
			"sha1",
			"sha224",
			"sha256",
			"sha384",
			"sha512-224",
			"sha512-256",
			"sha512",
		];
	}

	/**
	 * 비암호학적 해시 알고리즘 목록
	 */
	static getNonCryptoAlgorithms(): NonCryptoAlgorithm[] {
		return [
			"wyhash",
			"crc32",
			"adler32",
			"cityHash32",
			"cityHash64",
			"xxHash32",
			"xxHash64",
			"xxHash3",
			"murmur32v3",
			"murmur32v2",
			"murmur64v2",
			"rapidhash",
		];
	}
}
