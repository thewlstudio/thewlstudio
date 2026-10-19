/** 마지막 한글 글자의 받침에 맞춰 을/를을 고른다 (예: "영문 이름" → 을, "아티스트" → 를). 한글이 없으면 "을(를)". */
export function eulReul(text: string): string {
    const last = [...text].reverse().find((c) => c >= "가" && c <= "힣");
    if (!last) return "을(를)";
    return (last.charCodeAt(0) - 0xac00) % 28 !== 0 ? "을" : "를";
}

/** 항목 이름 목록 뒤에 을/를을 붙인다 (예: [영문 이름, 직책] → "영문 이름, 직책을") */
export function labelsEulReul(items: { label: string }[]): string {
    const text = items.map((m) => m.label).join(", ");
    return text + eulReul(text);
}
