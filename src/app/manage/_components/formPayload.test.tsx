// @vitest-environment jsdom
import { act, startTransition } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { formPayloadError, MAX_MANAGE_FORM_BYTES } from "./formPayload";
import { useManagedFormAction } from "./useManagedFormAction";

vi.mock("next/navigation", async (original) => ({ ...await original<typeof import("next/navigation")>(), useRouter: () => ({ refresh: vi.fn() }) }));
function photo(bytes: number, name = "사진.png") { return new File([new Uint8Array(bytes)], name, { type: "image/png" }); }

describe("관리 폼 전체 용량 검사", () => {
    it("한 장씩은 작아도 합계가 크면 차단한다", () => {
        const data = new FormData();
        data.append("first", photo(2_000_000));
        expect(formPayloadError(data)).toBeNull();
        data.append("second", photo(2_000_000));
        expect(formPayloadError(data)).toContain("용량이 너무 커요");
    });
    it("반복 필드 이름의 파일도 모두 합산한다", () => {
        const data = new FormData();
        data.append("photos", photo(2_000_000));
        data.append("photos", photo(2_000_000));
        expect(formPayloadError(data)).not.toBeNull();
    });
    it("한글 텍스트는 글자 수가 아니라 UTF-8 용량으로 검사한다", () => {
        const data = new FormData();
        data.set("body", "한".repeat(1_300_000));
        expect(formPayloadError(data)).not.toBeNull();
        data.set("body", "a".repeat(1_300_000));
        expect(formPayloadError(data)).toBeNull();
    });
    it("파일만 4MB 미만이어도 전송 부가 정보의 여유를 확보한다", () => {
        const data = new FormData();
        data.set("photo", photo(MAX_MANAGE_FORM_BYTES));
        expect(MAX_MANAGE_FORM_BYTES).toBeLessThan(4 * 1024 * 1024);
        expect(formPayloadError(data)).not.toBeNull();
    });
    it("빈 파일 입력과 일반적인 텍스트는 허용한다", () => {
        const data = new FormData();
        data.set("empty", photo(0, ""));
        data.set("body", "내용\r\n다음 줄\n마지막 줄");
        expect(formPayloadError(data)).toBeNull();
    });
    it("용량 초과 시 서버 액션을 호출하지 않고 기존 파일도 건드리지 않는다", async () => {
        Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
        const save = vi.fn(async () => ({ ok: true } as const));
        const data = new FormData();
        const first = photo(2_000_000);
        data.append("one", first);
        data.append("two", photo(2_000_000));
        function Harness() {
            const session = useManagedFormAction(save);
            return <><button onClick={() => startTransition(() => session.formAction(data))}>전송</button><p>{session.state && !session.state.ok ? session.state.error : ""}</p></>;
        }
        const host = document.createElement("div");
        document.body.appendChild(host);
        const root = createRoot(host);
        try {
            await act(async () => root.render(<Harness />));
            await act(async () => host.querySelector("button")!.click());
            expect(save).not.toHaveBeenCalled();
            expect(host.textContent).toContain("사진을 나눠 저장");
            expect(data.get("one")).toBe(first);
        } finally {
            await act(async () => root.unmount());
            host.remove();
        }
    });
});
