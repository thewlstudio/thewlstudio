import { describe, expect, it } from "vitest";
import { sanitizeRedirectPath } from "./internal-redirect";
import { previewTarget } from "./preview-path";

describe("미리보기 리다이렉트의 URL 정규화 경계", () => {
    it.each([
        null, "", "works/a", "https://outside.example", "//outside.example", "/\\outside.example",
        "/\t/outside.example", "/\n/outside.example", "/\r/outside.example", "/a\u0000b", "/a\u007fb",
        "/a/..//outside.example", "/.//outside.example", "/%2e//outside.example", "/%2E%2E//outside.example",
    ])("외부 주소나 제어 문자 우회를 홈으로 돌린다: %j", (raw) => {
        expect(sanitizeRedirectPath(raw)).toBe("/");
        expect(previewTarget(raw)).toBe("/");
    });

    it.each([
        ["/works/../crew/a", "/crew/a"],
        ["/works/앨범?view=preview#credits", "/works/%EC%95%A8%EB%B2%94?view=preview#credits"],
        ["/works/literal%252Fname", "/works/literal%252Fname"],
        ["/class?next=https%3A%2F%2Foutside.example#about", "/class?next=https%3A%2F%2Foutside.example#about"],
        ["/crew/100%25", "/crew/100%25"],
    ])("안전한 URL은 경로·쿼리·해시를 보존한다: %s", (raw, expected) => {
        expect(sanitizeRedirectPath(raw)).toBe(expected);
        expect(previewTarget(raw)).toBe(expected);
    });

    it.each(["/works/../manage", "/crew/%2e%2e/admin/desk", "/works/../api/draft", "/manage#help"])("정규화 뒤 관리·API·Studio 경로를 미리보기 대상으로 허용하지 않는다: %s", (raw) => {
        expect(previewTarget(raw)).toBe("/");
    });
});
