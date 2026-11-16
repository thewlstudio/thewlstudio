import { describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { callManageAction, UNKNOWN_ACTION_RESULT } from "./callManageAction";

describe("관리 작업의 통신 예외 처리", () => {
    it("명시적인 확인 완료 표시는 문구를 해석하지 않고 그대로 전달한다", async () => {
        const result = { ok: false as const, error: "다른 안내 문구", committed: true as const };
        expect(await callManageAction(async () => result)).toBe(result);
    });
    it.each([
        { ok: false, error: "안내", committed: false }, { ok: false, error: "안내", committed: "true" },
        { ok: false, error: "안내", committed: undefined }, { ok: true, committed: true },
        Object.assign(Object.create({ committed: true }), { ok: false, error: "안내" }),
    ])("잘못된 확인 완료 표시 #%#로는 저장 완료를 추측하지 않는다", async (value) => {
        expect(await callManageAction(async () => value)).toEqual({ ok: false, error: UNKNOWN_ACTION_RESULT });
    });
    it.each([null, undefined, [], {}, { ok: "true" }, { ok: false }, { ok: false, error: {} }, { ok: false, error: "bad", fields: [null] }])("비정상 응답 #%#는 처리 결과 불명으로 안내한다", async (value) => {
        const request = vi.fn().mockResolvedValue(value);
        expect(await callManageAction(request)).toEqual({ ok: false, error: UNKNOWN_ACTION_RESULT }); expect(request).toHaveBeenCalledTimes(1);
    });
    it("성공과 필드별 오류 응답은 그대로 유지한다", async () => {
        const success = { ok: true, newId: "new-document" } as const;
        const failure = { ok: false, error: "입력 오류", fields: [{ id: "name", label: "이름" }] } as const;
        expect(await callManageAction(async () => success)).toBe(success);
        expect(await callManageAction(async () => failure)).toBe(failure);
    });
    it("추가 성공 정보의 검증 실패도 결과 불명으로 돌리고 재시도하지 않는다", async () => {
        const request = vi.fn(async () => ({ ok: true as const, newId: "../bad" }));
        expect(await callManageAction(request, () => false)).toEqual({ ok: false, error: UNKNOWN_ACTION_RESULT }); expect(request).toHaveBeenCalledTimes(1);
    });
    it("성공 검증은 정상 응답을 그대로 유지하고 오류 응답에는 적용하지 않는다", async () => {
        const result = { ok: true as const, newId: "created" }; const check = vi.fn(() => true);
        expect(await callManageAction(async () => result, check)).toBe(result); expect(check).toHaveBeenCalledTimes(1);
        check.mockClear(); await callManageAction(async () => ({ ok: false as const, error: "입력 오류" }), check); expect(check).not.toHaveBeenCalled();
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
