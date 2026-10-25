import { describe, expect, it } from "vitest";
import { eulReul, labelsEulReul } from "./josa";

describe("eulReul — 받침에 맞는 을/를", () => {
    it.each([
        ["영문 이름", "을"],
        ["한글 이름", "을"],
        ["직책/역할", "을"],
        ["주소(영문)", "을"],
        ["앨범(작품) 제목", "을"],
        ["아티스트", "를"],
        ["이름", "을"],
        ["비밀번호", "를"],
        ["전화번호", "를"],
        ["회원권 1", "을"], // 숫자는 건너뛰고 마지막 한글('권')로 판단
    ])("%s → %s", (text, expected) => {
        expect(eulReul(text)).toBe(expected);
    });

    it("한글이 없으면(영문 이름) ' 항목을'을 붙여 자연스럽게 읽히게 한다", () => {
        expect(eulReul("UNDO TEST")).toBe(" 항목을");
    });
});

describe("labelsEulReul", () => {
    it("여러 항목을 쉼표로 잇고 마지막 항목에 맞는 조사를 붙인다", () => {
        expect(labelsEulReul([{ label: "영문 이름" }, { label: "직책" }])).toBe("영문 이름, 직책을");
        expect(labelsEulReul([{ label: "아티스트" }])).toBe("아티스트를");
    });
});
