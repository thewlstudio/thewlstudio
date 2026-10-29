import { describe, expect, it } from "vitest";
import { externalHttpUrl, instagramProfileUrl, youTubeVideoId } from "./content-urls";
import { sanitizeBlocks } from "./work-blocks-server";

const id = "R86SFBXqEdM";
const validVideos = [
    `https://youtu.be/${id}`, `https://www.youtu.be/${id}?si=share`, `http://youtu.be/${id}/`,
    `https://www.youtube.com/watch?v=${id}`, `https://youtube.com/watch?list=album&v=${id}&t=30`,
    `https://m.youtube.com/watch?v=${id}`, `https://music.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/embed/${id}`, `https://www.youtube.com/v/${id}`,
    `https://www.youtube.com/u/w/${id}`, `https://youtube.com/shorts/${id}?si=share`,
    `https://www.youtube.com/live/${id}?feature=share`, `https://www.youtube-nocookie.com/embed/${id}`,
];
const invalidVideos = [
    `https://example.com/watch?v=${id}`, `https://evil.example/youtu.be/${id}`,
    `https://youtube.com.evil.example/watch?v=${id}`, `https://youtu.be.evil.example/${id}`,
    `https://youtube.com@evil.example/watch?v=${id}`, `https://evil.example@youtube.com/watch?v=${id}`,
    `javascript:watch?v=${id}`, `ftp://youtu.be/${id}`, `https://youtube.com:8443/watch?v=${id}`,
    `https://youtube.com/watch?v=bad/1234567`, `https://youtube.com/watch?v=bad%22%20chars`,
    `https://youtube.com/playlist?list=${id}`, `https://youtube.com//shorts/${id}`,
    `https://youtu.be/${id}/extra`, `https://youtube-nocookie.com/watch?v=${id}`,
    "https://youtube.com/watch?v=short", "https://youtube.com/watch?v=toolong123456",
    "", null, undefined, 123,
];
describe("영상 저장·공개 화면의 공통 주소 규칙", () => {
    it.each(validVideos)("정상 YouTube 주소: %s", async (url) => {
        expect(youTubeVideoId(url)).toBe(id);
        const result = await sanitizeBlocks([{ _key: "video", _type: "videoEmbedBlock", url }], [], async () => null);
        expect(result).toMatchObject({ blocks: [{ _type: "videoEmbedBlock", url }] });
    });
    it.each(invalidVideos)("영상으로 해석하지 않는 주소: %s", (url) => {
        expect(youTubeVideoId(url)).toBeNull();
    });
    it.each(invalidVideos.filter((v): v is string => typeof v === "string" && !!v))("서버도 잘못된 주소를 거부: %s", async (url) => {
        expect(await sanitizeBlocks([{ _key: "video", _type: "videoEmbedBlock", url }], [], async () => null)).toHaveProperty("error");
    });
});
describe("공개 외부 링크", () => {
    it.each(["https://example.com/path?q=value#part", "http://example.com", "HTTPS://EXAMPLE.COM", " https://example.com/path "])("유효한 절대 주소: %s", (url) => {
        expect(externalHttpUrl(url)).toBe(url.trim());
    });
    it.each(["javascript:alert(1)", "data:text/html,bad", "//example.com", "/relative", "https:example.com", "https://", "https://a@b.com", "https://user:pass@example.com", "https://example.com\\@evil.com", "https://example.com/\npath", "https://example.com/\tpath", null, {}, 1])("링크로 내보내지 않는 주소: %s", (value) => {
        expect(externalHttpUrl(value)).toBeNull();
    });
    it.each(["@artist_name", " artist.name ", "Artist09"])("인스타그램 아이디: %s", (value) => {
        expect(instagramProfileUrl(value)).toBe("https://instagram.com/" + value.trim().replace(/^@/, ""));
    });
    it.each(["..", ".", "bad/name", "bad?query", "https://example.com", "", null])("아이디가 아니면 임의 주소를 조립하지 않는다: %s", (value) => {
        expect(instagramProfileUrl(value)).toBeNull();
    });
});
