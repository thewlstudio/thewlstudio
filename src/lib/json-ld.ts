/** JSON을 script 요소 안에 넣을 때 CMS 문자열이 </script>로 태그를 닫지 못하게 한다. */
export function serializeJsonLd(value: Record<string, unknown>): string {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** 표시용 날짜는 그대로 두고, 구조화 데이터에만 유효한 ISO 날짜를 전달한다. */
export function jsonLdDate(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const raw = value.trim();
    const match = /^(\d{4})\. (\d{2})\. (\d{2})\.$/.exec(raw);
    const iso = match ? `${match[1]}-${match[2]}-${match[3]}` : raw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
    const parsed = new Date(`${iso}T00:00:00.000Z`);
    // Date가 2월 30일 등을 다음 달로 넘겨 해석해도 잘못된 날짜는 공개하지 않는다.
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : undefined;
}
