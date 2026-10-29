import { describe, expect, it } from "vitest";
import { scrubEvent } from "./sentry-scrub";

describe("Sentry 전송 전 개인정보 제거", () => {
    const event = {
        message: "boom",
        request: {
            url: "https://site.example/manage/crew/abc?token=secret#frag",
            method: "POST",
            query_string: "token=secret",
            cookies: { wls_manage_session: "SESSION" },
            data: { password: "pw", name: "작성 중인 내용" },
            headers: { Cookie: "wls_manage_session=SESSION", Authorization: "Bearer x", "X-Forwarded-For": "1.2.3.4", "User-Agent": "UA", Accept: "*/*" },
        },
        user: { id: "u1", email: "a@b.c", ip_address: "1.2.3.4" },
    };
    it("쿠키·요청 본문·쿼리 문자열을 지운다", () => {
        const out = scrubEvent(event) as typeof event;
        expect(out.request).not.toHaveProperty("cookies");
        expect(out.request).not.toHaveProperty("data");
        expect(out.request).not.toHaveProperty("query_string");
        expect(JSON.stringify(out)).not.toMatch(/SESSION|secret|"pw"|작성 중인 내용/);
    });
    it("쿠키·인증·IP 헤더는 지우고 나머지 헤더는 둔다(대소문자 무관)", () => {
        const out = scrubEvent(event) as typeof event;
        expect(out.request.headers).toEqual({ "User-Agent": "UA", Accept: "*/*" });
    });
    it("주소의 쿼리·해시를 지우고 경로는 둔다", () => {
        expect((scrubEvent(event) as typeof event).request.url).toBe("https://site.example/manage/crew/abc");
    });
    it("사용자는 id만 남긴다", () => {
        expect((scrubEvent(event) as typeof event).user).toEqual({ id: "u1" });
        expect(scrubEvent({ user: { email: "a@b.c" } }).user).toBeUndefined();
    });
    it("원본 객체를 바꾸지 않고, 요청 정보가 없는 이벤트도 처리한다", () => {
        const copy = JSON.stringify(event);
        scrubEvent(event);
        expect(JSON.stringify(event)).toBe(copy);
        expect(scrubEvent({ message: "x" })).toEqual({ message: "x" });
    });
});
