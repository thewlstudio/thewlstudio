/** 화면 내부 식별값만 만든다. CMS 원본 키를 변경하거나 새 키를 저장하지 않는다. */
export function publicContentKey(key: unknown, index: number): string {
    return typeof key === "string" && key ? `source:${key}` : `index:${index}`;
}
