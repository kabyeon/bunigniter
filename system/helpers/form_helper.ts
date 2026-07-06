// ============================================================
// BunIgniter - Form 헬퍼
// CodeIgniter3 의 Form Helper 와 동일
// ============================================================

import { escapeHtml } from "./string_helper.ts";
import { siteUrl } from "./url_helper.ts";

// ─── 폼 열기/닫기 ──────────────────────────────────────

/**
 * 폼 태그 생성
 * CI3: form_open('controller/method', $attributes, $hidden)
 *
 * - action이 상대경로면 siteUrl()로 변환
 * - method="POST" 기본 (CI3 호환)
 * - CSRF 토큰 hidden input 자동 삽입 (csrfToken 전달 시)
 *
 * @param action 폼 전송 URL
 * @param attributes HTML 속성
 * @param hidden 추가 hidden 필드 { name: value }
 * @param csrfToken CSRF 토큰 값 (전달 시 자동 삽입)
 */
export function formOpen(
	action: string = "",
	attributes: Record<string, string> = {},
	hidden: Record<string, string> = {},
	csrfToken?: string,
): string {
	// action URL 처리
	const url =
		action && !action.startsWith("http") && !action.startsWith("/") ? siteUrl(action) : action;

	// method 기본값: POST
	if (!attributes.method) {
		attributes.method = "POST";
	}

	// enctype 자동 감지 (file 입력 시)
	// (외부에서 명시하지 않으면 자동 감지하지 않음 — CI3 동일)

	// 속성 문자열 생성
	const attrStr = Object.entries(attributes)
		.map(([k, v]) => `${escapeHtml(k)}="${escapeHtml(v)}"`)
		.join(" ");

	let html = `<form action="${escapeHtml(url)}" ${attrStr}>`;

	// CSRF 토큰 자동 삽입
	if (csrfToken) {
		html += `\n  <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}" />`;
	}

	// 추가 hidden 필드
	for (const [name, value] of Object.entries(hidden)) {
		html += `\n  <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`;
	}

	return html;
}

/**
 * 멀티파트 폼 태그 생성
 * CI3: form_open_multipart('controller/method')
 */
export function formOpenMultipart(
	action: string = "",
	attributes: Record<string, string> = {},
	hidden: Record<string, string> = {},
	csrfToken?: string,
): string {
	attributes.enctype = "multipart/form-data";
	return formOpen(action, attributes, hidden, csrfToken);
}

/**
 * 폼 닫기 태그
 * CI3: form_close()
 */
export function formClose(): string {
	return "</form>";
}

// ─── 입력 요소 ──────────────────────────────────────────

/**
 * 공통 속성 문자열 생성
 */
function attrStr(attributes: Record<string, any> = {}): string {
	return Object.entries(attributes)
		.filter(([, v]) => v !== false && v !== undefined)
		.map(([k, v]) => (v === true ? escapeHtml(k) : `${escapeHtml(k)}="${escapeHtml(String(v))}"`))
		.join(" ");
}

/**
 * 텍스트 입력
 * CI3: form_input('username', '기본값', 'class="form-control"')
 */
export function formInput(
	name: string,
	value: string = "",
	attributes: Record<string, any> = {},
): string {
	const attrs = { type: "text", name, value, id: attributes.id ?? name, ...attributes };
	return `<input ${attrStr(attrs)} />`;
}

/**
 * 비밀번호 입력
 * CI3: form_password('password', '', $attributes)
 */
export function formPassword(
	name: string,
	value: string = "",
	attributes: Record<string, any> = {},
): string {
	const attrs = { type: "password", name, value, id: attributes.id ?? name, ...attributes };
	return `<input ${attrStr(attrs)} />`;
}

/**
 * 이메일 입력
 */
export function formEmail(
	name: string,
	value: string = "",
	attributes: Record<string, any> = {},
): string {
	const attrs = { type: "email", name, value, id: attributes.id ?? name, ...attributes };
	return `<input ${attrStr(attrs)} />`;
}

/**
 * 숫자 입력
 */
