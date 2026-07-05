// ============================================================
// BunIgniter - WebSocket Server
// Bun 내장 WebSocket 지원
// Elysia 2.0 WebSocket 래핑
// ============================================================

export type WebSocketHandler = (ws: any, message: any) => void;
export type WebSocketOpenHandler = (ws: any) => void;
export type WebSocketCloseHandler = (ws: any, code: number, reason: string) => void;

export interface WebSocketConfig {
	/** 경로 (기본값: "/ws") */
	path: string;
	/** 최대 메시지 크기 (기본값: 1MB) */
	maxPayloadLength?: number;
	/** 유휴 타임아웃 (초, 기본값: 120) */
	idleTimeout?: number;
	/** 연결 시 핸들러 */
	open?: WebSocketOpenHandler;
	/** 메시지 수신 핸들러 */
	message: WebSocketHandler;
	/** 연결 종료 핸들러 */
	close?: WebSocketCloseHandler;
}

/**
 * WebSocket 채널 관리자
 * Pub/Sub 패턴으로 채널 기반 메시지 브로드캐스트
 *
 * 사용법:
 *   const ws = new WebSocketManager();
 *   ws.subscribe("chat", clientSocket);
 *   ws.publish("chat", { text: "Hello!" });
 */
export class WebSocketManager {
	private channels: Map<string, Set<any>> = new Map();
	private clients: Set<any> = new Set();

	/** 클라이언트 등록 */
	addClient(ws: any): void {
		this.clients.add(ws);
	}

	/** 클라이언트 제거 */
	removeClient(ws: any): void {
		this.clients.delete(ws);
		// 모든 채널에서 제거
		for (const [, members] of this.channels.entries()) {
			members.delete(ws);
		}
	}

	/** 채널 구독 */
	subscribe(channel: string, ws: any): void {
		if (!this.channels.has(channel)) {
			this.channels.set(channel, new Set());
		}
		this.channels.get(channel)!.add(ws);
	}

	/** 채널 구독 해제 */
	unsubscribe(channel: string, ws: any): void {
		const members = this.channels.get(channel);
		if (members) {
			members.delete(ws);
			if (members.size === 0) {
				this.channels.delete(channel);
			}
		}
	}

	/** 채널에 메시지 브로드캐스트 */
	publish(channel: string, data: any): void {
		const members = this.channels.get(channel);
		if (!members) return;

		const message = typeof data === "string" ? data : JSON.stringify(data);
		for (const ws of members) {
			try {
				ws.send(message);
			} catch {
				// 전송 실패 시 제거
				members.delete(ws);
			}
		}
	}

	/** 전체 클라이언트에 브로드캐스트 */
	broadcast(data: any, exclude?: any): void {
		const message = typeof data === "string" ? data : JSON.stringify(data);
		for (const ws of this.clients) {
			if (ws === exclude) continue;
			try {
				ws.send(message);
			} catch {
				this.clients.delete(ws);
			}
		}
	}

	/** 채널 구독자 수 */
	channelCount(channel: string): number {
		return this.channels.get(channel)?.size ?? 0;
	}

	/** 전체 연결 수 */
	clientCount(): number {
		return this.clients.size;
	}

	/** 채널 목록 */
	getChannels(): string[] {
		return Array.from(this.channels.keys());
	}
}

/**
 * WebSocket 설정을 Elysia 플러그인 형태로 생성
 *
 * 사용법 (app/config/routes.ts 또는 bootstrap.ts):
 *
 *   import { createWebSocketConfig, WebSocketManager } from "system/core/websocket.ts";
 *
 *   const wsManager = new WebSocketManager();
 *
 *   const wsConfig = createWebSocketConfig({
 *     path: "/ws",
 *     open(ws) {
 *       wsManager.addClient(ws);
 *       console.log("WebSocket 연결:", wsManager.clientCount());
 *     },
 *     message(ws, message) {
 *       const data = JSON.parse(message);
 *       if (data.channel) {
 *         wsManager.subscribe(data.channel, ws);
 *       }
 *       wsManager.publish(data.channel, data);
 *     },
 *     close(ws) {
 *       wsManager.removeClient(ws);
 *     },
 *   });
 *
 *   // Elysia 앱에 등록
 *   app.ws(wsConfig.path, wsConfig);
 */
export function createWebSocketConfig(config: WebSocketConfig): any {
	return {
		message(ws: any, message: any) {
			let parsed: any = message;
			if (typeof message === "string") {
				try {
					parsed = JSON.parse(message);
				} catch {
					// JSON이 아니면 그대로 전달
				}
			}
			config.message(ws, parsed);
		},
		open(ws: any) {
			if (config.open) config.open(ws);
		},
		close(ws: any, code: number, message: string) {
			if (config.close) config.close(ws, code, message);
		},
		maxPayloadLength: config.maxPayloadLength ?? 1024 * 1024,
		idleTimeout: config.idleTimeout ?? 120,
	};
}

/** 전역 WebSocket 매니저 */
export const wsManager = new WebSocketManager();
