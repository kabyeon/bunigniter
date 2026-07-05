// ============================================================
// BunIgniter - 이메일 설정
// app/config/email.ts
// CodeIgniter3 의 application/config/email.php 와 동일
// ============================================================

export interface EmailConfig {
	/** 전송 방식: "smtp" | "sendmail" | "log" */
	driver: string;
	/** SMTP 설정 */
	smtp: {
		host: string;
		port: number;
		secure: boolean;
		username: string;
		password: string;
	};
	/** 기본 발신자 */
	from: {
		email: string;
		name: string;
	};
	/** 로그 전용 디렉토리 (driver: "log" 시) */
	logDir: string;
}

const config: EmailConfig = {
	driver: process.env.EMAIL_DRIVER ?? "log",

	smtp: {
		host: process.env.EMAIL_SMTP_HOST ?? "smtp.gmail.com",
		port: Number(process.env.EMAIL_SMTP_PORT ?? "587"),
		secure: process.env.EMAIL_SMTP_SECURE === "true",
		username: process.env.EMAIL_SMTP_USERNAME ?? "",
		password: process.env.EMAIL_SMTP_PASSWORD ?? "",
	},

	from: {
		email: process.env.EMAIL_FROM_ADDRESS ?? "noreply@bunigniter.dev",
		name: process.env.EMAIL_FROM_NAME ?? "BunIgniter",
	},

	logDir: "./storage/logs",
};

export default config;
