import { describe, expect, it } from "vitest";
import { commitManagedPatch, ManagedPatchResultError, ManagedRefreshError, PATCH_REFRESH_FAILED, refreshManagedChange } from "./manage-patch-result";
import { managedSaveFailure } from "./manage-target";

describe("저장 확인 후 갱신 실패의 명시적 상태", () => {
    it("갱신 콜백 실패는 저장 확인 상태로 변환한다", () => {
        try { refreshManagedChange(() => { throw new Error("DO_NOT_ECHO"); }); }
        catch (error) {
            expect(error).toBeInstanceOf(ManagedRefreshError);
            expect(managedSaveFailure(error)).toEqual({ ok: false, error: PATCH_REFRESH_FAILED, committed: true }); return;
        }
        throw new Error("갱신 오류를 확인해야 합니다.");
    });
    it.each([new Error(PATCH_REFRESH_FAILED), new ManagedPatchResultError(PATCH_REFRESH_FAILED)])("안내 문구가 같아도 오류 종류가 다르면 확인 상태를 붙이지 않는다 #%#", (error) => {
        expect(managedSaveFailure(error)).toEqual({ ok: false, error: PATCH_REFRESH_FAILED });
    });
    it("문구가 바뀌어도 확인된 갱신 오류의 의미는 유지한다", () => {
        const error = new ManagedRefreshError(); error.message = "다른 안내 문구";
        expect(managedSaveFailure(error)).toEqual({ ok: false, error: "다른 안내 문구", committed: true });
    });
    it("409 충돌에는 확인 상태를 붙이지 않는다", () => {
        expect(managedSaveFailure({ statusCode: 409 })).not.toHaveProperty("committed");
    });
    it("저장 요청 자체가 같은 오류를 던져도 결과 불명으로만 처리한다", async () => {
        try { await commitManagedPatch(async () => { throw new ManagedRefreshError(); }, "d", "work"); }
        catch (error) { expect(managedSaveFailure(error)).not.toHaveProperty("committed"); return; }
        throw new Error("요청 오류를 확인해야 합니다.");
    });
});
