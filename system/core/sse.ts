// ============================================================
// BunIgniter - SSE (Server-Sent Events) 매니저
// Bun.serve 기반 실시간 이벤트 브로드캐스트
// ============================================================

// ─── SSE 클라이언트 인터페이스 ──────────────────────────

export interface SSEClient {
	id: string;
	controller: ReadableStreamDefaultController;
	encoder: TextEncoder;
	connectedAt: number;
	lastEventAt: number;
	metadata: Record<string, string>;
}

// ─── SSE 이벤트 인터페이스 ──────────────────────────────

export interface SSEEvent {
	event?: string;
	data: string;
	id?: string;
	retry?: number;
}

// ─── SSE 설정 ──────────────────────────────────────────

export interface SSEConfig {
	/** 하트비트 간격 (ms), 기본 30000 */
	heartbeatInterval: number;
	/** 최대 클라이언트 수, 기본 1000 */
	maxClients: number;
	/** CORS 오리진, 기본 "*" */
	allowedOrigin: string;
	/** 연결 타임아웃 (ms), 기본 0 (무제한) */
	connectionTimeout: number;
	/** 이벤트 히스토리 크기 (마지막 N개 이벤트 저장) */
	historySize: number;
}

// ─── SSE 매니저 ────────────────────────────────────────

/**
 * Server-Sent Events 매니저
 * Bun.serve의 ReadableStream으로 실시간 이벤트 브로드캐스트
 */
export class SSEManager {
	private clients: Map<string, SSEClient> = new Map();
	private channels: Map<string, Set<string>> = new Map();
	private heartbeatTimer: Timer | null = null;
	private eventHistory: Array<{
		event: string;
		data: string;
		id: string;
		timestamp: number;
	}> = [];
	private eventIdCounter = 0;
	private config: SSEConfig;

	constructor(config?: Partial<SSEConfig>) {
		this.config = {
			heartbeatInterval: config?.heartbeatInterval ?? 30000,
			maxClients: config?.maxClients ?? 1000,
			allowedOrigin: config?.allowedOrigin ?? "*",
			connectionTimeout: config?.connectionTimeout ?? 0,
			historySize: config?.historySize ?? 100,
		};
	}

	// ─── 클라이언트 연결 ──────────────────────────────