export function formNumber(
	name: string,
	value: string = "",
	attributes: Record<string, any> = {},
): string {
	const attrs = { type: "number", name, value, id: attributes.id ?? name, ...attributes };
	return `<input ${attrStr(attrs)} />`;
}

/**
 * 히든 입력
 * CI3: form_hidden('id', '123')
 */
export function formHidden(name: string, value: string = ""): string {
	return `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`;
}

/**
 * 텍스트에어리어
 * CI3: form_textarea('content', '기본 내용', $attributes)
 */
export function formTextarea(
	name: string,
	value: string = "",
	attributes: Record<string, any> = {},
): string {
	const { ...attrs } = attributes;
	const id = attrs.id ?? name;
	delete attrs.id;
	return `<textarea name="${escapeHtml(name)}" id="${escapeHtml(id)}" ${attrStr(attrs)}>${escapeHtml(value)}</textarea>`;
}

/**
 * 파일 업로드 입력
 * CI3: form_upload('avatar', '', $attributes)
 */
export function formUpload(
	name: string,
	_value: string = "",
	attributes: Record<string, any> = {},
): string {
	const attrs = { type: "file", name, id: attributes.id ?? name, ...attributes };
	return `<input ${attrStr(attrs)} />`;
}

// ─── 선택 요소 ──────────────────────────────────────────

/**
 * 셀렉트 박스
 * CI3: form_dropdown('country', $options, 'KR', $attributes)
 *
 * @param name 필드명
 * @param options 옵션 { value: label } 또는 [value, ...]
 * @param selected 선택된 값
 * @param attributes HTML 속성
 */
export function formDropdown(
	name: string,
	options: Record<string, string> | string[],
	selected: string | string[] = "",
	attributes: Record<string, any> = {},
): string {
	const id = attributes.id ?? name;
	const attrs = { name, id, ...attributes };

	let html = `<select ${attrStr(attrs)}>`;

	// 빈 옵션 (placeholder)
	if (attributes.placeholder) {
		html += `\n  <option value="">${escapeHtml(attributes.placeholder)}</option>`;
	}

	const optionEntries: [string, string][] = Array.isArray(options)
		? options.map((v) => [v, v])
		: Object.entries(options);

	const selectedArr = Array.isArray(selected) ? selected : [selected];

	for (const [val, label] of optionEntries) {
		const isSelected = selectedArr.includes(val) ? " selected" : "";
		html += `\n  <option value="${escapeHtml(val)}"${isSelected}>${escapeHtml(label)}</option>`;
	}

	html += "\n</select>";
	return html;
}

/**
 * 멀티셀렉트 박스
 * CI3: form_multiselect('tags[]', $options, ['php', 'js'], $attributes)
 */
export function formMultiselect(
	name: string,
	options: Record<string, string>,
	selected: string[] = [],
	attributes: Record<string, any> = {},
): string {
	attributes.multiple = true;
	if (!name.endsWith("[]")) {
		attributes.name = `${name}[]`;
	}
	return formDropdown(name, options, selected, attributes);
}

// ─── 체크박스/라디오 ────────────────────────────────────

/**
 * 체크박스
 * CI3: form_checkbox('agree', 'yes', true, $attributes)
 */
export function formCheckbox(
	name: string,
	value: string = "1",
	checked: boolean = false,
	attributes: Record<string, any> = {},
): string {
	const attrs: Record<string, any> = {
		type: "checkbox",
		name,
		value,
		id: attributes.id ?? name,
		...attributes,
	};
	if (checked) attrs.checked = true;
	return `<input ${attrStr(attrs)} />`;
}

/**
 * 라디오 버튼
 * CI3: form_radio('gender', 'male', true, $attributes)
 */
export function formRadio(
	name: string,
	value: string = "1",
	checked: boolean = false,
	attributes: Record<string, any> = {},
): string {
	const attrs: Record<string, any> = {
		type: "radio",
		name,
		value,
		id: attributes.id ?? `${name}_${value}`,
		...attributes,
	};
	if (checked) attrs.checked = true;
	return `<input ${attrStr(attrs)} />`;
}

// ─── 버튼 ───────────────────────────────────────────────

/**
 * 라벨
 * CI3: form_label('이름', 'username', $attributes)
 */
