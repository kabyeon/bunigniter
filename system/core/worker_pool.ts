// ============================================================
// BunIgniter - Queue Worker Pool
// Bun.Worker 기반 병렬 잡 처리
// 워커 풀 관리 + IPC 메시지 통신
// ============================================================

import type { JobPayload } from "./queue.ts";

// ─── 워커 메시지 프로토콜 ──────────────────────────────

/** 메인 → 워커 메시지 */
export type WorkerInMessage =
	| { type: "job"; payload: JobPayload }
	| { type: "ping" }
	| { type: "stop" }
	| { type: "register"; jobType: string };

/** 워커 → 메인 메시지 */
export type WorkerOutMessage =
	| { type: "ready"; workerId: number }
	| { type: "job_completed"; jobId: string; workerId: number; duration: number }
	| {
			type: "job_failed";
			jobId: string;
			workerId: number;
			error: string;
			retryable: boolean;
	  }
	| { type: "pong"; workerId: number }
	| { type: "error"; workerId: number; error: string };

// ─── 워커 슬롯 ─────────────────────────────────────────

interface WorkerSlot {
	/** Bun.Worker 인스턴스 */
	worker: Worker;
	/** 워커 ID */
	id: number;
	/** 현재 처리 중인 잡 */
	currentJob: JobPayload | null;
	/** 처리 시작 시각 */
	jobStartedAt: number | null;
	/** 활성 여부 */
	active: boolean;
	/** 처리 완료 수 */
	completedCount: number;
	/** 실패 수 */
	failedCount: number;
}

// ─── 워커 풀 설정 ──────────────────────────────────────

export interface WorkerPoolConfig {
	/** 워커 수 (기본: CPU 코어 수 - 1, 최소 1) */
	concurrency?: number;
	/** 핸들러 스크립트 경로 (워커에서 실행) */
	handlerScript?: string;
	/** 잡 타임아웃 (ms, 기본 60000) */
	jobTimeout?: number;
	/** 워커 재시작 최대 횟수 (기본 3) */
	maxWorkerRestarts?: number;
	/** smol 모드 (메모리 절약) */
	smol?: boolean;
	/** 워커 준비 대기 타임아웃 (ms, 기본 10000) */
	readyTimeout?: number;
}

// ─── 워커 풀 이벤트 ────────────────────────────────────

export interface WorkerPoolEvents {
	onJobCompleted?: (jobId: string, workerId: number, duration: number) => void;
	onJobFailed?: (jobId: string, workerId: number, error: string) => void;
	onWorkerReady?: (workerId: number) => void;
	onWorkerError?: (workerId: number, error: string) => void;
	onWorkerRestarted?: (workerId: number) => void;
	onAllWorkersReady?: () => void;
}

// ─── WorkerPool ─────────────────────────────────────────

/**
 * Bun.Worker 기반 큐 워커 풀
 *
 * 사용법:
 *   import { WorkerPool } from "system/core/worker_pool.ts";
 *
 *   const pool = new WorkerPool({
 *     concurrency: 4,
 *     handlerScript: "./app/jobs/handlers.ts",
 *     jobTimeout: 30000,
 *   });
 *
 *   pool.on("job_completed", (jobId, workerId, duration) => {
 *     console.log(`Job ${jobId} completed by worker ${workerId} in ${duration}ms`);
 *   });
 *
 *   await pool.start();
 *
 *   // 잡 디스패치
 *   await pool.dispatch(job);
 *
 *   // 정지
 *   await pool.stop();
 */
export class WorkerPool {
	private workers: Map<number, WorkerSlot> = new Map();
	private config: Required<WorkerPoolConfig>;
	private events: WorkerPoolEvents = {};
	private nextWorkerId: number = 0;
	private started: boolean = false;
	private readyCount: number = 0;
	private jobQueue: JobPayload[] = [];
	private restartCounts: Map<number, number> = new Map();

	constructor(config?: WorkerPoolConfig) {
		const cpuCount =
			typeof navigator !== "undefined" && navigator.hardwareConcurrency
				? navigator.hardwareConcurrency
				: 4;

		this.config = {
			concurrency: config?.concurrency ?? Math.max(1, cpuCount - 1),
			handlerScript: config?.handlerScript ?? "",
			jobTimeout: config?.jobTimeout ?? 60000,
			maxWorkerRestarts: config?.maxWorkerRestarts ?? 3,
			smol: config?.smol ?? false,
			readyTimeout: config?.readyTimeout ?? 10000,
		};
	}