	/**
	 * SSE 연결을 위한 Response 생성
	 * Bun.serve 라우트 핸들러에서 사용
	 *
	 * @example
	 * ```typescript
	 * // Elysia
	 * app.get("/events", (ctx) => sse.handleConnection(ctx.request, { userId: "1" }));
	 * ```
	 */
	handleConnection(
		request?: Request,
		metadata?: Record<string, string>,
	): Response {
		// 최대 클라이언트 체크
		if (this.clients.size >= this.config.maxClients) {
			return new Response("Too many connections", { status: 503 });
		}

		const clientId = `sse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			start: (controller) => {
				const client: SSEClient = {
					id: clientId,
					controller,
					encoder,
					connectedAt: Date.now(),
					lastEventAt: Date.now(),
					metadata: metadata ?? {},
				};

				this.clients.set(clientId, client);

				// 기본 채널 구독
				this.subscribe(clientId, "default");

				// 연결 성공 이벤트
				this.sendToClient(client, {
					event: "connected",
					data: JSON.stringify({ clientId, timestamp: Date.now() }),
					id: String(++this.eventIdCounter),
				});

				// 하트비트 시작 (첫 연결 시)
				this.startHeartbeat();

				// 요청 종료 감지
				if (request?.signal) {
					request.signal.addEventListener("abort", () => {
						this.disconnect(clientId);
					});
				}

				// 연결 타임아웃
				if (this.config.connectionTimeout > 0) {
					setTimeout(() => {
						if (this.clients.has(clientId)) {
							this.disconnect(clientId);
						}
					}, this.config.connectionTimeout);
				}
			},
			cancel: () => {
				this.disconnect(clientId);
			},
		});

		const headers: Record<string, string> = {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no", // nginx 버퍼링 방지
			"Access-Control-Allow-Origin": this.config.allowedOrigin,
		};

		return new Response(stream, { headers });
	}

	// ─── 클라이언트 연결 해제 ────────────────────────

	disconnect(clientId: string): void {
		const client = this.clients.get(clientId);
		if (!client) return;

		try {
			client.controller.close();
		} catch {
			// 이미 닫힌 스트림
		}

		// 모든 채널에서 구독 해제
		for (const [channel, subscribers] of this.channels) {
			subscribers.delete(clientId);
			if (subscribers.size === 0) {
				this.channels.delete(channel);
			}
		}

		this.clients.delete(clientId);

		// 클라이언트가 없으면 하트비트 정지
		if (this.clients.size === 0) {
			this.stopHeartbeat();
		}
	}

	// ─── 이벤트 전송 ──────────────────────────────────

	/**
	 * 모든 연결된 클라이언트에 이벤트 브로드캐스트
	 */
	broadcast(event: SSEEvent): number {
		const id = event.id ?? String(++this.eventIdCounter);
		const historyEntry = {
			event: event.event ?? "message",
			data: event.data,
			id,
			timestamp: Date.now(),
		};

		// 히스토리 저장
		this.eventHistory.push(historyEntry);
		if (this.eventHistory.length > this.config.historySize) {
			this.eventHistory.shift();
		}

		let sent = 0;
		for (const [, client] of this.clients) {
			if (this.sendToClient(client, { ...event, id })) {
				sent++;
			}
		}
		return sent;
	}

	/**
	 * 특정 채널에 이벤트 전송
	 */
	publish(channel: string, event: SSEEvent): number {
		const subscribers = this.channels.get(channel);
		if (!subscribers) return 0;

		const id = event.id ?? String(++this.eventIdCounter);
		let sent = 0;

		for (const clientId of subscribers) {
			const client = this.clients.get(clientId);
			if (client && this.sendToClient(client, { ...event, id })) {
				sent++;
			}
		}
		return sent;
	}

	/**
	 * 특정 클라이언트에 이벤트 전송
	 */
	send(clientId: string, event: SSEEvent): boolean {
		const client = this.clients.get(clientId);
		if (!client) return false;
		return this.sendToClient(client, {
			...event,
			id: event.id ?? String(++this.eventIdCounter),
		});
	}

	/**
	 * JSON 데이터 브로드캐스트
	 */
	broadcastJSON(event: string, data: unknown): number {
		return this.broadcast({
			event,
			data: JSON.stringify(data),
		});
	}

	/**
	 * 채널에 JSON 데이터 전송
	 */
	publishJSON(channel: string, event: string, data: unknown): number {
		return this.publish(channel, {
			event,
			data: JSON.stringify(data),
		});
	}

	// ─── 채널 구독 ────────────────────────────────────

	/**
	 * 클라이언트를 채널에 구독
	 */
	subscribe(clientId: string, channel: string): void {
		if (!this.channels.has(channel)) {
			this.channels.set(channel, new Set());
		}
		this.channels.get(channel)!.add(clientId);
	}

	/**
	 * 클라이언트를 채널에서 구독 해제
	 */
	unsubscribe(clientId: string, channel: string): void {
		const subscribers = this.channels.get(channel);
		if (subscribers) {
			subscribers.delete(clientId);
			if (subscribers.size === 0) {
				this.channels.delete(channel);
			}
		}
	}

	/**
	 * 클라이언트의 구독 채널 목록
	 */
	getClientChannels(clientId: string): string[] {
		const channels: string[] = [];
		for (const [channel, subscribers] of this.channels) {
			if (subscribers.has(clientId)) {
				channels.push(channel);
			}
		}
		return channels;
	}

	// ─── 히스토리 ─────────────────────────────────────

	/**
	 * 이벤트 히스토리 조회 (특정 ID 이후)
	 */
	getHistory(
		afterId?: string,
	): Array<{ event: string; data: string; id: string; timestamp: number }> {
		if (!afterId) return [...this.eventHistory];
		const idx = this.eventHistory.findIndex((e) => e.id === afterId);
		if (idx === -1) return [...this.eventHistory];
		return this.eventHistory.slice(idx + 1);
	}

	// ─── 상태 조회 ────────────────────────────────────

	/**
	 * SSE 매니저 상태
	 */
	status(): {
		clients: number;
		channels: number;
		channelDetails: Record<string, number>;
		totalEventsSent: number;
		uptime: number;
	} {
		const channelDetails: Record<string, number> = {};
		for (const [channel, subscribers] of this.channels) {
			channelDetails[channel] = subscribers.size;
		}

		return {
			clients: this.clients.size,
			channels: this.channels.size,
			channelDetails,
			totalEventsSent: this.eventIdCounter,
			uptime: Date.now(),
		};
	}

	/**
	 * 연결된 클라이언트 목록
	 */
	getClients(): Array<{
		id: string;
		connectedAt: number;
		lastEventAt: number;
		channels: string[];
		metadata: Record<string, string>;
	}> {
		return [...this.clients.values()].map((c) => ({
			id: c.id,
			connectedAt: c.connectedAt,
			lastEventAt: c.lastEventAt,
			channels: this.getClientChannels(c.id),
			metadata: c.metadata,
		}));
	}

	/**
	 * 채널 목록
	 */
	getChannels(): Array<{ name: string; subscribers: number }> {
		return [...this.channels.entries()].map(([name, subscribers]) => ({
			name,
			subscribers: subscribers.size,
		}));
	}

	// ─── 전체 종료 ────────────────────────────────────

	/**
	 * 모든 연결 종료
	 */
	close(): void {
		this.stopHeartbeat();
		for (const [clientId] of this.clients) {
			this.disconnect(clientId);
		}
		this.eventHistory = [];
	}

	// ─── 내부 메서드 ──────────────────────────────────

	private sendToClient(client: SSEClient, event: SSEEvent): boolean {
		try {
			let message = "";
			if (event.event) {
				message += `event: ${event.event}\n`;
			}
			if (event.id) {
				message += `id: ${event.id}\n`;
			}
			if (event.retry) {
				message += `retry: ${event.retry}\n`;
			}
			// data에 개행이 있으면 여러 data: 라인으로 분할
			const lines = event.data.split("\n");
			for (const line of lines) {
				message += `data: ${line}\n`;
			}
			message += "\n";

			client.controller.enqueue(client.encoder.encode(message));
			client.lastEventAt = Date.now();
			return true;
		} catch {
			// 클라이언트 연결이 끊어진 경우
			this.disconnect(client.id);
			return false;
		}
	}

	private startHeartbeat(): void {
		if (this.heartbeatTimer) return;
		this.heartbeatTimer = setInterval(() => {
			if (this.clients.size === 0) {
				this.stopHeartbeat();
				return;
			}
			for (const [clientId, client] of this.clients) {
				try {
					client.controller.enqueue(client.encoder.encode(": heartbeat\n\n"));
					client.lastEventAt = Date.now();
				} catch {
					this.disconnect(clientId);
				}
			}
		}, this.config.heartbeatInterval);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}
}

// ─── 싱글톤 인스턴스 ──────────────────────────────────

export const sse = new SSEManager();

// ─── Elysia 통합 헬퍼 ─────────────────────────────────

/**
 * SSE 라우트 생성 (Elysia 또는 Bun.serve용)
 *
 * @example
 * ```typescript
 * import { createSSERoutes } from "system/core/sse.ts";
 * const routes = createSSERoutes();
 * // routes를 앱에 등록
 * ```
 */
export function createSSERoutes(
	config?: Partial<SSEConfig> & { basePath?: string },
): Array<{
	method: string;
	path: string;
	handler: (ctx: any) => any;
}> {
	const manager = new SSEManager(config);
	const basePath = config?.basePath ?? "/_sse";

	return [
		// SSE 연결 엔드포인트
		{
			method: "GET",
			path: basePath,
			handler(ctx: any) {
				return manager.handleConnection(ctx.request);
			},
		},
		// 채널 구독
		{
			method: "POST",
			path: `${basePath}/subscribe`,
			async handler(ctx: any) {
				const body = await ctx.request?.json();
				const { clientId, channel } = body ?? {};
				if (!clientId || !channel) {
					return Response.json(
						{ error: "Missing clientId or channel" },
						{ status: 400 },
					);
				}
				manager.subscribe(clientId, channel);
				return Response.json({ ok: true });
			},
		},
		// 채널 구독 해제
		{
			method: "POST",
			path: `${basePath}/unsubscribe`,
			async handler(ctx: any) {
				const body = await ctx.request?.json();
				const { clientId, channel } = body ?? {};
				if (!clientId || !channel) {
					return Response.json(
						{ error: "Missing clientId or channel" },
						{ status: 400 },
					);
				}
				manager.unsubscribe(clientId, channel);
				return Response.json({ ok: true });
			},
		},
		// 이벤트 발행 (내부용)
		{
			method: "POST",
			path: `${basePath}/publish`,
			async handler(ctx: any) {
				const body = await ctx.request?.json();
				const { channel, event, data } = body ?? {};
				if (!event || !data) {
					return Response.json(
						{ error: "Missing event or data" },
						{ status: 400 },
					);
				}
				const sent = channel
					? manager.publishJSON(channel, event, data)
					: manager.broadcastJSON(event, data);
				return Response.json({ sent });
			},
		},
		// 상태 조회 API
		{
			method: "GET",
			path: `${basePath}/api/status`,
			handler(_ctx: any) {
				return Response.json(manager.status());
			},
		},
		// 클라이언트 목록 API
		{
			method: "GET",
			path: `${basePath}/api/clients`,
			handler(_ctx: any) {
				return Response.json(manager.getClients());
			},
		},
		// 채널 목록 API
		{
			method: "GET",
			path: `${basePath}/api/channels`,
			handler(_ctx: any) {
				return Response.json(manager.getChannels());
			},
		},
		// 이벤트 히스토리 API
		{
			method: "GET",
			path: `${basePath}/api/history`,
			handler(_ctx: any) {
				let url: URL;
				try {
					url = new URL(
						_ctx.request?.url ?? `http://localhost${basePath}/api/history`,
					);
				} catch {
					url = new URL(`http://localhost${basePath}/api/history`);
				}
				const afterId = url.searchParams.get("after") ?? undefined;
				return Response.json(manager.getHistory(afterId));
			},
		},
	];
}
