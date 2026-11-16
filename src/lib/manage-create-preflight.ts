import "server-only";

/** count()가 읽히지 않았다는 사실을 "중복 없음"으로 바꾸지 않는다. */
export function managedSlugAvailabilityIssue(value: unknown) {
    const fields = [{ id: "slug", label: "주소(영문)" }];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return {
        error: "주소 중복 확인 결과를 읽지 못해 추가하지 않았어요. 입력 내용을 따로 보관한 뒤 다시 시도해 주세요.", fields,
    };
    return value > 0 ? { error: "이미 쓰고 있는 주소예요. 다른 주소를 입력해 주세요.", fields } : null;
}

/** 원본을 재정렬하지 않는다. .order 조회의 null은 공개 정렬과 같은 기본값 0이다. */
export function nextManagedOrder(value: unknown): number {
    const invalid = () => new Error("기존 목록의 표시 순서를 확인하지 못해 추가하지 않았어요. 입력을 따로 보관한 뒤 /admin에서 확인해 주세요.");
    if (!Array.isArray(value)) throw invalid();
    if (!value.length) return 0;
    let max = -Infinity;
    for (const item of value) {
        const order = item === null ? 0 : item;
        if (typeof order !== "number" || !Number.isFinite(order) || Math.abs(order) > Number.MAX_SAFE_INTEGER) throw invalid();
        max = Math.max(max, order);
    }
    // 예전 소수 순서값도 유지한다. 새 값만 그보다 큰 안전한 정수로 만든다.
    const next = Math.floor(max) + 1;
    if (!Number.isSafeInteger(next) || next <= max) throw invalid();
    return next;
}
