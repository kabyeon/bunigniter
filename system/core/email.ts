// ============================================================
// BunIgniter - Email Library
// 이메일 발송 라이브러리
// SMTP / sendmail / log 드라이버 지원
// sendmail: Bun.spawn stdin pipe + Bun.$ 지원
// CodeIgniter3 의 $this->email 과 유사
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
	/** sendmail 실행 파일 경로 */
	sendmailPath?: string;
	/** sendmail 추가 인수 */
	sendmailArgs?: string[];
	/** Bun.$ 셸 사용 여부 (기본: false, Bun.spawn 사용) */
	useBunShell?: boolean;
	/** 기본 발신자 */
	from: {
		email: string;
		name: string;
	};
	/** 로그 전용 디렉토리 (driver: "log" 시) */
	logDir?: string;
}

export interface EmailMessage {
	to: string | string[];
	cc?: string | string[];
	bcc?: string | string[];
	subject: string;
	html?: string;
	text?: string;
	from?: { email: string; name?: string };
	replyTo?: string;
	headers?: Record<string, string>;
}

export interface EmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

const DEFAULT_CONFIG: EmailConfig = {
	driver: "log",
	smtp: {
		host: "localhost",
		port: 587,
		secure: false,
		username: "",
		password: "",
	},
	sendmailPath: "sendmail",
	sendmailArgs: ["-t", "-i"],
	useBunShell: false,
	from: {
		email: "noreply@bunigniter.dev",
		name: "BunIgniter",
	},
	logDir: "./storage/logs",
};

/**
 * 이메일 라이브러리
 *
 * 사용법:
 *   import { Email } from "system/core/email.ts";
 *
 *   const mailer = new Email({ driver: "log" });
 *   const result = await mailer.send({
 *     to: "user@example.com",
 *     subject: "환영합니다",
 *     html: "<h1>환영합니다!</h1>",
 *   });
 */
export class Email {
	private config: EmailConfig;

