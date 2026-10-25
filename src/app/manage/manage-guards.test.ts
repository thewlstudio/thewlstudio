import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * /manage 소스 검사형 재발 방지 테스트.
 * 실제로 겪은 사고·반복되기 쉬운 실수를 코드 규칙으로 고정한다.
 */
const ROOT = path.resolve(__dirname);
const SRC = path.resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = path.join(dir, name);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
}
const read = (p: string) => readFileSync(p, "utf8");
const rel = (p: string) => path.relative(SRC, p);
const files = walk(ROOT);
const code = (s: string) =>
    s
        .split("\n")
        .filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l))
        .join("\n");

const forms = files.filter((f) => /Form\.tsx$/.test(f) && read(f).includes("useGuardedForm"));

describe("저장 폼 규칙", () => {
    it("저장 폼이 6개 있다 (강사·크루·작업물·공간·스튜디오 안내·연락처)", () => {
        expect(forms.map(rel).sort()).toMatchInlineSnapshot(`
          [
            "app/manage/contact/ContactForm.tsx",
            "app/manage/crew/[id]/CrewForm.tsx",
            "app/manage/instructors/[id]/InstructorForm.tsx",
            "app/manage/studio/[id]/SpaceForm.tsx",
            "app/manage/studio/info/StudioInfoForm.tsx",
            "app/manage/works/[id]/WorkForm.tsx",
          ]
        `);
    });

    it.each(forms.map((f) => [rel(f), f]))("%s — data-manage-form, noValidate, 칸별 오류 제공자, 저장 상태 표시, 저장 막대 안내 표시", (_n, f) => {
        const s = read(f);
        expect(s).toContain("data-manage-form");
        expect(s).toContain("noValidate");
        expect(s).toContain("FieldErrorsProvider");
        expect(s).toContain("onSubmit={validateOnSubmit}");
        expect(s).toContain("<SaveStatus");
        expect(s).toContain('data-tour="form-save-bar"');
    });

    it("Ctrl+S는 저장 폼(form[data-manage-form])만 제출한다 — 로그아웃 폼을 제출하면 안 된다 (실제 사고)", () => {
        const s = read(path.join(ROOT, "_components/useGuardedForm.ts"));
        expect(s).toContain('form[data-manage-form]');
        expect(s).not.toMatch(/querySelector[^\n]*"main form"/);
    });

    it("로그아웃 폼은 저장 폼 표시를 갖지 않는다", () => {
        expect(read(path.join(ROOT, "ManageNav.tsx"))).not.toContain("data-manage-form");
    });
});

describe("서버 액션은 모두 인증을 확인한다", () => {
    const actionFiles = files.filter((f) => /actions\.ts$/.test(f) && read(f).includes('"use server"'));
    // 로그아웃은 인증 없이도 호출 가능해야 한다
    const PUBLIC_OK = new Set(["logout"]);

    it("서버 액션 파일을 찾았다", () => {
        expect(actionFiles.length).toBeGreaterThanOrEqual(7);
    });

    /** 최상위 함수 하나의 본문만 잘라낸다 (줄 맨 앞의 `}`까지) */
    function bodies(text: string) {
        const out: Array<{ name: string; exported: boolean; body: string }> = [];
        const re = /^(export )?(?:async )?function (\w+)\(/gm;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) {
            const end = text.indexOf("\n}\n", m.index);
            out.push({ name: m[2], exported: !!m[1], body: text.slice(m.index, end === -1 ? undefined : end + 3) });
        }
        return out;
    }

    it.each(actionFiles.map((f) => [rel(f), f]))("%s", (_n, f) => {
        const fns = bodies(read(f));
        // 인증을 확인하는 같은 파일의 내부 도우미(예: setTrashed)를 거치는 것도 인정한다
        const helpers = fns.filter((x) => !x.exported && x.body.includes("requireAuth()")).map((x) => x.name);
        for (const fn of fns.filter((x) => x.exported)) {
            if (PUBLIC_OK.has(fn.name)) continue;
            const ok = fn.body.includes("requireAuth()") || helpers.some((h) => new RegExp(`\\b${h}\\(`).test(fn.body));
            expect(ok, `${fn.name}에 requireAuth() 호출(또는 인증하는 내부 도우미 호출)이 없습니다`).toBe(true);
        }
    });

    it("삭제·복원 도우미 자체는 인증을 확인한다", () => {
        for (const f of actionFiles) {
            for (const fn of bodies(read(f))) if (fn.name === "setTrashed") expect(fn.body).toContain("requireAuth()");
        }
    });
});

describe("문구 규칙 (MANAGE_GUIDE '관리 화면 문구 원칙')", () => {
    const ui = files.filter((f) => !f.endsWith("manage-guards.test.ts"));

    it("'을(를)' 표기를 쓰지 않는다 — 받침에 맞는 조사 도우미(eulReul)를 쓴다", () => {
        const bad = ui.filter((f) => code(read(f)).includes("을(를)")).map(rel);
        expect(bad).toEqual([]);
    });

    it("합쇼체(…습니다/…합니다)를 쓰지 않는다 — 해요체로 통일 (공개 페이지 문구 예시만 예외)", () => {
        const allowed = ["불가합니다", "요청드립니다"];
        const hits: string[] = [];
        for (const f of ui) {
            code(read(f))
                .split("\n")
                .forEach((l, i) => {
                    const m = l.match(/[가-힣]+(습니다|입니다|됩니다|합니다|드립니다)/g);
                    if (m && !m.some((x) => allowed.some((a) => x.endsWith(a)))) hits.push(`${rel(f)}:${i + 1} ${l.trim().slice(0, 60)}`);
                });
        }
        expect(hits).toEqual([]);
    });

    it("이모지를 쓰지 않는다 — 선 아이콘(lucide)을 쓴다", () => {
        // ✓ ✕ ▲ ▼ › ⠿ ↗ 같은 기호는 아이콘이 아니므로 허용
        const emoji = /[\u{1F300}-\u{1FAFF}\u{2B50}\u{2705}\u{274C}\u{26A0}\u{2753}]/u;
        const bad = ui.filter((f) => emoji.test(code(read(f)))).map(rel);
        expect(bad).toEqual([]);
    });
});

describe("목록 화면 규칙", () => {
    const lists = ["crew", "instructors", "works", "studio"].map((a) => path.join(ROOT, a, "page.tsx"));

    it.each(lists.map((f) => [rel(f), f]))("%s — ManagedList와 빈 화면 안내를 쓴다", (_n, f) => {
        const s = read(f);
        expect(s).toContain("<ManagedList");
        expect(s).toContain("<EmptyState");
        expect(s).toContain('data-tour="list-trash"');
    });

    it.each(["instructors/[id]/DeleteInstructorButton.tsx", "crew/[id]/DeleteCrewButton.tsx", "works/[id]/DeleteWorkButton.tsx", "studio/[id]/DeleteSpaceButton.tsx"])(
        "%s — 삭제 직후 '되돌리기' 알림을 예약한다",
        (name) => {
            const s = read(path.join(ROOT, name));
            expect(s).toContain("flashToast(");
            expect(s).toContain("undo:");
            expect(s).toContain("휴지통으로 이동");
        },
    );
});
