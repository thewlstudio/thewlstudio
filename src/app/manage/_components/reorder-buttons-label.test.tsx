// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import ReorderButtons from "./ReorderButtons";

vi.mock("./Toast", () => ({ useToast: () => ({ show: () => {} }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }), usePathname: () => "/manage/crew" }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement; let root: Root;
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); });

const names = () => Array.from(host.querySelectorAll("button")).map((b) => b.getAttribute("aria-label"));
const move = async () => ({ ok: true as const });

describe("순서 이동 버튼의 접근 가능한 이름", () => {
    it("항목 이름이 있으면 줄마다 어느 항목인지 알 수 있게 읽힌다", () => {
        act(() => root.render(<ReorderButtons documentId="a" label="백광흠" disableUp={false} disableDown={false} move={move} />));
        expect(names()).toEqual(["백광흠 위로 이동", "백광흠 아래로 이동"]);
    });
    it("이름이 없으면 기존 문구를 유지한다", () => {
        act(() => root.render(<ReorderButtons documentId="a" disableUp={false} disableDown={false} move={move} />));
        expect(names()).toEqual(["위로 이동", "아래로 이동"]);
    });
});