	constructor(config?: Partial<EmailConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * 이메일 발송
	 */
	async send(message: EmailMessage): Promise<EmailResult> {
		try {
			const from = message.from ?? this.config.from;
			const to = Array.isArray(message.to) ? message.to : [message.to];

			if (!to.length) {
				return { success: false, error: "수신자가 없습니다" };
			}
			if (!message.subject) {
				return { success: false, error: "제목이 없습니다" };
			}
			if (!message.html && !message.text) {
				return { success: false, error: "본문이 없습니다" };
			}

			switch (this.config.driver) {
				case "smtp":
					return await this.sendViaSmtp(message, from, to);
				case "sendmail":
					return await this.sendViaSendmail(message, from, to);
				default:
					return this.sendViaLog(message, from, to);
			}
		} catch (err: any) {
			return { success: false, error: err.message };
		}
	}

	/** 간편 발송 */
	async sendSimple(to: string, subject: string, html: string): Promise<EmailResult> {
		return this.send({ to, subject, html });
	}

	/** 템플릿 기반 이메일 발송 */
	async sendTemplate(
		to: string,
		subject: string,
		templatePath: string,
		data: Record<string, any> = {},
	): Promise<EmailResult> {
		const { renderView } = await import("./view.ts");
		const response = await renderView(templatePath, data);
		const html = await response.text();
		return this.send({ to, subject, html });
	}

	// ─── SMTP 드라이버 ─────────────────────────────────

	private async sendViaSmtp(
		message: EmailMessage,
		from: { email: string; name?: string },
		to: string[],
	): Promise<EmailResult> {
		const { host, port, username, password, secure } = this.config.smtp;

		try {
			// SMTP 통신을 위한 TCP 연결
			const socket = await this.smtpConnect(host, port, secure);

			// SMTP 핸드셰이크
			await this.smtpRead(socket); // 서버 greeting
			await this.smtpWrite(socket, `EHLO ${host}`);
			await this.smtpRead(socket);

			// 인증
			if (username && password) {
				await this.smtpWrite(socket, "AUTH LOGIN");
				await this.smtpRead(socket);
				await this.smtpWrite(socket, btoa(username));
				await this.smtpRead(socket);
				await this.smtpWrite(socket, btoa(password));
				await this.smtpRead(socket);
			}

			// MAIL FROM
			await this.smtpWrite(socket, `MAIL FROM:<${from.email}>`);
			await this.smtpRead(socket);

			// RCPT TO (to + cc + bcc)
			const allRecipients = [
				...to,
				...(message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : []),
				...(message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : []),
			];
			for (const rcpt of allRecipients) {
				await this.smtpWrite(socket, `RCPT TO:<${rcpt}>`);
				await this.smtpRead(socket);
			}

			// DATA
			await this.smtpWrite(socket, "DATA");
			await this.smtpRead(socket);

			const content = this.buildEmailContent(message, from, to);
			await this.smtpWrite(socket, content);
			await this.smtpWrite(socket, ".");
			const result = await this.smtpRead(socket);

			await this.smtpWrite(socket, "QUIT");
			socket.end();

			const success = result.startsWith("250");
			return {
				success,
				messageId: success ? `smtp-${Date.now()}` : undefined,
				error: success ? undefined : `SMTP error: ${result}`,
			};
		} catch (err: any) {
			return {
				success: false,
				error: `SMTP failed: ${err.message}`,
			};
		}
	}

	private async smtpConnect(host: string, port: number, secure: boolean): Promise<any> {
		return Bun.connect({
			hostname: host,
			port,
			socket: {
				data(socket, data) {
					(socket as any).__buffer = (socket as any).__buffer
						? Buffer.concat([(socket as any).__buffer, Buffer.from(data)])
						: Buffer.from(data);
				},
				open() {},
				close() {},
				error() {},
			},
			tls: secure,
		});
	}

	private async smtpRead(socket: any): Promise<string> {
		// 버퍼에서 응답 대기 (간소화된 구현)
		return new Promise((resolve) => {
			const check = () => {
				if (socket.__buffer && socket.__buffer.length > 0) {
					const response = socket.__buffer.toString("utf-8");
					socket.__buffer = null;
					resolve(response);
				} else {
					setTimeout(check, 50);
				}
			};
			setTimeout(check, 100);
		});
	}

	private async smtpWrite(socket: any, line: string): Promise<void> {
		await socket.write(new TextEncoder().encode(`${line}\r\n`));
	}

	// ─── Sendmail 드라이버 ──────────────────────────────
	// Bun.spawn stdin pipe + Bun.$ 지원

	private async sendViaSendmail(
		message: EmailMessage,
		from: { email: string; name?: string },
		to: string[],
	): Promise<EmailResult> {
		const content = this.buildEmailContent(message, from, to);

		// Bun.$ 셸 모드
		if (this.config.useBunShell) {
			return this.sendViaSendmailShell(content, to);
		}

		// Bun.spawn stdin pipe 모드 (기본)
		return this.sendViaSendmailSpawn(content, to);
	}

	/**
	 * Bun.spawn으로 sendmail 실행
	 * stdin: "pipe" → FileSink로 빠른 증분 쓰기
	 */
	private async sendViaSendmailSpawn(content: string, to: string[]): Promise<EmailResult> {
		const sendmailPath = this.config.sendmailPath ?? "sendmail";
		const sendmailArgs = this.config.sendmailArgs ?? ["-t", "-i"];

		try {
			const proc = Bun.spawn([sendmailPath, ...sendmailArgs, ...to], {
				stdin: "pipe",
				stdout: "pipe",
				stderr: "pipe",
			});

			// FileSink로 이메일 본문 쓰기
			proc.stdin.write(content);
			proc.stdin.flush();
			proc.stdin.end();

			const exitCode = await proc.exited;

			if (exitCode !== 0) {
				const stderrBytes = await new Response(proc.stderr).bytes();
				const stderr = new TextDecoder().decode(stderrBytes);
				return {
					success: false,
					error: `sendmail exited with code ${exitCode}: ${stderr.trim()}`,
				};
			}

			return {
				success: true,
				messageId: `sendmail-${Date.now()}`,
			};
		} catch (err: any) {
			return { success: false, error: `sendmail failed: ${err.message}` };
		}
	}

	/**
	 * Bun.$ 셸로 sendmail 실행
	 * 템플릿 리터럴로 안전한 명령어 구성 (자동 이스케이프)
	 */
	private async sendViaSendmailShell(content: string, to: string[]): Promise<EmailResult> {
		const sendmailPath = this.config.sendmailPath ?? "sendmail";
		const sendmailArgs = this.config.sendmailArgs ?? ["-t", "-i"];

		try {
			const { $ } = await import("bun");

			// Bun.file()을 stdin으로 사용하여 이메일 본문 전달
			const tmpPath = `${Bun.env.TMPDIR ?? "/tmp"}/bunigniter-mail-${Date.now()}.eml`;
			await Bun.write(tmpPath, content);

			const result =
				await $`${sendmailPath} ${sendmailArgs.join(" ")} ${to.join(" ")} < ${Bun.file(tmpPath)}`
					.nothrow()
					.quiet();

			// 임시 파일 정리
			try {
				await Bun.file(tmpPath).unlink();
			} catch (_cleanupErr) {
				/* 임시 파일 정리 실패는 무시 */
			}

			if (result.exitCode !== 0) {
				const stderr = result.stderr.toString();
				return {
					success: false,
					error: `sendmail (shell) exited with code ${result.exitCode}: ${stderr.trim()}`,
				};
			}

			return {
				success: true,
				messageId: `sendmail-shell-${Date.now()}`,
			};
		} catch (err: any) {
			return { success: false, error: `sendmail shell failed: ${err.message}` };
		}
	}

	// ─── Log 드라이버 (개발 환경) ───────────────────────

	private sendViaLog(
		message: EmailMessage,
		from: { email: string; name?: string },
		to: string[],
	): EmailResult {
		const logDir = this.config.logDir ?? "./storage/logs";
		const logFile = `${logDir}/emails.log`;

		const logEntry = [
			`[${new Date().toISOString()}]`,
			`From: ${from.email}`,
			`To: ${to.join(", ")}`,
			`Subject: ${message.subject}`,
			message.cc ? `CC: ${Array.isArray(message.cc) ? message.cc.join(", ") : message.cc}` : "",
			`Body: ${(message.html ?? message.text ?? "").substring(0, 500)}`,
			"---",
		]
			.filter(Boolean)
			.join("\n");

		try {
			Bun.write(logFile, `${logEntry}\n`, { createPath: true });
		} catch {
			console.log("[Email Log]", logEntry);
		}

		return { success: true, messageId: `log-${Date.now()}` };
	}

	// ─── 이메일 본문 빌더 ──────────────────────────────

	private buildEmailContent(
		message: EmailMessage,
		from: { email: string; name?: string },
		to: string[],
	): string {
		const boundary = `----=_Part_${crypto.randomUUID()}`;
		const headers: string[] = [
			`From: ${from.name ? `${from.name} ` : ""}<${from.email}>`,
			`To: ${to.join(", ")}`,
			`Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(message.subject)))}?=`,
			"MIME-Version: 1.0",
			`Date: ${new Date().toUTCString()}`,
			`Message-ID: <${crypto.randomUUID()}@bunigniter>`,
		];

		if (message.cc) {
			headers.push(`Cc: ${Array.isArray(message.cc) ? message.cc.join(", ") : message.cc}`);
		}

		if (message.replyTo) {
			headers.push(`Reply-To: ${message.replyTo}`);
		}

		if (message.headers) {
			for (const [key, value] of Object.entries(message.headers)) {
				headers.push(`${key}: ${value}`);
			}
		}

		let body: string;
		if (message.html && message.text) {
			headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
			body = [
				`--${boundary}`,
				"Content-Type: text/plain; charset=UTF-8",
				"Content-Transfer-Encoding: 8bit",
				"",
				message.text,
				`--${boundary}`,
				"Content-Type: text/html; charset=UTF-8",
				"Content-Transfer-Encoding: 8bit",
				"",
				message.html,
				`--${boundary}--`,
			].join("\r\n");
		} else if (message.html) {
			headers.push("Content-Type: text/html; charset=UTF-8");
			headers.push("Content-Transfer-Encoding: 8bit");
			body = message.html;
		} else {
			headers.push("Content-Type: text/plain; charset=UTF-8");
			headers.push("Content-Transfer-Encoding: 8bit");
			body = message.text ?? "";
		}

		return [...headers, "", body].join("\r\n");
	}
}

/** 싱글톤 인스턴스 */
export const email = new Email();
