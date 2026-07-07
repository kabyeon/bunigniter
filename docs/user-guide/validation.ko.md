# ✅ 유효성 검사

20개 이상의 검증 규칙을 제공합니다.

## 빠른 검증

```typescript
import { validate } from "system/core/validator.ts";

const { valid, errors, firstErrors } = validate(data, {
  name: "required|min:2|max:100",
  email: "required|email",
  password: "required|min:8|confirmed",
  role: "required|in:admin,user,guest",
});

if (!valid) return this.json({ errors: firstErrors }, 422);
```

## 지원 규칙

| 규칙 | 설명 | 예시 |
|------|------|------|
| `required` | 필수 | `required` |
| `email` | 이메일 형식 | `email` |
| `url` | URL 형식 | `url` |
| `min:N` | 최소 길이 | `min:8` |
| `max:N` | 최대 길이 | `max:255` |
| `between:N,M` | 길이 범위 | `between:2,50` |
| `minValue:N` | 최소값 | `minValue:0` |
| `maxValue:N` | 최대값 | `maxValue:100` |
| `numeric` | 숫자 | `numeric` |
| `integer` | 정수 | `integer` |
| `alpha` | 알파벳만 | `alpha` |
| `alphaNumeric` | 알파벳+숫자 | `alphaNumeric` |
| `slug` | 슬러그 형식 | `slug` |
| `regex:패턴` | 정규식 | `regex:^[a-z]+$` |
| `in:값1,값2` | 목록 포함 | `in:admin,user` |
| `notIn:값1,값2` | 목록 제외 | `notIn:root,admin` |
| `confirmed` | 확인 필드 일치 | `confirmed` |
| `date` | 날짜 형식 | `date` |
| `phone` | 전화번호 형식 | `phone` |

## 커스텀 메시지

```typescript
import { Validator } from "system/core/validator.ts";

const result = Validator.check(data, { name: ["required", "min:2"] }, {
  "name.required": "이름을 입력해주세요",
  "name.min": "이름은 최소 2자 이상이어야 합니다",
});
```

## 단일 값 검증

```typescript
Validator.validate("alice@test.com", ["email"]); // true
Validator.validate(25, ["integer", "minValue:0"]); // true
```
