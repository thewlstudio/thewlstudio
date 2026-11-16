// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CrewSectionsEditor from "../crew/[id]/CrewSectionsEditor";
import WorkBlocksEditor from "../works/[id]/WorkBlocksEditor";
import { migrateLegacy, toState as crewState } from "@/lib/crew-sections";
import { toState as workState } from "@/lib/work-blocks";
import { sanitizeSections } from "@/lib/crew-sections-server";
import { sanitizeBlocks } from "@/lib/work-blocks-server";

vi.mock("./ImageCropper", () => ({ default: () => null }));
let host: HTMLDivElement;
let root: Root;
const dirty = vi.fn();
async function render(node: React.ReactNode) { await act(async () => root.render(node)); }
const payload = (name: string) => JSON.parse(host.querySelector<HTMLInputElement>(`input[name="${name}"]`)!.value);
const button = (label: string) => Array.from(host.querySelectorAll("button")).find((node) => node.textContent === label);
beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

describe("미지원 본문 표시와 원본 보존", () => {
    it("Works 보존 블록은 순서를 바꾼 뒤 다시 편집·저장해도 원본 전체가 남는다", async () => {
        const opaque = { _key: "opaque", _type: "freeformTextBlock", content: [{ _type: "block", children: [{ text: "원본 본문" }] }], custom: { untouched: true } };
        const raw = [opaque, { _key: "text", _type: "descriptionBlock", paragraphs: ["설명"] }];
        await render(<WorkBlocksEditor initial={workState(raw)} onDirty={dirty} />);
        const move = host.querySelector<HTMLButtonElement>('[aria-label="자유 서식 (편집 불가) 아래로 이동"]')!;
        await act(async () => move.click());
        const first = await sanitizeBlocks(payload("blocksJson"), raw, async () => null);
        expect(first).toMatchObject({ blocks: [{ _key: "text" }, opaque] });
        if (!("blocks" in first)) throw new Error("test save failed");
        await render(<WorkBlocksEditor key="refresh" initial={workState(first.blocks)} onDirty={dirty} />);
        expect(await sanitizeBlocks(payload("blocksJson"), first.blocks as Record<string, unknown>[], async () => null)).toEqual(first);
    });
    it.each(["constructor", "__proto__", "toString", "hasOwnProperty"])("Works 종류 %s를 상속된 라벨로 해석하지 않는다", async (_type) => {
        const raw = [{ _key: "opaque", _type, content: { untouched: true } }];
        await render(<WorkBlocksEditor initial={workState(raw)} onDirty={dirty} />);
        expect(host.querySelector("h3")?.textContent).toBe(`${_type} (편집 불가)`);
        expect(await sanitizeBlocks(payload("blocksJson"), raw, async () => null)).toEqual({ blocks: raw });
        expect(button("블록 지우기")).toBeUndefined(); expect(dirty).not.toHaveBeenCalled();
    });
    it.each([[null], [{ title: { privateValue: "DO_NOT_RENDER" } }], ["opaque text"], { unknown: true }])("Crew 미지원 원본 항목 #%#을 임의로 해석하지 않는다", async (items) => {
        const raw = [{ _key: "opaque", _type: "futureSection", items }]; const before = JSON.stringify(raw);
        await render(<CrewSectionsEditor initial={crewState(raw)} onDirty={dirty} />);
        expect(host.textContent).toContain("세부 내용은 /admin에서 확인"); expect(host.textContent).not.toContain("DO_NOT_RENDER");
        expect(sanitizeSections(payload("sectionsJson"), raw)).toEqual({ sections: raw }); expect(JSON.stringify(raw)).toBe(before);
    });
    it("Crew 옛 문자열 수상도 내용을 보여주고 명시적으로 전환한다", async () => {
        const raw = [{ _key: "old", _type: "awardsSection", items: ["예전 수상 기록"] }];
        await render(<CrewSectionsEditor initial={crewState(raw)} onDirty={dirty} />);
        expect(host.textContent).toContain("예전 수상 기록");
        await act(async () => button("새 형식으로 옮기기")!.click());
        const result = sanitizeSections(payload("sectionsJson"), raw);
        expect(result).toMatchObject({ sections: [{ _type: "awardsAndActivitiesSection", awards: [{ title: "예전 수상 기록" }], activities: [] }] });
        expect(dirty).toHaveBeenCalledTimes(1);
    });
    it.each([
        { items: [{ title: "수상", desc: "사라지면 안 되는 설명" }] },
        { items: [{ title: "수상", custom: "추가 정보" }] },
        { items: [{ title: "", date: "2020" }] },
        { items: ["수상"], custom: "섹션 추가 정보" },
    ])("모두 옮길 수 없는 예전 내용 #%#은 전환하지 않고 그대로 보존한다", async (fields) => {
        const raw = [{ _key: "old", _type: "awardsSection", ...fields }]; const initial = crewState(raw);
        await render(<CrewSectionsEditor initial={initial} onDirty={dirty} />);
        expect(button("새 형식으로 옮기기")).toBeUndefined(); expect(host.textContent).toContain("자동으로 옮기지 않았어요");
        expect(migrateLegacy(initial, "old")).toBe(initial);
        expect(sanitizeSections(payload("sectionsJson"), raw)).toEqual({ sections: raw }); expect(dirty).not.toHaveBeenCalled();
    });
    it("전환 확인을 취소하면 화면과 저장 JSON도 원본 참조를 유지한다", async () => {
        vi.mocked(window.confirm).mockReturnValue(false);
        const raw = [{ _key: "old", _type: "activitiesSection", items: ["활동"] }];
        await render(<CrewSectionsEditor initial={crewState(raw)} onDirty={dirty} />);
        const before = payload("sectionsJson"); await act(async () => button("새 형식으로 옮기기")!.click());
        expect(payload("sectionsJson")).toEqual(before); expect(dirty).not.toHaveBeenCalled();
    });
});
