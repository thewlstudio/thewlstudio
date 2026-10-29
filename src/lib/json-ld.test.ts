// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { jsonLdDate, serializeJsonLd } from "./json-ld";

describe("JSON-LD script 직렬화", () => {
    it.each([
        '</script><script>alert("xss")</script>',
        '</ScRiPt><img src=x onerror="alert(1)">',
        '<!-- <script> & "인용" 한글 \u2028\u2029',
    ])("CMS 문자열이 script 밖으로 나가지 않고 원문으로 복원된다: %s", (name) => {
        const value = { "@context": "https://schema.org", name, nested: { description: name } };
        const html = serializeJsonLd(value);
        expect(html).not.toContain("<");
        const dom = document.createElement("div");
        dom.innerHTML = `<script type="application/ld+json">${html}</script>`;
        expect(dom.children).toHaveLength(1);
        expect(dom.querySelectorAll("script")).toHaveLength(1);
        expect(JSON.parse(dom.firstElementChild!.textContent!)).toEqual(value);
    });

    it.each(["../app/layout.tsx", "../app/works/[slug]/page.tsx", "../app/crew/[slug]/page.tsx"])("%s의 JSON-LD는 안전한 직렬화를 사용한다", (path) => {
        const source = readFileSync(new URL(path, import.meta.url), "utf8");
        expect(source).toContain("__html: serializeJsonLd(");
        expect(source).not.toContain("__html: JSON.stringify(");
    });
});

describe("JSON-LD 날짜 변환", () => {
    it.each([
        ["2026. 10. 27.", "2026-10-27"],
        ["2024. 02. 29.", "2024-02-29"],
        ["2000. 02. 29.", "2000-02-29"],
        ["2026-10-27", "2026-10-27"],
        [" 2026. 01. 01. ", "2026-01-01"],
        ["2026-12-31", "2026-12-31"],
        ["0001. 01. 01.", "0001-01-01"],
        ["0099-01-01", "0099-01-01"],
        ["9999-12-31", "9999-12-31"],
    ])("%s를 날짜나 시간대 변경 없이 %s로 변환한다", (input, expected) => {
        expect(jsonLdDate(input)).toBe(expected);
    });
    it.each([
        "2025. 02. 29.", "1900-02-29", "2026. 02. 30.", "2026-04-31",
        "2026-00-01", "2026-13-01", "2026-01-00", "2026-01-32",
        "2026. 1. 01.", "2026. 01. 1.", "2026.01.01.", "2026. 01. 01",
        "2026/01/01", "01/02/2026", "2026-1-1", "2026-01-01T00:00:00Z",
        "2026-01-01+09:00", "2026-01-01 extra", "10000-01-01", "bad", "", " ",
        null, undefined, 20260101, NaN, {}, [], new Date("2026-01-01"),
    ])("존재하지 않거나 모호한 날짜 %s는 필드를 생략한다", (value) => {
        expect(jsonLdDate(value)).toBeUndefined();
        expect(serializeJsonLd({ datePublished: jsonLdDate(value) })).toBe("{}");
    });
});
