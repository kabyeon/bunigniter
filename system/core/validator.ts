// ============================================================
// BunIgniter - Validation Helper
// CodeIgniter3 의 Form Validation 라이브러리와 동일
// ============================================================

export interface ValidationRule {
	/** 규칙 이름 */
	rule: string;
	/** 규칙 매개변수 */
	params?: any[];
	/** 커스텀 에러 메시지 */
	message?: string;
}

export interface ValidationError {
	field: string;
	rule: string;
	message: string;
	value: any;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
	/** 필드별 첫 번째 에러 메시지 */
	firstErrors: Record<string, string>;
}

/** 기본 에러 메시지 */
const DEFAULT_MESSAGES: Record<
	string,
	(field: string, params?: any[]) => string
> = {
	required: (field) => `${field} 필드는 필수입니다`,
	email: (field) => `${field} 필드는 유효한 이메일이어야 합니다`,
	url: (field) => `${field} 필드는 유효한 URL이어야 합니다`,
	min: (field, params) =>
		`${field} 필드는 최소 ${params?.[0] ?? 0}자여야 합니다`,
	max: (field, params) =>
		`${field} 필드는 최대 ${params?.[0] ?? 255}자여야 합니다`,
	between: (field, params) =>
		`${field} 필드는 ${params?.[0] ?? 0} ~ ${params?.[1] ?? 0} 사이여야 합니다`,
	minValue: (field, params) =>
		`${field} 필드는 ${params?.[0] ?? 0} 이상이어야 합니다`,
	maxValue: (field, params) =>
		`${field} 필드는 ${params?.[1] ?? 0} 이하여야 합니다`,
	numeric: (field) => `${field} 필드는 숫자여야 합니다`,
	integer: (field) => `${field} 필드는 정수여야 합니다`,
	alpha: (field) => `${field} 필드는 알파벳만 포함해야 합니다`,
	alphaNumeric: (field) => `${field} 필드는 알파벳과 숫자만 포함해야 합니다`,
	slug: (field) => `${field} 필드는 유효한 슬러그 형식이어야 합니다`,
	regex: (field, params) => `${field} 필드가 패턴과 일치하지 않습니다`,
	in: (field, params) =>
		`${field} 필드는 ${params?.[0]?.join(", ") ?? ""} 중 하나여야 합니다`,
	notIn: (field, params) =>
		`${field} 필드는 ${params?.[0]?.join(", ") ?? ""} 이(가) 아니어야 합니다`,
	confirmed: (field) => `${field} 확인이 일치하지 않습니다`,
	date: (field) => `${field} 필드는 유효한 날짜여야 합니다`,
	phone: (field) => `${field} 필드는 유효한 전화번호여야 합니다`,
};

/**
 * 유효성 검사 헬퍼
 *
 * 사용법:
 *   const result = Validator.check(data, {
 *     name: ['required', 'min:2'],
 *     email: ['required', 'email'],
 *     age: ['required', 'integer', 'minValue:0'],
 *     password: ['required', 'min:8', 'confirmed'],
 *   });
 *
 *   if (!result.valid) {
 *     return this.json({ errors: result.errors }, 422);
 *   }
 */
