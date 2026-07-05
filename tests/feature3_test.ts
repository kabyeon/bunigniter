// ============================================================
// BunIgniter - SSE, Image, Crypto 테스트
// ============================================================

import { describe, test, expect, beforeEach } from "bun:test";
import { SSEManager, createSSERoutes } from "../system/core/sse.ts";
import { ImageEditor } from "../system/core/image.ts";
import { Crypto } from "../system/core/crypto.ts";
import type { SSEEvent, SSEConfig } from "../system/core/sse.ts";

// ─── SSE 테스트 ────────────────────────────────────────

describe("SSEManager", () => {
	let manager: SSEManager;

	beforeEach(() => {
		manager = new SSEManager({ maxClients: 10 });
	});

	test("인스턴스 생성", () => {
		expect(manager).toBeDefined();
	});

	test("초기 상태", () => {
		const status = manager.status();
		expect(status.clients).toBe(0);
		expect(status.channels).toBe(0);
	});

	test("handleConnection - Response 반환", () => {
		const response = manager.handleConnection();
		expect(response).toBeInstanceOf(Response);
		expect(response.headers.get("Content-Type")).toBe("text/event-stream");
		expect(response.headers.get("Cache-Control")).toBe("no-cache");
	});

	test("handleConnection - 클라이언트 등록", () => {
		manager.handleConnection();
		const status = manager.status();
		expect(status.clients).toBe(1);
	});

	test("handleConnection - 최대 클라이언트 초과", () => {
		const smallManager = new SSEManager({ maxClients: 2 });
		smallManager.handleConnection();
		smallManager.handleConnection();
		const response = smallManager.handleConnection();
		expect(response.status).toBe(503);
	});

	test("채널 구독", () => {
		manager.handleConnection();
		const clients = manager.getClients();
		expect(clients.length).toBe(1);
		manager.subscribe(clients[0].id, "notifications");
		const channels = manager.getChannels();
		expect(channels.some(c => c.name === "notifications")).toBe(true);
	});

	test("채널 구독 해제", () => {
		manager.handleConnection();
		const clients = manager.getClients();
		manager.subscribe(clients[0].id, "notifications");
		manager.unsubscribe(clients[0].id, "notifications");
		const channels = manager.getChannels();
		expect(channels.some(c => c.name === "notifications")).toBe(false);
	});

	test("클라이언트 채널 조회", () => {
		manager.handleConnection();
		const clients = manager.getClients();
		manager.subscribe(clients[0].id, "ch1");
		manager.subscribe(clients[0].id, "ch2");
		const clientChannels = manager.getClientChannels(clients[0].id);
		expect(clientChannels).toContain("ch1");
		expect(clientChannels).toContain("ch2");
	});

	test("이벤트 히스토리", () => {
		manager.handleConnection();
		manager.broadcast({ event: "test", data: "hello" });
		const history = manager.getHistory();
		expect(history.length).toBe(1);
		expect(history[0].event).toBe("test");
	});

	test("이벤트 히스토리 - afterId", () => {
		manager.handleConnection();
		manager.broadcast({ event: "first", data: "1" });
		manager.broadcast({ event: "second", data: "2" });
		const history = manager.getHistory();
		const afterFirst = manager.getHistory(history[0].id);
		expect(afterFirst.length).toBe(1);
		expect(afterFirst[0].event).toBe("second");
	});

	test("disconnect - 클라이언트 제거", () => {
		manager.handleConnection();
		const clients = manager.getClients();
		expect(clients.length).toBe(1);
		manager.disconnect(clients[0].id);
		expect(manager.status().clients).toBe(0);
	});

	test("close - 전체 종료", () => {
		manager.handleConnection();
		manager.handleConnection();
		manager.close();
		expect(manager.status().clients).toBe(0);
	});

	test("getClients", () => {
		manager.handleConnection();
		const clients = manager.getClients();
		expect(clients.length).toBe(1);
		expect(clients[0].id).toBeDefined();
		expect(clients[0].connectedAt).toBeGreaterThan(0);
	});

	test("getChannels", () => {
		manager.handleConnection();
		const clients = manager.getClients();
		manager.subscribe(clients[0].id, "alerts");
		const channels = manager.getChannels();
		expect(channels.some(c => c.name === "alerts")).toBe(true);
	});

	test("커스텀 메타데이터", () => {
		manager.handleConnection(undefined, { userId: "42" });
		const clients = manager.getClients();
		expect(clients[0].metadata.userId).toBe("42");
	});

	test("broadcastJSON", () => {
		manager.handleConnection();
		const sent = manager.broadcastJSON("update", { count: 5 });
		expect(sent).toBe(1);
	});

	test("CORS 설정", () => {
		const corsManager = new SSEManager({ allowedOrigin: "https://example.com" });
		const response = corsManager.handleConnection();
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com");
	});
});

