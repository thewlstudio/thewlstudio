import { describe, expect, it } from "vitest";
import { checkBackup, formatSummary, summarizeNdjson } from "./backup-verify";

const nd = (...docs: unknown[]) => docs.map((d) => JSON.stringify(d)).join("\n") + "\n";
const good = nd({ _id: "siteSettings", _type: "siteSettings" }, { _id: "a", _type: "crew" }, { _id: "b", _type: "crew" }, { _id: "c", _type: "work" });

describe("백업 내용 요약", () => {
    it("문서 수와 종류별 개수를 센다", () => {
        expect(summarizeNdjson(good)).toEqual({ total: 4, byType: { siteSettings: 1, crew: 2, work: 1 }, badLines: [] });
    });
    it("빈 줄은 무시하고, 깨진 줄은 줄 번호와 이유를 남기며 세지 않는다", () => {
        const text = `{"_id":"a","_type":"crew"}\n\nnot json\n[]\n{"_type":"crew"}\n{"_id":"b"}\n"문자열"\n`;
        const s = summarizeNdjson(text);
        expect(s.total).toBe(1);
        expect(s.badLines.map((b) => b.line)).toEqual([3, 4, 5, 6, 7]);
        expect(s.badLines.map((b) => b.reason)).toEqual(["JSON이 아니에요", "문서 객체가 아니에요", "_id 또는 _type이 없어요", "_id 또는 _type이 없어요", "문서 객체가 아니에요"]);
    });
    it("완전히 빈 입력은 0개", () => expect(summarizeNdjson("")).toEqual({ total: 0, byType: {}, badLines: [] }));
});

describe("백업 점검 기준", () => {
    it("정상 백업은 통과한다", () => expect(checkBackup(summarizeNdjson(good))).toEqual({ ok: true, problems: [] }));
    it("빈 백업은 실패한다", () => {
        const r = checkBackup(summarizeNdjson(""));
        expect(r.ok).toBe(false);
        expect(r.problems.join(" ")).toContain("빈 백업");
    });
    it("깨진 줄이 있으면 실패한다", () => {
        const r = checkBackup(summarizeNdjson(good + "깨짐\n"));
        expect(r.ok).toBe(false);
        expect(r.problems.join(" ")).toContain("읽을 수 없는 줄");
    });
    it("필수 문서 종류가 없으면 실패하고, 기준을 바꿀 수 있다", () => {
        const s = summarizeNdjson(nd({ _id: "a", _type: "crew" }));
        expect(checkBackup(s).problems.join(" ")).toContain("siteSettings 문서가 없어요");
        expect(checkBackup(s, { requireTypes: ["crew"] }).ok).toBe(true);
        expect(checkBackup(s, { requireTypes: ["crew", "work"] }).problems).toEqual(["work 문서가 없어요."]);
    });
    it("최소 문서 수 기준을 지킨다", () => {
        expect(checkBackup(summarizeNdjson(good), { minTotal: 5 }).ok).toBe(false);
        expect(checkBackup(summarizeNdjson(good), { minTotal: 4 }).ok).toBe(true);
    });
});

describe("요약 문구", () => {
    it("많은 종류부터 보여 준다", () => expect(formatSummary(summarizeNdjson(good))).toBe("문서 4개 (crew 2, siteSettings 1, work 1)"));
    it("비어 있으면 종류 괄호가 없다", () => expect(formatSummary(summarizeNdjson(""))).toBe("문서 0개"));
});
