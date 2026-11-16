import "server-only";

type Raw = Record<string, unknown>;
const object = (value: unknown): value is Raw => !!value && typeof value === "object" && !Array.isArray(value);
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
// 재작성하는 필드만 소유한다. 사진은 교체하지 않는 한 원본 객체 전체를 보존한다.
const groups = {
    prices: { label: "가격", fields: ["_key", "label", "value", "unit"] },
    services: { label: "서비스", fields: ["_key", "title", "price", "priceUnit", "points"] },
    equipment: { label: "장비", fields: ["_key", "title", "items"] },
    memberships: { label: "멤버십", fields: ["_key", "num", "label", "sub", "price"] },
} as const;

export class StudioArrayFieldsError extends Error {
    readonly fields: { id: string; label: string }[];
    constructor(id: string, label: string) {
        super(`${label}: 이 편집기에서 다루지 않는 원본 정보가 있어 저장하지 않았어요. 입력을 따로 보관한 뒤 /admin에서 확인해 주세요.`);
        this.fields = [{ id, label }];
    }
}

/** 서버 원본만 검사한다. 추가 값을 임의로 병합하거나 클라이언트 확장 필드를 신뢰하지 않는다. */
export function assertStudioArrayFields(kind: "space" | "info", submitted: Raw, existing: Raw): void {
    const names = kind === "space" ? ["prices"] as const : ["services", "equipment", "memberships"] as const;
    for (const name of names) {
        const group = groups[name];
        for (const source of list(existing[name])) {
            if (!object(source)) continue;
            const keyed = Object.hasOwn(source, "_key") && typeof source._key === "string" && !!source._key;
            // 유효한 원본 키가 전체 제출 목록에서 빠졌을 때만 기존 명시적 삭제 계약으로 본다.
            if (keyed && !list(submitted[name]).some((item) => object(item) && item._key === source._key)) continue;
            if (Object.keys(source).some((field) => !(group.fields as readonly string[]).includes(field))) {
                throw new StudioArrayFieldsError(name, group.label);
            }
        }
    }
}
