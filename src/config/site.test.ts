import { afterEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_SITE_URL, SECTION_DESCRIPTIONS, SITE_DESCRIPTION, SITE_NAME, SITE_NAME_KO, SITE_NAME_LINES, SITE_NAME_TEXT, getSiteUrl } from "./site";

afterEach(() => vi.unstubAllEnvs());

describe("사이트 고유 값(config/site.ts)", () => {
    it("공개 화면에 이미 나가던 값을 그대로 유지한다", () => {
        expect(SITE_NAME).toBe("WHITE LIGHT STUDIO");
        expect(SITE_NAME_LINES.join(" ")).toBe(SITE_NAME);
        expect(SITE_NAME_KO).toBe("화이트라이트 스튜디오");
        expect(SITE_NAME_TEXT).toBe("White Light Studio");
        expect(SITE_DESCRIPTION).toBe("서울 광진구 중곡동의 음악 스튜디오. 보컬·악기 연습실, 음악 레슨, 녹음 및 음악 제작 서비스를 제공합니다.");
        expect(SECTION_DESCRIPTIONS).toEqual({
            works: "화이트라이트 스튜디오에서 제작된 음악 작업물 포트폴리오",
            crew: "화이트라이트 스튜디오의 프로듀서, 엔지니어, 크루 소개",
            studio: "화이트라이트 스튜디오 연습실 안내 - A, B, C, D Room 시설 및 가격 정보",
            class: "화이트라이트 스튜디오 음악 클래스 - 보컬, 기타, 피아노, 작곡, 플룻 레슨",
            contact: "화이트라이트 스튜디오 위치 안내 - 서울특별시 광진구 능동로 413-1 지하1층, 7호선 중곡역 3번 출구",
        });
    });
    it("사이트 주소는 환경변수를 쓰고 끝의 /를 없애며, 없으면 기본 주소를 쓴다", () => {
        vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://studio.example///");
        expect(getSiteUrl()).toBe("https://studio.example");
        vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
        expect(getSiteUrl()).toBe("");
        vi.unstubAllEnvs();
        delete process.env.NEXT_PUBLIC_SITE_URL;
        expect(getSiteUrl()).toBe(DEFAULT_SITE_URL);
    });
});

/** 공개 화면 코드(관리 화면·테스트·Sanity 스키마·fallback 데이터 제외)에 고객 이름·주소가 직접 박히지 않게 한다. */
describe("고객 고유 문구는 config/site.ts에만 둔다", () => {
    const skip = [/\.test\./, /^src\/app\/manage\//, /^src\/config\//, /^src\/sanity\/schemaTypes\//, /^src\/lib\/(studio-spaces|studio-info|site-settings)\.ts$/, /^src\/test\//];
    const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
    });
    it.each(["WHITE LIGHT", "화이트라이트", "White Light", "whitelightstudio.vercel.app"])("%s 문자열이 공개 코드에 직접 쓰이지 않는다", (word) => {
        const hits = files("src").filter((f) => !skip.some((re) => re.test(f))).filter((f) => readFileSync(f, "utf8").includes(word));
        expect(hits).toEqual([]);
    });
});
