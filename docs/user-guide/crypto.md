# 🔐 Cryptography

Utilizing Bun's built-in `Bun.CryptoHasher`, `Bun.hash`, `Bun.password`, `crypto.randomUUID`.

## Hashing (Bun.CryptoHasher)

```typescript
import { Crypto } from "system/core/crypto.ts";

// SHA-256 (default)
Crypto.hash("hello world");
// => "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"

// SHA-512
Crypto.hash("hello world", { algorithm: "sha512" });

// Base64 encoding
Crypto.hash("hello world", { encoding: "base64" });

// Incremental hashing (streaming)
const hasher = Crypto.createHasher("sha256");
hasher.update("hello");
hasher.update(" ");
hasher.update("world");
hasher.digest("hex");

// File hashing
await Crypto.hashFile("photo.jpg", { algorithm: "sha256" });
```

## HMAC

```typescript
// HMAC-SHA256
Crypto.hmac("payload", "secret-key");

// Verification
const sig = Crypto.hmac("payload", "secret");
Crypto.hmacVerify("payload", "secret", sig); // true
Crypto.hmacVerify("payload", "wrong", sig);  // false
```

## Non-Cryptographic Hashing (Bun.hash)

```typescript
// Wyhash (64-bit bigint)
Crypto.fastHash("data");

// CRC32
Crypto.crc32("data");

// xxHash64
Crypto.xxHash64("data");

// With seed
Crypto.fastHash("data", 1234);
```

## Password Hashing (Bun.password)

```typescript
// Argon2id (default)
const hash = await Crypto.hashPassword("mypassword");

// bcrypt
const hash = await Crypto.hashPassword("mypassword", {
  algorithm: "bcrypt",
  cost: 12,
});

// Custom argon2
const hash = await Crypto.hashPassword("mypassword", {
  algorithm: "argon2id",
  memoryCost: 65536,
  timeCost: 3,
});

// Verify
await Crypto.verifyPassword("mypassword", hash);

// Sync versions
Crypto.hashPasswordSync("mypassword", { algorithm: "bcrypt", cost: 4 });
Crypto.verifyPasswordSync("mypassword", hash);
```

## UUID & Random

```typescript
Crypto.uuid();             // "550e8400-e29b-41d4-a716-446655440000"
Crypto.uuidBatch(5);       // array of 5 UUIDs
Crypto.randomBytes(32);    // Uint8Array(32)
Crypto.randomHex(64);      // 64-char hex string
Crypto.randomBase64(32);   // Base64 string
Crypto.generateToken("bgn"); // "bgn_a1b2c3..."
```

## Signed Tokens

```typescript
// Create
const token = Crypto.createSignedToken("user:42", "secret");
// => "user:42.abc123..."

// Verify
const result = Crypto.verifySignedToken(token, "secret");
// { valid: true, payload: "user:42" }

// Tamper detection
Crypto.verifySignedToken(tamperedToken, "secret");
// { valid: false, payload: null }
```

## Timing Attack Prevention

```typescript
Crypto.secureCompare("abc123", "abc123"); // true
Crypto.secureCompare("abc123", "abc124"); // false
```

## Supported Algorithms

| Category | Algorithms |
|---------|------------|
| Cryptographic Hash | blake2b256/512, md4/5, ripemd160, sha1/224/256/384/512, sha3-224/256/384/512, shake128/256 |
| HMAC | blake2b512, md5, sha1, sha224/256/384/512, sha512-224/256 |
| Password | bcrypt (4-31), argon2id/i/d |
| Non-Cryptographic | wyhash, crc32, adler32, cityHash32/64, xxHash32/64/3, murmur32v3/v2, murmur64v2, rapidhash |
