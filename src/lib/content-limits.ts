/** 저장할 내용을 자르지 않고 기존 한도 초과 여부만 검사한다. */
export function contentTextLimit(value: unknown, max: number, label: string): string | null {
    if (typeof value !== "string") return null;
    return value.length > max ? `${label}: ${max.toLocaleString("ko-KR")}자 이내로 입력해 주세요. 내용은 저장하지 않았어요.` : null;
}

export function contentListLimit(value: unknown, max: number, label: string): string | null {
    return Array.isArray(value) && value.length > max ? `${label}: 항목은 최대 ${max}개까지 넣을 수 있어요. 내용은 저장하지 않았어요.` : null;
}
