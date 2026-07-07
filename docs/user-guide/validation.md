# ✅ Validation

Provides 20+ validation rules.

## Quick Validation

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

## Supported Rules

| Rule | Description | Example |
|------|-------------|---------|
| `required` | Required | `required` |
| `email` | Email format | `email` |
| `url` | URL format | `url` |
| `min:N` | Minimum length | `min:8` |
| `max:N` | Maximum length | `max:255` |
| `between:N,M` | Length range | `between:2,50` |
| `minValue:N` | Minimum value | `minValue:0` |
| `maxValue:N` | Maximum value | `maxValue:100` |
| `numeric` | Numeric | `numeric` |
| `integer` | Integer | `integer` |
| `alpha` | Alpha only | `alpha` |
| `alphaNumeric` | Alpha + numeric | `alphaNumeric` |
| `slug` | Slug format | `slug` |
| `regex:pattern` | Regular expression | `regex:^[a-z]+$` |
| `in:val1,val2` | In list | `in:admin,user` |
| `notIn:val1,val2` | Not in list | `notIn:root,admin` |
| `confirmed` | Confirmation field match | `confirmed` |
| `date` | Date format | `date` |
| `phone` | Phone number format | `phone` |

## Custom Messages

```typescript
import { Validator } from "system/core/validator.ts";

const result = Validator.check(data, { name: ["required", "min:2"] }, {
  "name.required": "Name is required",
  "name.min": "Name must be at least 2 characters",
});
```

## Single Value Validation

```typescript
Validator.validate("alice@test.com", ["email"]); // true
Validator.validate(25, ["integer", "minValue:0"]); // true
```
