// ============================================================
// BunIgniter - Form Helper 테스트
// ============================================================

import { describe, expect, test } from "bun:test";
import {
	csrfField,
	formButton,
	formCheckbox,
	formClose,
	formDropdown,
	formEmail,
	formError,
	formHidden,
	formInput,
	formLabel,
	formMultiselect,
	formOpen,
	formOpenMultipart,
	formPassword,
	formRadio,
	formReset,
	formSubmit,
	formTextarea,
	formUpload,
	methodField,
	setCheckbox,
	setRadio,
	setSelect,
	setValue,
} from "../system/helpers/form_helper.ts";

describe("Form Helper - formOpen", () => {
	test("기본 폼 생성", () => {
		const html = formOpen("/posts");
		expect(html).toContain('action="/posts"');
		expect(html).toContain('method="POST"');
		expect(html).toContain("<form");
	});

	test("CSRF 토큰 자동 삽입", () => {
		const html = formOpen("/posts", {}, {}, "token123");
		expect(html).toContain('name="_csrf"');
		expect(html).toContain('value="token123"');
	});

	test("hidden 필드 추가", () => {
		const html = formOpen("/posts", {}, { _method: "PUT" });
		expect(html).toContain('name="_method"');
		expect(html).toContain('value="PUT"');
	});

	test("커스텀 속성", () => {
		const html = formOpen("/posts", { class: "form", id: "postForm" });
		expect(html).toContain('class="form"');
		expect(html).toContain('id="postForm"');
	});
});

describe("Form Helper - formOpenMultipart", () => {
	test("enctype 자동 설정", () => {
		const html = formOpenMultipart("/upload");
		expect(html).toContain('enctype="multipart/form-data"');
	});
});

describe("Form Helper - formClose", () => {
	test("닫기 태그", () => {
		expect(formClose()).toBe("</form>");
	});
});

describe("Form Helper - formInput", () => {
	test("텍스트 입력", () => {
		const html = formInput("username", "Alice");
		expect(html).toContain('type="text"');
		expect(html).toContain('name="username"');
		expect(html).toContain('value="Alice"');
		expect(html).toContain('id="username"');
	});

	test("커스텀 속성", () => {
		const html = formInput("email", "", { class: "form-control", placeholder: "이메일" });
		expect(html).toContain('class="form-control"');
		expect(html).toContain('placeholder="이메일"');
	});
});

describe("Form Helper - formPassword", () => {
	test("비밀번호 입력", () => {
		const html = formPassword("password");
		expect(html).toContain('type="password"');
		expect(html).toContain('name="password"');
	});
});

describe("Form Helper - formHidden", () => {
	test("히든 입력", () => {
		const html = formHidden("id", "123");
		expect(html).toContain('type="hidden"');
		expect(html).toContain('name="id"');
		expect(html).toContain('value="123"');
	});
});

describe("Form Helper - formTextarea", () => {
	test("텍스트에어리어", () => {
		const html = formTextarea("content", "Hello");
		expect(html).toContain("<textarea");
		expect(html).toContain(">Hello</textarea>");
		expect(html).toContain('name="content"');
	});
});

describe("Form Helper - formDropdown", () => {
	test("셀렉트 박스", () => {
		const html = formDropdown("country", { KR: "한국", US: "미국" }, "KR");
		expect(html).toContain("<select");
		expect(html).toContain('value="KR" selected');
		expect(html).toContain(">한국</option>");
	});

	test("배열 옵션", () => {
		const html = formDropdown("size", ["small", "large"], "small");
		expect(html).toContain('value="small" selected');
	});

	test("placeholder 옵션", () => {
		const html = formDropdown("color", { R: "Red" }, "", { placeholder: "선택하세요" });
		expect(html).toContain("선택하세요");
	});
});

describe("Form Helper - formCheckbox", () => {
	test("체크박스 (미선택)", () => {
		const html = formCheckbox("agree", "yes", false);
		expect(html).toContain('type="checkbox"');
		expect(html).not.toContain("checked");
	});

	test("체크박스 (선택)", () => {
		const html = formCheckbox("agree", "yes", true);
		expect(html).toContain("checked");
	});
});

describe("Form Helper - formRadio", () => {
	test("라디오 버튼", () => {
		const html = formRadio("gender", "male", true);
		expect(html).toContain('type="radio"');
		expect(html).toContain("checked");
	});
});

describe("Form Helper - formLabel", () => {
	test("라벨", () => {
		const html = formLabel("이름", "username");
		expect(html).toContain("<label");
		expect(html).toContain('for="username"');
		expect(html).toContain("이름");
	});
});

describe("Form Helper - 버튼", () => {
	test("제출 버튼", () => {
		const html = formSubmit("submit", "전송");
		expect(html).toContain('type="submit"');
		expect(html).toContain('value="전송"');
	});

	test("일반 버튼", () => {
		const html = formButton("btn", "클릭");
		expect(html).toContain("<button");
		expect(html).toContain("클릭");
	});
});

describe("Form Helper - 검증", () => {
	test("formError: 에러 있음", () => {
		const errors = { email: "이메일 형식이 아닙니다" };
		const html = formError("email", errors, '<span class="error">', "</span>");
		expect(html).toContain("이메일 형식이 아닙니다");
		expect(html).toContain('<span class="error">');
	});

	test("formError: 에러 없음", () => {
		expect(formError("name", {})).toBe("");
	});

	test("setValue: 이전 입력값", () => {
		expect(setValue("name", "기본값", { name: "Alice" })).toBe("Alice");
	});

	test("setValue: 기본값", () => {
		expect(setValue("name", "기본값")).toBe("기본값");
	});

	test("setSelect: 선택 복원", () => {
		expect(setSelect("country", "KR", false, { country: "KR" })).toContain("selected");
	});

	test("setCheckbox: 체크 복원", () => {
		expect(setCheckbox("agree", "1", false, { agree: "1" })).toContain("checked");
	});

	test("setRadio: 라디오 복원", () => {
		expect(setRadio("gender", "male", false, { gender: "male" })).toContain("checked");
	});
});

describe("Form Helper - 편의 함수", () => {
	test("csrfField", () => {
		const html = csrfField("token123");
		expect(html).toContain('name="_csrf"');
		expect(html).toContain('value="token123"');
	});

	test("methodField", () => {
		const html = methodField("PUT");
		expect(html).toContain('name="_method"');
		expect(html).toContain('value="PUT"');
	});
});
