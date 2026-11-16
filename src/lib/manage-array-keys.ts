import "server-only";
import { randomUUID } from "crypto";

/** 같은 서버 원본 배열에 있던 키는 접두사와 무관하게 유지한다. 새 임시·미지정 키만 발급한다. */
export function managedArrayKey(value: unknown, existing: readonly unknown[] = []): string {
    const stored = typeof value === "string" && value && existing.some((row) => row && typeof row === "object" && !Array.isArray(row) && Object.hasOwn(row, "_key") && (row as { _key?: unknown })._key === value);
    return typeof value === "string" && value && (stored || !value.startsWith("new-")) ? value : randomUUID().slice(0, 12);
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
