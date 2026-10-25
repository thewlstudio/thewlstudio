import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { tourForPath } from "./tours";

describe("tourForPath — 주소별 화면 안내", () => {
    it.each([
        ["/manage", "hub"],
        ["/manage/", "hub"],
        ["/manage/contact", "contact"],
        ["/manage/studio/info", "studio-info"],
        ["/manage/crew", "list-crew"],
        ["/manage/instructors", "list-instructors"],
        ["/manage/works", "list-works"],
        ["/manage/studio", "list-studio"],
        ["/manage/crew/abc123", "form-crew"],
        ["/manage/crew/new", "form-crew"],
        ["/manage/works/abc", "form-works"],
        ["/manage/studio/studioSpace-room-a", "form-studio"],
        ["/manage/instructors/new", "form-instructors"],
        ["/manage/history/crew/abc", "history"],
    ])("%s → %s", (p, id) => {
        expect(tourForPath(p)?.id).toBe(id);
    });

    it.each(["/manage/help", "/manage/map", "/manage/login", "/works", "/", "/manage/unknown", "/manage/crew/a/b"])("안내가 없는 화면: %s", (p) => {
        expect(tourForPath(p)).toBeNull();
    });

    it("작업물 수정에만 '상세 페이지 내용' 단계가 있다", () => {
        expect(tourForPath("/manage/works/x")!.steps.some((s) => s.title === "상세 페이지 내용")).toBe(true);
        expect(tourForPath("/manage/crew/x")!.steps.some((s) => s.title === "상세 페이지 내용")).toBe(false);
    });

    it("작업물 목록에는 순서 바꾸기 단계가 없다 (발매일 자동 정렬)", () => {
        expect(tourForPath("/manage/works")!.steps.some((s) => s.title === "순서 바꾸기")).toBe(false);
        expect(tourForPath("/manage/crew")!.steps.some((s) => s.title === "순서 바꾸기")).toBe(true);
    });
});

describe("투어 내용 규칙", () => {
    const paths = ["/manage", "/manage/contact", "/manage/studio/info", "/manage/crew", "/manage/works", "/manage/crew/x", "/manage/works/x", "/manage/history/crew/x"];

    it.each(paths)("%s — 단계는 6개 이하(작업물 수정은 7개 이하), 제목·본문이 있다", (p) => {
        const t = tourForPath(p)!;
        expect(t.steps.length).toBeGreaterThan(0);
        expect(t.steps.length).toBeLessThanOrEqual(p === "/manage/works/x" ? 7 : 6);
        for (const s of t.steps) {
            expect(s.title.length).toBeGreaterThan(0);
            expect(s.title.length).toBeLessThanOrEqual(20);
            expect(s.body.length).toBeGreaterThan(10);
            expect(s.target).toMatch(/^\[data-tour="[a-z-]+"\]$/);
        }
    });

    it("투어가 가리키는 data-tour 이름은 모두 실제 화면 코드에 존재한다 (요소가 사라지면 안내가 조용히 빠지므로 미리 잡는다)", () => {
        const root = path.resolve(__dirname, "../..");
        const all: string[] = [];
        const walk = (d: string) => {
            for (const n of readdirSync(d)) {
                const p = path.join(d, n);
                if (statSync(p).isDirectory()) walk(p);
                else if (/\.tsx?$/.test(n) && !/\.test\./.test(n) && n !== "tours.ts") all.push(readFileSync(p, "utf8"));
            }
        };
        walk(root);
        const src = all.join("\n");
        const names = new Set<string>();
        for (const p of paths.concat(["/manage/instructors", "/manage/studio", "/manage/studio/x"])) for (const s of tourForPath(p)!.steps) names.add(s.target.match(/"([^"]+)"/)![1]);
        const missing = [...names].filter((n) => !src.includes(`"${n}"`));
        expect(missing).toEqual([]);
    });
});
