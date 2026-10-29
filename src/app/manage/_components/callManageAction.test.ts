import { describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { callManageAction, UNKNOWN_ACTION_RESULT } from "./callManageAction";

describe("관리 작업의 통신 예외 처리", () => {
    it("성공과 필드별 오류 응답은 그대로 유지한다", async () => {
        const success = { ok: true, newId: "new-document" } as const;
        const failure = { ok: false, error: "입력 오류", fields: [{ id: "name", label: "이름" }] } as const;
        expect(await callManageAction(async () => success)).toBe(success);
        expect(await callManageAction(async () => failure)).toBe(failure);
    });
    it("요청 예외는 결과 불명 안내로 돌리고 자동 재시도하지 않는다", async () => {
        const request = vi.fn().mockRejectedValue(new TypeError("Failed to fetch: private details"));
        expect(await callManageAction(request)).toEqual({ ok: false, error: UNKNOWN_ACTION_RESULT });
        expect(request).toHaveBeenCalledTimes(1);
        expect(UNKNOWN_ACTION_RESULT).not.toContain("private details");
    });
    it("생성 성공 후 redirect는 오류 안내로 바꾸지 않는다", async () => {
        await expect(callManageAction(async () => redirect("/manage/works/new-document"))).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") });
    });
    it("Next의 notFound 신호도 프레임워크에 전달한다", async () => {
        await expect(callManageAction(async () => notFound())).rejects.toMatchObject({ digest: expect.stringContaining("404") });
    });
});