export function formLabel(
	label: string,
	forId: string = "",
	attributes: Record<string, any> = {},
): string {
	const attrs = { ...attributes };
	if (forId) attrs.for = forId;
	return `<label ${attrStr(attrs)}>${escapeHtml(label)}</label>`;
}

/**
 * 제출 버튼
 * CI3: form_submit('submit', '전송', $attributes)
 */
export function formSubmit(
	name: string = "submit",
	value: string = "Submit",
	attributes: Record<string, any> = {},
): string {
	const attrs = { type: "submit", name, value, ...attributes };
	return `<input ${attrStr(attrs)} />`;
}

/**
 * 리셋 버튼
 */
export function formReset(
	name: string = "reset",
	value: string = "Reset",
	attributes: Record<string, any> = {},
): string {
	const attrs = { type: "reset", name, value, ...attributes };
	return `<input ${attrStr(attrs)} />`;
}

/**
 * 일반 버튼
 * CI3: form_button('btn', '클릭', $attributes)
 */
export function formButton(
	name: string = "button",
	content: string = "Button",
	attributes: Record<string, any> = {},
): string {
	const attrs = { type: "button", name, ...attributes };
	return `<button ${attrStr(attrs)}>${escapeHtml(content)}</button>`;
}

// ─── 검증 에러 헬퍼 ────────────────────────────────────

/**
 * 검증 에러 표시
 * CI3: form_error('field', '<div class="error">', '</div>')
 */
export function formError(
	field: string,
	errors: Record<string, string> = {},
	prefix: string = "",
	suffix: string = "",
): string {
	const error = errors[field];
	if (!error) return "";
	return `${prefix}${escapeHtml(error)}${suffix}`;
}

/**
 * 이전 입력값 복원
 * CI3: set_value('field', '기본값')
 */
export function setValue(
	field: string,
	defaultValue: string = "",
	oldInput?: Record<string, any>,
): string {
	if (oldInput && field in oldInput) {
		return escapeHtml(String(oldInput[field]));
	}
	return escapeHtml(defaultValue);
}

/**
 * 이전 셀렉트 선택 복원
 * CI3: set_select('field', 'value', true)
 */
export function setSelect(
	field: string,
	value: string,
	defaultSelected: boolean = false,
	oldInput?: Record<string, any>,
): string {
	if (oldInput && field in oldInput) {
		const old = oldInput[field];
		const selected = Array.isArray(old) ? old.includes(value) : String(old) === value;
		return selected ? 'selected="selected"' : "";
	}
	return defaultSelected ? 'selected="selected"' : "";
}

/**
 * 이전 체크박스 상태 복원
 * CI3: set_checkbox('field', 'value', true)
 */
export function setCheckbox(
	field: string,
	value: string,
	defaultChecked: boolean = false,
	oldInput?: Record<string, any>,
): string {
	if (oldInput && field in oldInput) {
		const old = oldInput[field];
		const checked = Array.isArray(old) ? old.includes(value) : String(old) === value;
		return checked ? 'checked="checked"' : "";
	}
	return defaultChecked ? 'checked="checked"' : "";
}

/**
 * 이전 라디오 상태 복원
 * CI3: set_radio('field', 'value', true)
 */
export function setRadio(
	field: string,
	value: string,
	defaultChecked: boolean = false,
	oldInput?: Record<string, any>,
): string {
	if (oldInput && field in oldInput) {
		return String(oldInput[field]) === value ? 'checked="checked"' : "";
	}
	return defaultChecked ? 'checked="checked"' : "";
}

// ─── 편의 함수 ──────────────────────────────────────────

/**
 * CSRF hidden input 필드
 * <?= csrfField(csrfToken) ?>
 */
export function csrfField(token: string): string {
	return `<input type="hidden" name="_csrf" value="${escapeHtml(token)}" />`;
}

/**
 * HTTP 메서드 스푸핑 hidden input
 * PUT/PATCH/DELETE 폼에서 사용
 * <?= methodField("PUT") ?>
 */
export function methodField(method: string): string {
	return `<input type="hidden" name="_method" value="${escapeHtml(method.toUpperCase())}" />`;
}
