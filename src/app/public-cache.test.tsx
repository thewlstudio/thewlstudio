import { beforeEach, describe, expect, it, vi } from "vitest";
import ClassPage from "./class/page";
import CrewPage from "./crew/page";
import WorksPage, { generateMetadata as worksMetadata } from "./works/page";
import StudioPage from "./studio/page";
import ContactPage from "./contact/page";
import RootLayout from "./layout";
import { getSiteSettings } from "@/lib/site-settings-server";

const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/sanity/lib/client", () => ({ sanityFetch: read }));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "font-variable", className: "font-class" }) }));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("./class/ClassClient", () => ({ default: () => null }));
vi.mock("./crew/CrewClient", () => ({ default: () => null }));
vi.mock("./works/WorksClient", () => ({ default: () => null }));
vi.mock("./studio/StudioClient", () => ({ default: () => null }));

beforeEach(() => {
    read.mockReset();
    read.mockImplementation(async ({ query }: { query: string }) => /_type == "(?:studioInfo|siteSettings)"/.test(query) ? null : []);
});

describe("공개 데이터 소비 지점의 캐시 태그", () => {
    it.each([
        { name: "Class", run: () => ClassPage(), tags: [["instructor"]] },
        { name: "Crew 목록", run: () => CrewPage(), tags: [["crew"]] },
        { name: "Works 목록", run: () => WorksPage({ searchParams: Promise.resolve({}) }), tags: [["work"]] },
        { name: "Works 메타데이터", run: () => worksMetadata({ searchParams: Promise.resolve({}) }), tags: [["work"]] },
        { name: "Studio", run: () => StudioPage(), tags: [["studioSpace"], ["studioInfo"]] },
        { name: "루트·Contact 공통 설정", run: () => getSiteSettings(), tags: [["siteSettings"]] },
        { name: "Contact 서버 페이지", run: () => ContactPage(), tags: [["siteSettings"]] },
        { name: "루트 레이아웃·Organization 정보", run: () => RootLayout({ children: null }), tags: [["siteSettings"]] },
    ])("$name은 관리 액션이 갱신하는 태그로 조회한다", async ({ run, tags }) => {
        await run();
        expect(read.mock.calls.map(([options]) => options.tags)).toEqual(tags);
    });
});