describe("createSSERoutes", () => {
	test("라우트 생성", () => {
		const routes = createSSERoutes();
		expect(routes.length).toBeGreaterThan(0);
	});

	test("기본 경로", () => {
		const routes = createSSERoutes();
		expect(routes[0].path).toBe("/_sse");
	});

	test("커스텀 경로", () => {
		const routes = createSSERoutes({ basePath: "/events" });
		expect(routes[0].path).toBe("/events");
	});

	test("API 라우트 포함", () => {
		const routes = createSSERoutes();
		const apiRoutes = routes.filter(r => r.path.includes("/api"));
		expect(apiRoutes.length).toBeGreaterThanOrEqual(3);
	});
});

// ─── ImageEditor 테스트 (구조 중심) ──────────────────

describe("ImageEditor", () => {
	test("정적 메서드 존재", () => {
		expect(typeof ImageEditor.fromFile).toBe("function");
		expect(typeof ImageEditor.fromBytes).toBe("function");
		expect(typeof ImageEditor.fromBlob).toBe("function");
		expect(typeof ImageEditor.fromClipboard).toBe("function");
		expect(typeof ImageEditor.edit).toBe("function");
		expect(typeof ImageEditor.thumbnail).toBe("function");
		expect(typeof ImageEditor.info).toBe("function");
		expect(typeof ImageEditor.convert).toBe("function");
		expect(typeof ImageEditor.toBase64).toBe("function");
		expect(typeof ImageEditor.toDataURL).toBe("function");
	});

	test("fromFile - 인스턴스 생성", () => {
		const editor = ImageEditor.fromFile("test.jpg");
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("fromBytes - 인스턴스 생성", () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const editor = ImageEditor.fromBytes(bytes);
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("fromBlob - 인스턴스 생성", () => {
		const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
		const editor = ImageEditor.fromBlob(blob);
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("체인 메서드 - resize", () => {
		const editor = ImageEditor.fromFile("test.jpg").resize(800, 600, { fit: "inside" });
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("체인 메서드 - rotate", () => {
		const editor = ImageEditor.fromFile("test.jpg").rotate(90);
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("체인 메서드 - flip", () => {
		const editor = ImageEditor.fromFile("test.jpg").flip();
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("체인 메서드 - flop", () => {
		const editor = ImageEditor.fromFile("test.jpg").flop();
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("체인 메서드 - modulate", () => {
		const editor = ImageEditor.fromFile("test.jpg").modulate({ brightness: 1.2, saturation: 0 });
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("체인 메서드 - 포맷", () => {
		const editor = ImageEditor.fromFile("test.jpg").webp({ quality: 80 });
		expect(editor).toBeInstanceOf(ImageEditor);
	});

	test("체인 메서드 - 다중 변환", () => {
		const editor = ImageEditor.fromFile("test.jpg")
			.resize(400, 300, { fit: "inside" })
			.rotate(90)
			.modulate({ brightness: 1.1 })
			.webp({ quality: 75 });
		expect(editor).toBeInstanceOf(ImageEditor);
	});
});

// ─── Crypto 테스트 ─────────────────────────────────────

describe("Crypto", () => {
	test("hash - SHA-256 기본", () => {
		const hash = Crypto.hash("hello world");
		expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
	});

	test("hash - SHA-512", () => {
		const hash = Crypto.hash("hello world", { algorithm: "sha512" });
		expect(hash.length).toBe(128); // 512 bits = 128 hex chars
	});

	test("hash - base64 인코딩", () => {
		const hash = Crypto.hash("hello world", { encoding: "base64" });
		expect(hash).toBe("uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=");
	});

	test("hash - Uint8Array 입력", () => {
		const data = new TextEncoder().encode("hello world");
		const hash = Crypto.hash(data);
		expect(hash).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
	});

	test("createHasher - 증분 해시", () => {
		const hasher = Crypto.createHasher("sha256");
		hasher.update("hello");
		hasher.update(" ");
		hasher.update("world");
		const result = hasher.digest("hex");
		expect(result).toBe("b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
	});

	test("hmac - SHA-256", () => {
		const hmac = Crypto.hmac("hello world", "secret-key");
		expect(hmac).toBe("095d5a21fe6d0646db223fdf3de6436bb8dfb2fab0b51677ecf6441fcf5f2a67");
	});

	test("hmac - base64 인코딩", () => {
		const hmac = Crypto.hmac("hello world", "secret-key", { encoding: "base64" });
		expect(hmac.length).toBeGreaterThan(0);
	});

	test("hmacVerify - 일치", () => {
		const signature = Crypto.hmac("payload", "secret");
		expect(Crypto.hmacVerify("payload", "secret", signature)).toBe(true);
	});

	test("hmacVerify - 불일치", () => {
		const signature = Crypto.hmac("payload", "secret");
		expect(Crypto.hmacVerify("payload", "wrong-secret", signature)).toBe(false);
	});

	test("fastHash - Wyhash 기본", () => {
		const hash = Crypto.fastHash("some data here");
		expect(typeof hash).toBe("bigint");
	});

	test("fastHash - 시드 포함", () => {
		const hash = Crypto.fastHash("some data here", 1234);
		expect(typeof hash).toBe("bigint");
	});

	test("crc32", () => {
		const hash = Crypto.crc32("data");
		expect(typeof hash).toBe("number");
	});

	test("xxHash64", () => {
		const hash = Crypto.xxHash64("data");
		expect(typeof hash).toBe("bigint");
	});

	test("hashPassword + verifyPassword (bcrypt)", async () => {
		const hash = await Crypto.hashPassword("mypassword", { algorithm: "bcrypt", cost: 4 });
		expect(hash).toContain("$2b$");
		const valid = await Crypto.verifyPassword("mypassword", hash);
		expect(valid).toBe(true);
		const invalid = await Crypto.verifyPassword("wrongpassword", hash);
		expect(invalid).toBe(false);
	});

	test("hashPasswordSync + verifyPasswordSync (bcrypt)", () => {
		const hash = Crypto.hashPasswordSync("mypassword", { algorithm: "bcrypt", cost: 4 });
		expect(hash).toContain("$2b$");
		expect(Crypto.verifyPasswordSync("mypassword", hash)).toBe(true);
		expect(Crypto.verifyPasswordSync("wrongpassword", hash)).toBe(false);
	});

	test("uuid", () => {
		const uuid = Crypto.uuid();
		expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	test("uuidBatch", () => {
		const uuids = Crypto.uuidBatch(5);
		expect(uuids.length).toBe(5);
		const unique = new Set(uuids);
		expect(unique.size).toBe(5);
	});

	test("randomBytes", () => {
		const bytes = Crypto.randomBytes(32);
		expect(bytes.length).toBe(32);
	});

	test("randomHex", () => {
		const hex = Crypto.randomHex(64);
		expect(hex.length).toBe(64);
		expect(hex).toMatch(/^[0-9a-f]+$/);
	});

	test("randomBase64", () => {
		const b64 = Crypto.randomBase64(32);
		expect(b64.length).toBeGreaterThan(0);
	});

	test("generateToken", () => {
		const token = Crypto.generateToken("bgn", 32);
		expect(token).toMatch(/^bgn_[0-9a-f]{32}$/);
	});

	test("createSignedToken + verifySignedToken", () => {
		const token = Crypto.createSignedToken("user:42", "secret");
		expect(token).toContain("user:42.");
		const result = Crypto.verifySignedToken(token, "secret");
		expect(result.valid).toBe(true);
		expect(result.payload).toBe("user:42");
	});

	test("verifySignedToken - 위조", () => {
		const token = Crypto.createSignedToken("user:42", "secret");
		const tampered = token.replace("user:42", "user:99");
		const result = Crypto.verifySignedToken(tampered, "secret");
		expect(result.valid).toBe(false);
		expect(result.payload).toBeNull();
	});

	test("secureCompare - 일치", () => {
		expect(Crypto.secureCompare("abc123", "abc123")).toBe(true);
	});

	test("secureCompare - 불일치", () => {
		expect(Crypto.secureCompare("abc123", "abc124")).toBe(false);
	});

	test("secureCompare - 길이 다름", () => {
		expect(Crypto.secureCompare("abc", "abcd")).toBe(false);
	});

	test("getAlgorithms", () => {
		const algos = Crypto.getAlgorithms();
		expect(algos).toContain("sha256");
		expect(algos).toContain("sha512");
		expect(algos).toContain("md5");
		expect(algos.length).toBeGreaterThan(10);
	});

	test("getHmacAlgorithms", () => {
		const algos = Crypto.getHmacAlgorithms();
		expect(algos).toContain("sha256");
		expect(algos).toContain("sha512");
	});

	test("getNonCryptoAlgorithms", () => {
		const algos = Crypto.getNonCryptoAlgorithms();
		expect(algos).toContain("wyhash");
		expect(algos).toContain("crc32");
		expect(algos).toContain("xxHash64");
	});
});
