import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState";
import Rich from "./Rich";
import { Field, FieldErrorsProvider, Section } from "./FormParts";

const strip = (html: string) => html.replace(/ class="[^"]*"/g, "");

describe("Rich — **강조**", () => {
    it("굵게 바꾸고 나머지는 그대로 둔다", () => {
        expect(strip(renderToStaticMarkup(<Rich text="앞 **굵게** 뒤 **둘**" />))).toBe("앞 <strong>굵게</strong> 뒤 <strong>둘</strong>");
    });
    it("HTML은 이스케이프된다 (문구에 태그를 넣어도 실행되지 않음)", () => {
        expect(renderToStaticMarkup(<Rich text="<b>x</b>" />)).toContain("&lt;b&gt;");
    });
});

describe("EmptyState", () => {
    it("버튼이 있으면 링크를 그린다", () => {
        const html = renderToStaticMarkup(<EmptyState title="아직 없어요" body="설명" actionHref="/manage/crew/new" actionLabel="+ 만들기" />);
        expect(html).toContain('href="/manage/crew/new"');
        expect(html).toContain("+ 만들기");
    });
    it("쓰기 설정 전에는 버튼 없이 안내만 보여 준다", () => {
        expect(renderToStaticMarkup(<EmptyState title="t" body="b" />)).not.toContain("<a");
    });
});

describe("Field — 칸별 오류", () => {
    it("오류가 있으면 안내 문구와 접근성 연결(aria-invalid, aria-describedby)이 생긴다", () => {
        const html = renderToStaticMarkup(
            <FieldErrorsProvider value={{ name: "이름을 입력해 주세요." }}>
                <Field label="이름" htmlFor="name" required>
                    <input id="name" />
                </Field>
            </FieldErrorsProvider>,
        );
        expect(html).toContain('aria-invalid="true"');
        expect(html).toContain('aria-describedby="name-error"');
        expect(html).toContain('id="name-error"');
        expect(html).toContain("이름을 입력해 주세요.");
    });
    it("오류가 없으면 조용하다", () => {
        const html = renderToStaticMarkup(
            <Field label="이름" htmlFor="name" required>
                <input id="name" />
            </Field>,
        );
        expect(html).not.toContain("aria-invalid");
        expect(html).not.toContain('role="alert"');
    });
    it("필수 칸은 투어·검증이 찾을 수 있게 표시된다", () => {
        const html = renderToStaticMarkup(
            <Field label="이름" htmlFor="name" required>
                <input id="name" />
            </Field>,
        );
        expect(html).toContain('data-field-required="true"');
        expect(html).toContain('data-field-for="name"');
    });
});

describe("Section", () => {
    it("첫 단계는 화면 안내가 찾는 form-first 표시를 갖는다", () => {
        expect(renderToStaticMarkup(<Section step={1} title="기본 정보">x</Section>)).toContain('data-tour="form-first"');
        expect(renderToStaticMarkup(<Section step={2} title="사진" tour="form-photo">x</Section>)).toContain('data-tour="form-photo"');
    });
    it("help가 있으면 ? 버튼이 생기고, 힌트의 **강조**가 굵게 나온다", () => {
        const html = renderToStaticMarkup(
            <Section step={1} title="기본 정보" help="도움말" hint="**중요** 안내">
                x
            </Section>,
        );
        expect(html).toContain('aria-label="기본 정보 도움말"');
        expect(html).toContain("<strong");
    });
});
