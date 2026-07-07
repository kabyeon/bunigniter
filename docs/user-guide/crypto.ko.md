# 🔐 암호화

Bun 내장 `Bun.CryptoHasher`, `Bun.hash`, `Bun.password`, `crypto.randomUUID` 활용.

## 해시 (Bun.CryptoHasher)

```typescript
import { Crypto } from "system/core/crypto.ts";

// SHA-256 (기본)
Crypto.hash("hello world");
// => "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"

// SHA-512
Crypto.hash("hello world", { algorithm: "sha512" });

// Base64 인코딩
Crypto.hash("hello world", { encoding: "base64" });

// 증분 해시 (스트리밍)
const hasher = Crypto.createHasher("sha256");
hasher.update("hello");
hasher.update(" ");
hasher.update("world");
hasher.digest("hex");

// 파일 해시
await Crypto.hashFile("photo.jpg", { algorithm: "sha256" });
```

## HMAC

```typescript
// HMAC-SHA256
Crypto.hmac("payload", "secret-key");

// 검증
const sig = Crypto.hmac("payload", "secret");
Crypto.hmacVerify("payload", "secret", sig); // true
Crypto.hmacVerify("payload", "wrong", sig);  // false
```

## 비암호학적 해시 (Bun.hash)

```typescript
// Wyhash (64-bit bigint)
Crypto.fastHash("data");

// CRC32
Crypto.crc32("data");

// xxHash64
Crypto.xxHash64("data");

// 시드 포함
Crypto.fastHash("data", 1234);
```

## 비밀번호 해시 (Bun.password)

```typescript
// Argon2id (기본)
const hash = await Crypto.hashPassword("mypassword");

// bcrypt
const hash = await Crypto.hashPassword("mypassword", {
  algorithm: "bcrypt",
  cost: 12,
});

// argon2 커스텀
const hash = await Crypto.hashPassword("mypassword", {
  algorithm: "argon2id",
  memoryCost: 65536,
  timeCost: 3,
});

// 검증
await Crypto.verifyPassword("mypassword", hash);

// 동기 버전
Crypto.hashPasswordSync("mypassword", { algorithm: "bcrypt", cost: 4 });
Crypto.verifyPasswordSync("mypassword", hash);
```

## UUID & 랜덤

```typescript
Crypto.uuid();             // "550e8400-e29b-41d4-a716-446655440000"
Crypto.uuidBatch(5);       // 5개 UUID 배열
Crypto.randomBytes(32);    // Uint8Array(32)
Crypto.randomHex(64);      // 64자 hex 문자열
Crypto.randomBase64(32);   // Base64 문자열
Crypto.generateToken("bgn"); // "bgn_a1b2c3..."
```

## 서명 토큰

```typescript
// 생성
const token = Crypto.createSignedToken("user:42", "secret");
// => "user:42.abc123..."

// 검증
const result = Crypto.verifySignedToken(token, "secret");
// { valid: true, payload: "user:42" }

// 위조 감지
Crypto.verifySignedToken(tamperedToken, "secret");
// { valid: false, payload: null }
```

## 타이밍 공격 방지

```typescript
Crypto.secureCompare("abc123", "abc123"); // true
Crypto.secureCompare("abc123", "abc124"); // false
```

## 지원 알고리즘

| 카테고리 | 알고리즘 |
|---------|---------|
| 암호학적 해시 | blake2b256/512, md4/5, ripemd160, sha1/224/256/384/512, sha3-224/256/384/512, shake128/256 |
| HMAC | blake2b512, md5, sha1, sha224/256/384/512, sha512-224/256 |
| 비밀번호 | bcrypt (4-31), argon2id/i/d |
| 비암호학적 | wyhash, crc32, adler32, cityHash32/64, xxHash32/64/3, murmur32v3/v2, murmur64v2, rapidhash |
