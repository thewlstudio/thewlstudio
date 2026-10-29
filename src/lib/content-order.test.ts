import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONTENT_ORDER, STUDIO_CONTENT_ORDER } from "./content-order";

describe("공개·관리 화면의 동일한 정렬 규칙", () => {
    it("미설정은 0, 같은 값은 ID로 순서를 확정한다", () => {
        expect(CONTENT_ORDER).toBe("coalesce(order, 0) asc, _id asc");
        expect(STUDIO_CONTENT_ORDER).toBe(`select(kind == "lobby" => 1, 0) asc, ${CONTENT_ORDER}`);
    });
    it.each([
        "../app/manage/instructors/page.tsx", "../app/manage/crew/page.tsx",
        "../app/manage/instructors/actions.ts", "../app/manage/crew/actions.ts", "../sanity/lib/queries.ts",
    ])("%s는 공통 정렬 규칙을 사용한다", (file) => {
        const source = readFileSync(new URL(file, import.meta.url), "utf8");
        expect(source).toContain("order(${CONTENT_ORDER})");
        expect(source).not.toContain("order(order asc)");
    });
    it.each(["../app/manage/studio/page.tsx", "../app/manage/studio/actions.ts", "../app/studio/page.tsx"])("%s는 스튜디오 그룹 순서를 공유한다", (file) => {
        expect(readFileSync(new URL(file, import.meta.url), "utf8")).toContain("order(${STUDIO_CONTENT_ORDER})");
    });
});
