// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { VisibilityBanner, VisibilityField, saveNote } from "./VisibilityField";
import SaveStatus from "./SaveStatus";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement; let root: Root;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

describe("공개 상태 선택(4개 영역 공통)", () => {
    it("공개·비공개 두 버튼과 현재 선택(aria-pressed)을 보여 준다", () => {
        act(() => root.render(<VisibilityField isActive={false} where="홈페이지 Works 목록" onChange={() => {}} />));
        const [pub, hid] = Array.from(host.querySelectorAll("button"));
        expect([pub.textContent, pub.getAttribute("aria-pressed")]).toEqual(["공개", "false"]);
        expect([hid.textContent, hid.getAttribute("aria-pressed")]).toEqual(["비공개", "true"]);
        expect(host.textContent).toContain("홈페이지 Works 목록에는 나오지 않고");
        expect(host.textContent).toContain("미리보기");
    });
    it("버튼을 누르면 그 값으로 알린다", () => {
        const onChange = vi.fn();
        act(() => root.render(<VisibilityField isActive onChange={onChange} where="x" />));
        act(() => { (host.querySelectorAll("button")[1] as HTMLButtonElement).click(); });
        expect(onChange).toHaveBeenCalledWith(false);
    });
    it("비공개일 때만 상단 안내를 보여 준다", () => {
        act(() => root.render(<VisibilityBanner isActive where="홈페이지 크루 목록" />));
        expect(host.textContent).toBe("");
        act(() => root.render(<VisibilityBanner isActive={false} where="홈페이지 크루 목록" />));
        expect(host.querySelector('[role="status"]')?.textContent).toContain("지금 비공개 상태예요. 저장해도 홈페이지 크루 목록에는 나오지 않아요.");
    });
});

describe("저장 안내 문구", () => {
    it.each([[true, true, "추가하면 홈페이지에 바로 반영돼요."], [false, true, "저장하면 홈페이지에 바로 반영돼요."], [true, false, "추가해도 홈페이지에는 안 나와요. (비공개)"], [false, false, "저장해도 홈페이지에는 안 나와요. (비공개)"]])("만들기=%s 공개=%s → %s", (create, active, text) => {
        expect(saveNote(create, active)).toBe(text);
    });
    it("비공개로 저장했으면 '바로 반영'이라고 말하지 않고 미리보기를 안내한다", () => {
        act(() => root.render(<SaveStatus state={{ ok: true }} hidden />));
        expect(host.textContent).toContain("비공개라서 홈페이지에는 아직 안 보여요");
        expect(host.textContent).not.toContain("바로 반영");
        act(() => root.render(<SaveStatus state={{ ok: true }} />));
        expect(host.textContent).toContain("홈페이지에 바로 반영돼요");
    });
});
