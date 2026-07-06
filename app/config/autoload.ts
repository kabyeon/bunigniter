// ============================================================
// BunIgniter - Autoload 설정
// CodeIgniter3 의 application/config/autoload.php 와 동일
// ============================================================

import type { AutoloadConfig } from "../../system/core/autoload.ts";

const autoload: AutoloadConfig = {
	/** 자동 로드할 라이브러리 (예: ["session", "email"]) */
	libraries: [],

	/** 자동 로드할 헬퍼 (예: ["url", "form", "html"]) */
	helpers: [],

	/** 자동 로드할 모델 (예: ["user_model"]) */
	models: [],

	/** 모든 라우트에 적용할 미들웨어 */
	middleware: [],
};

export default autoload;
