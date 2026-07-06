// ============================================================
// BunIgniter - Redis Pub/Sub Broadcast Queue
// Bun 내장 RedisClient.subscribe/publish 활용
// 다중 프로세스/서버 간 큐 브로드캐스트
// ============================================================

import { RedisClient } from "bun";
import { Queue } from "./queue.ts";

// ─── 인터페이스 ──────────────────────────────────────

export interface BroadcastQueueConfig {
	/** Redis URL */
	redisUrl: string;
	/** 채널 접두사 */
	channelPrefix: string;
	/** 구독할 큐 목록 */
	queues: string[];
	/** 재연결 시도 */
	maxRetries: number;
}

export interface BroadcastMessage {
	/** 메시지 타입: "job" | "command" | "event" */
	type: "job" | "command" | "event";
	/** 페이로드 */
	payload: any;
	/** 발신자 식별자 */
	senderId: string;
	/** 타임스탬프 */
	timestamp: number;
}

type BroadcastHandler = (message: BroadcastMessage) => void;

// ─── BroadcastQueue 클래스 ──────────────────────────────

/**
 * Redis Pub/Sub 기반 브로드캐스트 큐
 * Bun 내장 RedisClient.subscribe/publish 사용
 *
 * 다중 프로세스/서버 환경에서:
 * - 잡 디스패치를 모든 워커에 브로드캐스트
 * - 명령(워커 시작/정지)을 모든 인스턴스에 전파
 * - 이벤트(잡 완료/실패)를 모든 대시보드에 전달
 *
 * 사용법:
 *   import { BroadcastQueue } from "system/core/broadcast_queue.ts";
 *
 *   const bq = new BroadcastQueue({
 *     redisUrl: "redis://localhost:6379",
 *     queues: ["default", "emails"],
 *   });
 *
 *   await bq.connect();
 *
 *   // 잡 브로드캐스트
 *   await bq.broadcastJob("default", { type: "SendEmailJob", data: {...} });
 *
 *   // 명령 브로드캐스트
 *   await bq.broadcastCommand("worker:stop", { queue: "default" });
 *
 *   // 이벤트 수신
 *   bq.onEvent((msg) => {
 *     console.log("Event received:", msg.type, msg.payload);
 *   });
 */
export class BroadcastQueue {
	private config: BroadcastQueueConfig;
	private publisher: RedisClient | null = null;
	private subscriber: RedisClient | null = null;
	private senderId: string;
	private handlers: Map<string, BroadcastHandler[]> = new Map();
	private connected: boolean = false;