export class Validator {
	/**
	 * 데이터 유효성 검사
	 */
	static check(
		data: Record<string, any>,
		rules: Record<string, (string | ValidationRule)[]>,
		customMessages?: Record<string, string>,
	): ValidationResult {
		const errors: ValidationError[] = [];

		for (const [field, fieldRules] of Object.entries(rules)) {
			const value = data[field];

			for (const rule of fieldRules) {
				const parsed =
					typeof rule === "string" ? Validator.parseRule(rule) : rule;

				const valid = Validator.validateRule(value, parsed, data, field);

				if (!valid) {
					const message =
						parsed.message ??
						customMessages?.[`${field}.${parsed.rule}`] ??
						customMessages?.[parsed.rule] ??
						DEFAULT_MESSAGES[parsed.rule]?.(field, parsed.params) ??
						`${field} 필드가 ${parsed.rule} 규칙에 실패했습니다`;

					errors.push({
						field,
						rule: parsed.rule,
						message,
						value,
					});
					break; // 필드당 첫 번째 에러만 수집
				}
			}
		}

		const firstErrors: Record<string, string> = {};
		for (const error of errors) {
			if (!firstErrors[error.field]) {
				firstErrors[error.field] = error.message;
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			firstErrors,
		};
	}

	/**
	 * 단일 값 유효성 검사
	 */
	static validate(value: any, rules: (string | ValidationRule)[]): boolean {
		for (const rule of rules) {
			const parsed =
				typeof rule === "string" ? Validator.parseRule(rule) : rule;
			if (!Validator.validateRule(value, parsed, {}, "")) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 규칙 문자열 파싱 ("min:8" → { rule: "min", params: [8] })
	 */
	private static parseRule(ruleStr: string): ValidationRule {
		const [rule, ...paramParts] = ruleStr.split(":");
		const params =
			paramParts.length > 0
				? paramParts
						.join(":")
						.split(",")
						.map((p) => {
							const trimmed = p.trim();
							const num = Number(trimmed);
							return Number.isNaN(num) ? trimmed : num;
						})
				: undefined;

		return { rule, params };
	}

	/**
	 * 개별 규칙 검증
	 */
	private static validateRule(
		value: any,
		rule: ValidationRule,
		data: Record<string, any>,
		field: string,
	): boolean {
		const { rule: name, params = [] } = rule;

		switch (name) {
			case "required":
				return value !== undefined && value !== null && value !== "";

			case "email":
				return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));

			case "url":
				return !value || /^https?:\/\/.+/.test(String(value));

			case "min":
				return !value || String(value).length >= Number(params[0]);

			case "max":
				return !value || String(value).length <= Number(params[0]);

			case "between": {
				if (!value) return true;
				const len = String(value).length;
				return len >= Number(params[0]) && len <= Number(params[1]);
			}

			case "minValue":
				return !value || Number(value) >= Number(params[0]);

			case "maxValue":
				return !value || Number(value) <= Number(params[0]);

			case "numeric":
				return !value || !Number.isNaN(Number(value));

			case "integer":
				return !value || Number.isInteger(Number(value));

			case "alpha":
				return !value || /^[a-zA-Z]+$/.test(String(value));

			case "alphaNumeric":
				return !value || /^[a-zA-Z0-9]+$/.test(String(value));

			case "slug":
				return !value || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value));

			case "regex": {
				if (!value) return true;
				try {
					return new RegExp(String(params[0])).test(String(value));
				} catch {
					return false;
				}
			}

			case "in":
				return (
					!value ||
					(Array.isArray(params[0])
						? params[0].includes(value)
						: params.includes(value))
				);

			case "notIn":
				return (
					!value ||
					(Array.isArray(params[0])
						? !params[0].includes(value)
						: !params.includes(value))
				);

			case "confirmed":
				return !value || value === data[`${field}_confirmation`];

			case "date":
				return !value || !Number.isNaN(Date.parse(String(value)));

			case "phone":
				return !value || /^[0-9+\-() ]{7,15}$/.test(String(value));

			default:
				console.warn(`⚠️ 알 수 없는 검증 규칙: ${name}`);
				return true;
		}
	}
}

/**
 * 빠른 유효성 검사 (컨트롤러에서 사용)
 *
 *   const { valid, errors } = validate(data, {
 *     name: 'required|min:2',
 *     email: 'required|email',
 *   });
 */
export function validate(
	data: Record<string, any>,
	rules: Record<string, string>,
	customMessages?: Record<string, string>,
): ValidationResult {
	const parsedRules: Record<string, (string | ValidationRule)[]> = {};

	for (const [field, ruleStr] of Object.entries(rules)) {
		parsedRules[field] = ruleStr.split("|").map((r) => r.trim());
	}

	return Validator.check(data, parsedRules, customMessages);
}
