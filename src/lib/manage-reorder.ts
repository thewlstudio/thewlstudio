import "server-only";
import type { getWriteClient } from "@/sanity/lib/writeClient";

type Client = ReturnType<typeof getWriteClient>;
type Result = { ok: true } | { ok: false; error: string };

/**
 * 목록에서 끌어서 정한 새 순서(ids)를 order 필드에 반영한다.
 * - 보내온 id들이 지금 목록(휴지통 제외)과 정확히 같은 항목이어야 한다. 다르면 화면이 오래된 것이므로 거부한다.
 * - 순서값은 지금 목록의 가장 작은 순서값부터 차례로 다시 매긴다(예: 1,2,3…). 바뀐 항목만 한 번에(트랜잭션) 저장한다.
 */
export async function applyOrder(client: Client, groq: string, params: Record<string, unknown>, ids: string[]): Promise<Result> {
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((x) => typeof x !== "string")) {
        return { ok: false, error: "순서 정보를 읽지 못했어요. 화면을 새로고침한 뒤 다시 시도해 주세요." };
    }
    const current = await client.fetch<Array<{ _id: string; order?: number }>>(groq, params);
    const currentIds = new Set(current.map((c) => c._id));
    if (ids.length !== current.length || new Set(ids).size !== ids.length || ids.some((x) => !currentIds.has(x))) {
        return { ok: false, error: "목록이 그 사이에 바뀌었어요. 화면을 새로고침한 뒤 다시 시도해 주세요." };
    }
    const prevOrder = new Map(current.map((c) => [c._id, c.order]));
    // 기존 순서값의 시작(보통 0 또는 1)을 유지해서, 순서를 바꾸지 않은 항목의 값은 건드리지 않는다
    const defined = current.map((c) => c.order).filter((o): o is number => typeof o === "number");
    const base = defined.length > 0 ? Math.min(...defined) : 0;
    let tx = client.transaction();
    let changed = 0;
    ids.forEach((id, index) => {
        const next = base + index;
        if (prevOrder.get(id) !== next) {
            tx = tx.patch(id, { set: { order: next } });
            changed++;
        }
    });
    if (changed > 0) await tx.commit();
    return { ok: true };
}
