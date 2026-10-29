import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ContactPage from "./contact/page";
import InfoPage from "./studio/info/page";
import { FALLBACK_SETTINGS } from "@/lib/site-settings";
import { FALLBACK_INFO } from "@/lib/studio-info";

const { fetch } = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ client: { fetch } }));
vi.mock("@/lib/manage-auth", () => ({ isAuthenticated: async () => true }));
vi.mock("@/sanity/lib/writeClient", () => ({ isWriteConfigured: () => true }));
vi.mock("./ManageNav", () => ({ default: () => <nav>관리 내비게이션</nav> }));
vi.mock("./_components/UpdatedAt", () => ({ default: () => null }));
vi.mock("./contact/ContactForm", () => ({ default: () => <form data-settings-form="contact" /> }));
vi.mock("./studio/info/StudioInfoForm", () => ({ default: () => <form data-settings-form="studioInfo" /> }));

type Raw = Record<string, unknown>;
const cases = [
    { type: "siteSettings", page: ContactPage, valid: () => ({ _id: "siteSettings", _type: "siteSettings", _rev: "v1", ...FALLBACK_SETTINGS }) as Raw, missing: "addressKo", broken: "phone" },
    { type: "studioInfo", page: InfoPage, valid: () => ({ _id: "studioInfo", _type: "studioInfo", _rev: "v1", ...FALLBACK_INFO }) as Raw, missing: "parkingDetail", broken: "services" },
];
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());
describe.each(cases)("$type 조회 상태 안내", ({ type, page, valid, missing, broken }) => {
    it("명시적 null인 최초 설정은 기본값 폼과 생성 안내를 보여준다", async () => {
        fetch.mockResolvedValue(null); const html = renderToStaticMarkup(await page());
        expect(html).toContain("data-settings-form"); expect(html).toContain("아직 저장된 설정이 없어요");
    });
    it("정상 원본은 폼을 그대로 연다", async () => {
        fetch.mockResolvedValue(valid()); expect(renderToStaticMarkup(await page())).toContain("data-settings-form");
    });
    it("누락 항목은 대체 표시와 저장 영향을 명시하고 편집을 허용한다", async () => {
        const raw = valid(); delete raw[missing]; const before = JSON.stringify(raw); fetch.mockResolvedValue(raw);
        const html = renderToStaticMarkup(await page());
        expect(html).toContain("data-settings-form"); expect(html).toContain("기본값 또는 빈 값"); expect(html).toContain("함께 저장돼요");
        expect(JSON.stringify(raw)).toBe(before);
    });
    it("잘못된 자료형은 기본값 폼으로 위장하지 않는다", async () => {
        fetch.mockResolvedValue({ ...valid(), [broken]: { privateValue: "DO_NOT_RENDER_RAW_VALUE" } });
        const html = renderToStaticMarkup(await page());
        expect(html).not.toContain("data-settings-form"); expect(html).toContain("안전하게 읽지 못했어요"); expect(html).not.toContain("DO_NOT_RENDER_RAW_VALUE");
    });
    it.each(["_id", "_type", "_rev"])("문서 식별/버전 %s가 잘못되면 저장 폼을 열지 않는다", async (field) => {
        const raw = { ...valid(), [field]: "wrong-value" }; if (field === "_rev") raw._rev = "";
        fetch.mockResolvedValue(raw); expect(renderToStaticMarkup(await page())).not.toContain("data-settings-form");
    });
    it("undefined 응답을 문서 없음으로 간주하지 않는다", async () => {
        fetch.mockResolvedValue(undefined); const html = renderToStaticMarkup(await page());
        expect(html).not.toContain("data-settings-form"); expect(html).not.toContain("아직 저장된 설정이 없어요");
    });
    it("조회 예외를 삼켜 기본값 폼으로 만들지 않는다", async () => {
        const failure = new Error("test read failure"); fetch.mockRejectedValue(failure);
        await expect(page()).rejects.toBe(failure);
    });
    it("고정 ID만으로 조회해 다른 종류의 문서를 없음으로 숨기지 않는다", async () => {
        fetch.mockResolvedValue(valid()); await page();
        expect(fetch.mock.calls[0][0]).toMatch(new RegExp(`\\*\\[\\s*_id\\s*==\\s*"${type}"\\s*\\]`));
    });
});
it("안내의 잘못된 배열 자료형이 GROQ 배열 투영에서 사라지지 않게 원본 필드를 조회한다", async () => {
    fetch.mockResolvedValue(cases[1].valid()); await InfoPage();
    for (const field of ["services", "equipment", "memberships"]) expect(fetch.mock.calls[0][0]).toMatch(new RegExp(`\\b${field}\\s*[,]`));
});
it("명시적으로 비운 안내 문구·배열을 누락으로 경고하지 않는다", async () => {
    const raw = cases[1].valid(); for (const field of Object.keys(FALLBACK_INFO)) raw[field] = Array.isArray(raw[field]) ? [] : "";
    fetch.mockResolvedValue(raw); const html = renderToStaticMarkup(await InfoPage());
    expect(html).toContain("data-settings-form"); expect(html).not.toContain("기본값 또는 빈 값");
});