	constructor(config?: Partial<BroadcastQueueConfig>) {
		this.config = {
			redisUrl: config?.redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379",
			channelPrefix: config?.channelPrefix ?? "bunigniter:broadcast:",
			queues: config?.queues ?? ["default"],
			maxRetries: config?.maxRetries ?? 10,
		};
		this.senderId = `${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
	}

	// ─── 연결 관리 ─────────────────────────────────────

	/**
	 * Redis 연결 및 구독 시작
	 * Bun 내장 RedisClient.subscribe() 사용
	 */
	async connect(): Promise<void> {
		if (this.connected) return;

		// Publisher용 연결
		this.publisher = new RedisClient(this.config.redisUrl, {
			autoReconnect: true,
			maxRetries: this.config.maxRetries,
			enableOfflineQueue: true,
		});

		// Subscriber용 연결 (subscribe는 전용 연결 필요)
		this.subscriber = new RedisClient(this.config.redisUrl, {
			autoReconnect: true,
			maxRetries: this.config.maxRetries,
			enableOfflineQueue: true,
		});

		// 큐 채널 구독
		for (const queueName of this.config.queues) {
			const channel = `${this.config.channelPrefix}${queueName}`;
			await this.subscriber.subscribe(channel, (message, ch) => {
				this.handleMessage(message, ch);
			});
		}

		// 제어 채널 구독
		const controlChannel = `${this.config.channelPrefix}__control__`;
		await this.subscriber.subscribe(controlChannel, (message, ch) => {
			this.handleMessage(message, ch);
		});

		this.connected = true;
		console.log(`[BunIgniter] BroadcastQueue connected: ${this.config.queues.join(", ")}`);
	}

	/**
	 * 연결 종료
	 */
	disconnect(): void {
		if (this.publisher) {
			this.publisher.close();
			this.publisher = null;
		}
		if (this.subscriber) {
			this.subscriber.close();
			this.subscriber = null;
		}
		this.connected = false;
		console.log("[BunIgniter] BroadcastQueue disconnected");
	}

	// ─── 메시지 발행 ─────────────────────────────────────

	/**
	 * 잡 브로드캐스트
	 * 모든 구독자에게 새 잡을 알림
	 */
	async broadcastJob(
		queueName: string,
		jobData: {
			type: string;
			data: any;
		},
	): Promise<void> {
		const message: BroadcastMessage = {
			type: "job",
			payload: { queue: queueName, ...jobData },
			senderId: this.senderId,
			timestamp: Date.now(),
		};

		await this.publish(queueName, message);

		// 로컬 큐에도 푸시 (발신자도 처리 가능)
		await Queue.push(jobData.type, jobData.data, queueName);
	}

	/**
	 * 명령 브로드캐스트
	 * 모든 워커에 제어 명령 전파
	 */
	async broadcastCommand(command: string, params: any = {}): Promise<void> {
		const message: BroadcastMessage = {
			type: "command",
			payload: { command, ...params },
			senderId: this.senderId,
			timestamp: Date.now(),
		};

		await this.publish("__control__", message);
	}

	/**
	 * 이벤트 브로드캐스트
	 * 잡 완료/실패 등의 이벤트를 모든 대시보드에 전달
	 */
	async broadcastEvent(eventName: string, data: any = {}): Promise<void> {
		const message: BroadcastMessage = {
			type: "event",
			payload: { event: eventName, ...data },
			senderId: this.senderId,
			timestamp: Date.now(),
		};

		// 이벤트는 모든 큐 채널에 발행
		for (const queueName of this.config.queues) {
			await this.publish(queueName, message);
		}
	}

	// ─── 이벤트 핸들러 ──────────────────────────────────

	/**
	 * 이벤트 핸들러 등록
	 */
	onEvent(handler: BroadcastHandler): void {
		const handlers = this.handlers.get("*") ?? [];
		handlers.push(handler);
		this.handlers.set("*", handlers);
	}

	/**
	 * 특정 메시지 타입 핸들러 등록
	 */
	on(type: string, handler: BroadcastHandler): void {
		const handlers = this.handlers.get(type) ?? [];
		handlers.push(handler);
		this.handlers.set(type, handlers);
	}

	// ─── 내부 메서드 ────────────────────────────────────

	private async publish(channelName: string, message: BroadcastMessage): Promise<void> {
		if (!this.publisher || !this.connected) {
			console.warn("[BunIgniter] BroadcastQueue not connected, skipping publish");
			return;
		}

		const channel = `${this.config.channelPrefix}${channelName}`;
		await this.publisher.publish(channel, JSON.stringify(message));
	}

	private handleMessage(rawMessage: string, _channel: string): void {
		let message: BroadcastMessage;
		try {
			message = JSON.parse(rawMessage) as BroadcastMessage;
		} catch {
			console.error("[BunIgniter] BroadcastQueue: invalid message", rawMessage);
			return;
		}

		// 자기 자신의 메시지는 무시
		if (message.senderId === this.senderId) return;

		// 타입별 핸들러 실행
		const typeHandlers = this.handlers.get(message.type) ?? [];
		for (const handler of typeHandlers) {
			try {
				handler(message);
			} catch (err) {
				console.error("[BunIgniter] BroadcastQueue handler error:", err);
			}
		}

		// 글로벌 핸들러 실행
		const globalHandlers = this.handlers.get("*") ?? [];
		for (const handler of globalHandlers) {
			try {
				handler(message);
			} catch (err) {
				console.error("[BunIgniter] BroadcastQueue handler error:", err);
			}
		}

		// 명령 처리
		if (message.type === "command") {
			this.handleCommand(message);
		}
	}

	private handleCommand(message: BroadcastMessage): void {
		const command = message.payload?.command;
		switch (command) {
			case "worker:stop":
				Queue.stop();
				console.log("[BunIgniter] Received worker:stop command");
				break;
			case "worker:start": {
				const queue = message.payload?.queue ?? "default";
				Queue.work(queue);
				console.log(`[BunIgniter] Received worker:start command for "${queue}"`);
				break;
			}
			case "flush:failed": {
				const queue = message.payload?.queue ?? "default";
				Queue.flushFailed(queue);
				console.log(`[BunIgniter] Received flush:failed command for "${queue}"`);
				break;
			}
			case "scheduler:stop":
				Scheduler_stopAll();
				break;
			default:
				console.log(`[BunIgniter] Unknown broadcast command: ${command}`);
		}
	}

	// ─── 상태 ────────────────────────────────────────────

	isConnected(): boolean {
		return this.connected;
	}

	getSenderId(): string {
		return this.senderId;
	}

	getQueues(): string[] {
		return [...this.config.queues];
	}
}

// Scheduler.stopAll() 래핑 (순환 참조 방지)
function Scheduler_stopAll(): void {
	try {
		// 동적 임포트 대신 직접 호출
		const { Scheduler } = require("./scheduler.ts") as typeof import("./scheduler.ts");
		Scheduler.stopAll();
	} catch {
		console.error("[BunIgniter] Failed to stop scheduler via broadcast");
	}
}

/** 싱글톤 */
export const broadcastQueue = new BroadcastQueue();
