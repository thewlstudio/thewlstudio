import "server-only";
import { randomUUID } from "crypto";

/** 기존 식별 값은 자르거나 정규화하지 않고 유지한다. 임시·미지정 값만 서버가 발급한다. */
export function managedArrayKey(value: unknown): string {
    return typeof value === "string" && value && !value.startsWith("new-") ? value : randomUUID().slice(0, 12);
}

/** 키는 같은 배열 안에서만 유일해야 한다. 문자열 목록이나 미지정 키는 검사 대상이 아니다. */
export function arrayKeyError(value: unknown, label: string): string | null {
    if (!Array.isArray(value)) return null;
    const seen = new Set<string>();
    for (const item of value) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const key = (item as Record<string, unknown>)._key;
        if (typeof key !== "string" || !key) continue;
        if (seen.has(key)) return `${label}: 항목 식별 값이 중복되어 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 화면을 새로고침해 주세요.`;
        seen.add(key);
    }
    return null;
}