	// ─── 이벤트 리스너 ──────────────────────────────────

	on(event: keyof WorkerPoolEvents, handler: Function): void {
		const key =
			`on${event.charAt(0).toUpperCase()}${event.slice(1)}` as keyof WorkerPoolEvents;
		(this.events as any)[key] = handler;
	}

	// ─── 워커 풀 시작 ──────────────────────────────────

	/**
	 * 워커 풀 시작
	 * 핸들러 스크립트가 설정된 경우 해당 스크립트를 워커에서 실행.
	 * 핸들러 스크립트가 없으면 인라인 핸들러 모드로 동작.
	 */
	async start(): Promise<void> {
		if (this.started) {
			console.warn("[BunIgniter] Worker pool already started");
			return;
		}

		console.log(
			`[BunIgniter] Starting worker pool with ${this.config.concurrency} workers`,
		);

		// 핸들러 스크립트가 있는 경우: 독립 워커 스크립트 모드
		if (this.config.handlerScript) {
			for (let i = 0; i < this.config.concurrency; i++) {
				this.spawnWorker(this.config.handlerScript);
			}
		} else {
			// 인라인 핸들러 모드: blob URL로 워커 생성
			this.spawnInlineWorkers();
		}

		this.started = true;

		// 워커 준비 대기
		await new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				console.warn(
					"[BunIgniter] Worker pool ready timeout, continuing anyway",
				);
				resolve();
			}, this.config.readyTimeout);

			const checkReady = () => {
				if (this.readyCount >= this.config.concurrency) {
					clearTimeout(timeout);
					resolve();
				}
			};

			// 이미 준비된 워커가 있으면 즉시 해결
			checkReady();

			// 주기적으로 체크
			const interval = setInterval(() => {
				if (this.readyCount >= this.config.concurrency) {
					clearTimeout(interval);
					clearTimeout(timeout);
					resolve();
				}
			}, 100);
		});

		console.log(
			`[BunIgniter] Worker pool ready: ${this.readyCount}/${this.config.concurrency} workers`,
		);
		this.events.onAllWorkersReady?.();
	}

	// ─── 워커 생성 ──────────────────────────────────────

	private spawnWorker(scriptPath: string): number {
		const id = this.nextWorkerId++;

		const worker = new Worker(scriptPath, {
			smol: this.config.smol,
		});

		const slot: WorkerSlot = {
			worker,
			id,
			currentJob: null,
			jobStartedAt: null,
			active: false,
			completedCount: 0,
			failedCount: 0,
		};

		this.setupWorkerHandlers(slot);
		this.workers.set(id, slot);
		return id;
	}

	private spawnInlineWorkers(): void {
		for (let i = 0; i < this.config.concurrency; i++) {
			const id = this.nextWorkerId++;

			// 인라인 워커: 핸들러를 메시지로 전달받아 실행
			const workerCode = `
				declare var self: Worker;
				const handlers = new Map();

				self.onmessage = async (event) => {
					const msg = event.data;

					if (msg.type === "job") {
						const job = msg.payload;
						const handler = handlers.get(job.type);
						if (!handler) {
							postMessage({ type: "job_failed", jobId: job.id, workerId: ${id}, error: "No handler for: " + job.type, retryable: false });
							return;
						}
						const start = Date.now();
						try {
							await handler(job.data);
							postMessage({ type: "job_completed", jobId: job.id, workerId: ${id}, duration: Date.now() - start });
						} catch (err) {
							postMessage({ type: "job_failed", jobId: job.id, workerId: ${id}, error: err?.message ?? String(err), retryable: true });
						}
					} else if (msg.type === "register") {
						// 인라인 모드에서는 함수를 직접 등록할 수 없으므로
						// 스크립트 경로를 import 하여 핸들러 로드
						try {
							const mod = await import(msg.jobType);
							if (mod.default && typeof mod.default === "function") {
								handlers.set(msg.jobType, mod.default);
							}
							if (mod.handlers) {
								for (const [k, v] of Object.entries(mod.handlers)) {
									handlers.set(k, v);
								}
							}
						} catch (err) {
							console.error("Failed to register handler:", err);
						}
					} else if (msg.type === "ping") {
						postMessage({ type: "pong", workerId: ${id} });
					} else if (msg.type === "stop") {
						process.exit(0);
					}
				};

				postMessage({ type: "ready", workerId: ${id} });
			`;

			const blob = new Blob([workerCode], {
				type: "application/typescript",
			});
			const url = URL.createObjectURL(blob);
			const worker = new Worker(url);

			const slot: WorkerSlot = {
				worker,
				id,
				currentJob: null,
				jobStartedAt: null,
				active: false,
				completedCount: 0,
				failedCount: 0,
			};

			this.setupWorkerHandlers(slot);
			this.workers.set(id, slot);
		}
	}

	private setupWorkerHandlers(slot: WorkerSlot): void {
		slot.worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
			const msg = event.data;

			switch (msg.type) {
				case "ready":
					slot.active = true;
					this.readyCount++;
					this.events.onWorkerReady?.(msg.workerId);
					// 대기 중인 잡이 있으면 즉시 디스패치
					this.dispatchPending(slot);
					break;

				case "job_completed":
					slot.completedCount++;
					slot.currentJob = null;
					slot.jobStartedAt = null;
					this.events.onJobCompleted?.(msg.jobId, msg.workerId, msg.duration);
					// 다음 잡 처리
					this.dispatchPending(slot);
					break;

				case "job_failed":
					slot.failedCount++;
					slot.currentJob = null;
					slot.jobStartedAt = null;
					this.events.onJobFailed?.(msg.jobId, msg.workerId, msg.error);
					// 다음 잡 처리
					this.dispatchPending(slot);
					break;

				case "pong":
					// 헬스체크 응답
					break;

				case "error":
					this.events.onWorkerError?.(msg.workerId, msg.error);
					break;
			}
		};

		slot.worker.onerror = (err: ErrorEvent) => {
			console.error(`[BunIgniter] Worker ${slot.id} error:`, err.message);
			this.events.onWorkerError?.(slot.id, err.message);
			this.restartWorker(slot.id);
		};
	}

	// ─── 잡 디스패치 ────────────────────────────────────

	/**
	 * 잡을 유휴 워커에 디스패치
	 */
	dispatch(job: JobPayload): boolean {
		// 유휴 워커 찾기
		for (const [, slot] of this.workers) {
			if (slot.active && slot.currentJob === null) {
				this.assignJob(slot, job);
				return true;
			}
		}

		// 모든 워커가 바쁘면 큐에 대기
		this.jobQueue.push(job);
		return false;
	}

	/**
	 * 대기 중인 잡을 유휴 워커에 디스패치
	 */
	private dispatchPending(slot: WorkerSlot): void {
		if (this.jobQueue.length === 0) return;
		if (slot.currentJob !== null) return;

		const job = this.jobQueue.shift();
		if (job) {
			this.assignJob(slot, job);
		}
	}

	/**
	 * 워커에 잡 할당
	 */
	private assignJob(slot: WorkerSlot, job: JobPayload): void {
		slot.currentJob = job;
		slot.jobStartedAt = Date.now();

		const message: WorkerInMessage = { type: "job", payload: job };
		slot.worker.postMessage(message);

		// 타임아웃 감시
		setTimeout(() => {
			if (slot.currentJob?.id === job.id) {
				console.warn(
					`[BunIgniter] Job ${job.id} timed out in worker ${slot.id}`,
				);
				slot.currentJob = null;
				slot.jobStartedAt = null;
				this.events.onJobFailed?.(job.id, slot.id, "Job timed out");
				this.dispatchPending(slot);
			}
		}, this.config.jobTimeout);
	}

	// ─── 핸들러 등록 (인라인 모드) ─────────────────────

	/**
	 * 인라인 워커에 핸들러 스크립트 경로 등록
	 * 워커에서 import하여 핸들러를 로드
	 */
	registerHandler(scriptPath: string): void {
		for (const [, slot] of this.workers) {
			const msg: WorkerInMessage = { type: "register", jobType: scriptPath };
			slot.worker.postMessage(msg);
		}
	}

	// ─── 워커 재시작 ────────────────────────────────────

	private restartWorker(id: number): void {
		const slot = this.workers.get(id);
		if (!slot) return;

		const restartCount = (this.restartCounts.get(id) ?? 0) + 1;
		if (restartCount > this.config.maxWorkerRestarts) {
			console.error(
				`[BunIgniter] Worker ${id} exceeded max restarts (${this.config.maxWorkerRestarts}), removing`,
			);
			slot.worker.terminate();
			this.workers.delete(id);
			return;
		}

		this.restartCounts.set(id, restartCount);
		console.log(
			`[BunIgniter] Restarting worker ${id} (attempt ${restartCount})`,
		);

		slot.worker.terminate();

		// 동일 설정으로 새 워커 생성
		if (this.config.handlerScript) {
			const newId = this.spawnWorker(this.config.handlerScript);
			console.log(`[BunIgniter] Worker ${id} replaced with ${newId}`);
		}

		this.workers.delete(id);
		this.events.onWorkerRestarted?.(id);
	}

	// ─── 워커 풀 정지 ──────────────────────────────────

	/**
	 * 워커 풀 정지
	 */
	async stop(): Promise<void> {
		if (!this.started) return;

		console.log("[BunIgniter] Stopping worker pool...");

		// 모든 워커에 정지 메시지 전송
		for (const [, slot] of this.workers) {
			try {
				const msg: WorkerInMessage = { type: "stop" };
				slot.worker.postMessage(msg);
			} catch {
				// 이미 종료된 워커
			}
		}

		// 종료 대기 (최대 5초)
		await new Promise<void>((resolve) => {
			const timeout = setTimeout(() => {
				// 강제 종료
				for (const [, slot] of this.workers) {
					try {
						slot.worker.terminate();
					} catch (e) {
						console.error(`[BunIgniter] Worker terminate error:`, e);
					}
				}
				resolve();
			}, 5000);

			const interval = setInterval(() => {
				let allDone = true;
				for (const [, slot] of this.workers) {
					if (slot.currentJob !== null) {
						allDone = false;
						break;
					}
				}
				if (allDone) {
					clearTimeout(interval);
					clearTimeout(timeout);
					// 모든 워커 종료
					for (const [, slot] of this.workers) {
						try {
							slot.worker.terminate();
						} catch (e) {
							console.error(`[BunIgniter] Worker terminate error:`, e);
						}
					}
					resolve();
				}
			}, 200);
		});

		this.workers.clear();
		this.started = false;
		this.readyCount = 0;
		console.log("[BunIgniter] Worker pool stopped");
	}

	// ─── 상태 조회 ──────────────────────────────────────

	/**
	 * 워커 풀 상태
	 */
	status(): {
		started: boolean;
		totalWorkers: number;
		activeWorkers: number;
		busyWorkers: number;
		idleWorkers: number;
		pendingJobs: number;
		totalCompleted: number;
		totalFailed: number;
		workers: Array<{
			id: number;
			active: boolean;
			currentJob: string | null;
			completedCount: number;
			failedCount: number;
		}>;
	} {
		const workers = Array.from(this.workers.values());
		const activeWorkers = workers.filter((w) => w.active);
		const busyWorkers = activeWorkers.filter((w) => w.currentJob !== null);

		return {
			started: this.started,
			totalWorkers: workers.length,
			activeWorkers: activeWorkers.length,
			busyWorkers: busyWorkers.length,
			idleWorkers: activeWorkers.length - busyWorkers.length,
			pendingJobs: this.jobQueue.length,
			totalCompleted: workers.reduce((s, w) => s + w.completedCount, 0),
			totalFailed: workers.reduce((s, w) => s + w.failedCount, 0),
			workers: workers.map((w) => ({
				id: w.id,
				active: w.active,
				currentJob: w.currentJob?.id ?? null,
				completedCount: w.completedCount,
				failedCount: w.failedCount,
			})),
		};
	}

	/**
	 * 헬스체크
	 */
	async healthCheck(): Promise<{
		healthy: boolean;
		workers: Array<{ id: number; alive: boolean }>;
	}> {
		const results: Array<{ id: number; alive: boolean }> = [];

		for (const [, slot] of this.workers) {
			try {
				const msg: WorkerInMessage = { type: "ping" };
				slot.worker.postMessage(msg);
				results.push({ id: slot.id, alive: true });
			} catch {
				results.push({ id: slot.id, alive: false });
			}
		}

		return {
			healthy: results.every((r) => r.alive),
			workers: results,
		};
	}

	/**
	 * 실행 중 여부
	 */
	isRunning(): boolean {
		return this.started;
	}

	/**
	 * 워커 수
	 */
	getWorkerCount(): number {
		return this.workers.size;
	}

	/**
	 * 대기 잡 수
	 */
	getPendingCount(): number {
		return this.jobQueue.length;
	}
}

/** 싱글톤 인스턴스 */
let defaultPool: WorkerPool | null = null;

export function getWorkerPool(config?: WorkerPoolConfig): WorkerPool {
	if (!defaultPool) {
		defaultPool = new WorkerPool(config);
	}
	return defaultPool;
}

export function resetWorkerPool(): void {
	defaultPool = null;
}
