// ============================================================
// BunIgniter - Scheduler 테스트
// ============================================================

import { describe, test, expect, beforeEach } from "bun:test";
import { Scheduler } from "../system/core/scheduler.ts";

describe("Scheduler", () => {
	beforeEach(() => {
		// 기존 잡 정리
		for (const job of Scheduler.list()) {
			Scheduler.remove(job.name);
		}
	});

	test("잡 추가", () => {
		Scheduler.add("test-job-1", "*/5 * * * *", () => {});
		const jobs = Scheduler.list();
		expect(jobs.length).toBe(1);
		expect(jobs[0].name).toBe("test-job-1");
		expect(jobs[0].schedule).toBe("*/5 * * * *");
		expect(jobs[0].enabled).toBe(true);
	});

	test("잡 추가 (비활성화)", () => {
		Scheduler.add("test-job-2", "@hourly", () => {}, { enabled: false });
		const jobs = Scheduler.list();
		expect(jobs[0].enabled).toBe(false);
	});

	test("잡 제거", () => {
		Scheduler.add("test-job-3", "@daily", () => {});
		expect(Scheduler.count()).toBe(1);

		const removed = Scheduler.remove("test-job-3");
		expect(removed).toBe(true);
		expect(Scheduler.count()).toBe(0);
	});

	test("존재하지 않는 잡 제거", () => {
		const removed = Scheduler.remove("nonexistent");
		expect(removed).toBe(false);
	});

	test("잡 활성화/비활성화", () => {
		Scheduler.add("test-job-4", "@hourly", () => {}, { enabled: false });
		expect(Scheduler.get("test-job-4")?.enabled).toBe(false);

		Scheduler.enable("test-job-4");
		expect(Scheduler.get("test-job-4")?.enabled).toBe(true);

		Scheduler.disable("test-job-4");
		expect(Scheduler.get("test-job-4")?.enabled).toBe(false);
	});

	test("여러 잡 일괄 추가", () => {
		Scheduler.addMany([
			{ name: "job-a", schedule: "@hourly", handler: () => {} },
			{ name: "job-b", schedule: "@daily", handler: () => {} },
			{ name: "job-c", schedule: "@weekly", handler: () => {} },
		]);
		expect(Scheduler.count()).toBe(3);
	});

	test("다음 실행 시각 조회", () => {
		const next = Scheduler.nextRun("@hourly");
		expect(next).not.toBeNull();
		expect(next instanceof Date).toBe(true);
	});

	test("다음 N번 실행 시각", () => {
		const runs = Scheduler.upcomingRuns("@daily", 3);
		expect(runs.length).toBe(3);
		// 오름차순 정렬 확인
		for (let i = 1; i < runs.length; i++) {
			expect(runs[i].getTime()).toBeGreaterThan(runs[i - 1].getTime());
		}
	});

	test("잡 목록에 nextRun 포함", () => {
		Scheduler.add("test-job-5", "@hourly", () => {});
		const jobs = Scheduler.list();
		expect(jobs[0].nextRun).not.toBeNull();
	});

	test("비활성 잡의 nextRun은 null", () => {
		Scheduler.add("test-job-6", "@hourly", () => {}, { enabled: false });
		const jobs = Scheduler.list();
		expect(jobs[0].nextRun).toBeNull();
	});

	test("잡 개수 조회", () => {
		expect(Scheduler.count()).toBe(0);
		Scheduler.add("job-1", "@hourly", () => {});
		expect(Scheduler.count()).toBe(1);
	});

	test("특정 잡 조회", () => {
		Scheduler.add("test-job-7", "@daily", () => {});
		const job = Scheduler.get("test-job-7");
		expect(job).toBeDefined();
		expect(job?.name).toBe("test-job-7");
	});

	test("동일 이름 잡 덮어쓰기", () => {
		Scheduler.add("duplicate", "@hourly", () => {});
		Scheduler.add("duplicate", "@daily", () => {});
		expect(Scheduler.count()).toBe(1);
		expect(Scheduler.get("duplicate")?.schedule).toBe("@daily");
	});

	test("스케줄러 시작/정지", () => {
		Scheduler.add("test-job-8", "@hourly", () => {});
		Scheduler.startAll();
		expect(Scheduler.isStarted()).toBe(true);

		Scheduler.stopAll();
		expect(Scheduler.isStarted()).toBe(false);
	});

	test("크론 표현식 닉네임 지원", () => {
		const nicknames = ["@yearly", "@monthly", "@weekly", "@daily", "@hourly"];
		for (const nick of nicknames) {
			const next = Scheduler.nextRun(nick);
			expect(next).not.toBeNull();
		}
	});

	test("크론 표현식 5-field 지원", () => {
		const expressions = [
			"*/5 * * * *",
			"0 * * * *",
			"0 9 * * MON-FRI",
			"30 2 * * MON",
		];
		for (const expr of expressions) {
			const next = Scheduler.nextRun(expr);
			expect(next).not.toBeNull();
		}
	});
});
