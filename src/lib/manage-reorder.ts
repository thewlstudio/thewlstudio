import "server-only";
import type { getWriteClient } from "@/sanity/lib/writeClient";
import { isManagedDocumentId } from "./manage-document-id";
import { commitManagedOrder, refreshManagedOrder } from "./manage-order-result";

type Client = ReturnType<typeof getWriteClient>;
type Result = { ok: true } | { ok: false; error: string };
export type OrderRow = { _id: string; _rev: string; order?: number | null; group?: string };

const invalidRows = { ok: false, error: "목록의 문서 정보를 확인하지 못했어요. 화면을 새로고침한 뒤 다시 시도해 주세요." } as const;
function validRows(rows: unknown): rows is OrderRow[] {
    if (!Array.isArray(rows)) return false;
    const seen = new Set<string>();
    for (let index = 0; index < rows.length; index++) {
        if (!Object.hasOwn(rows, index)) return false;
        const row = rows[index];
        if (!row || typeof row !== "object" || Array.isArray(row) ||
            !Object.hasOwn(row, "_id") || !isManagedDocumentId(row._id) || seen.has(row._id) ||
            !Object.hasOwn(row, "_rev") || typeof row._rev !== "string" || !row._rev.trim()) return false;
        // 숫자의 중복·누락은 정리하되, 다른 자료형을 숫자로 추측해 덮어쓰지 않는다.
        if ("order" in row && (!Object.hasOwn(row, "order") || row.order != null && typeof row.order !== "number")) return false;
        seen.add(row._id);
    }
    return true;
}

function validIds(ids: unknown): ids is string[] {
    if (!Array.isArray(ids) || !ids.length) return false;
    const seen = new Set<string>();
    for (let index = 0; index < ids.length; index++) {
        const id = ids[index];
        if (!Object.hasOwn(ids, index) || !isManagedDocumentId(id) || seen.has(id)) return false;
        seen.add(id);
    }
    return true;
}

/** 조회한 같은 문서 버전으로 순서값을 정리한다. 중간에 다시 조회하지 않는다. */
async function commitOrder(client: Client, current: OrderRow[], ids: string[], grouped: boolean, onConfirmed?: () => void): Promise<Result> {
    if (!validRows(current)) return invalidRows;
    const byId = new Map(current.map((row) => [row._id, row]));
    if (ids.length !== current.length || new Set(ids).size !== ids.length || ids.some((id) => !byId.has(id))) {
        return { ok: false, error: "목록이 그 사이에 바뀌었어요. 화면을 새로고침한 뒤 다시 시도해 주세요." };
    }
    const groupOf = (row: OrderRow) => grouped ? row.group! : "";
    if (grouped && (current.some((row) => !Object.hasOwn(row, "group") || typeof row.group !== "string" || !row.group.trim()) || ids.some((id, index) => groupOf(byId.get(id)!) !== groupOf(current[index])))) {
        return { ok: false, error: "다른 종류 사이로는 옮길 수 없어요. 같은 종류 안에서 순서를 바꿔 주세요." };
    }
    const movedGroups = new Set(ids.filter((id, index) => id !== current[index]._id).map((id) => groupOf(byId.get(id)!)));

    const groups = new Map<string, OrderRow[]>();
    for (const row of current) {
        const group = groupOf(row);
        const list = groups.get(group) ?? [];
        list.push(row);
        groups.set(group, list);
    }
    const bases = new Map<string, number>();
    for (const [group, rows] of groups) {
        let minimum: number | undefined;
        for (const { order } of rows) {
            if (typeof order === "number" && Number.isSafeInteger(order) && (minimum === undefined || order < minimum)) minimum = order;
        }
        const base = minimum ?? 0;
        bases.set(group, base <= Number.MAX_SAFE_INTEGER - (rows.length - 1) ? base : 0);
    }
    const positions = new Map<string, number>();
    let tx = client.transaction();
    const changed: string[] = [];
    for (const id of ids) {
        const row = byId.get(id)!;
        const group = groupOf(row);
        // 다른 그룹의 중복·빈 순서값까지 이번 조작으로 바꾸지는 않는다.
        if (grouped && !movedGroups.has(group)) continue;
        const index = positions.get(group) ?? 0;
        const next = bases.get(group)! + index;
        positions.set(group, index + 1);
        if (row.order !== next) {
            tx = tx.patch(id, { ifRevisionID: row._rev, set: { order: next } });
            changed.push(id);
        }
    }
    if (changed.length) await commitManagedOrder(() => tx.commit(), changed);
    refreshManagedOrder(onConfirmed, changed.length > 0);
    return { ok: true };
}

/**
 * 목록에서 끌어서 정한 새 순서(ids)를 order 필드에 반영한다.
 * - 보내온 id들이 지금 목록(휴지통 제외)과 정확히 같은 항목이어야 한다. 다르면 화면이 오래된 것이므로 거부한다.
 * - 안전한 정수 범위에서 연속값을 매기며, 바뀐 항목만 한 트랜잭션으로 저장한다.
 * - 그룹 정렬은 바뀐 그룹만 정리하고 다른 그룹의 값은 그대로 둔다.
 */
export async function applyOrder(client: Client, groq: string, params: Record<string, unknown>, ids: string[], grouped = false, onConfirmed?: () => void): Promise<Result> {
    if (!validIds(ids)) {
        return { ok: false, error: "순서 정보를 읽지 못했어요. 화면을 새로고침한 뒤 다시 시도해 주세요." };
    }
    const current = await client.fetch<OrderRow[]>(groq, params);
    return commitOrder(client, current, ids, grouped, onConfirmed);
}

/** 같은 조회 결과로 한 칸 이동과 중복·누락 순서값 정리를 함께 저장한다. */
export async function moveOrder(client: Client, current: OrderRow[], id: string, direction: "up" | "down", onConfirmed?: () => void): Promise<Result> {
    if (!validRows(current)) return invalidRows;
    if (!isManagedDocumentId(id) || (direction !== "up" && direction !== "down")) return { ok: false, error: "옮길 항목과 방향을 확인하지 못했어요. 목록에서 다시 골라 주세요." };
    const index = current.findIndex((row) => row._id === id);
    if (index < 0) return { ok: false, error: "옮길 항목을 찾지 못했어요. 목록에서 다시 골라 주세요." };
    const target = index + (direction === "up" ? -1 : 1);
    if (target < 0 || target >= current.length) return { ok: false, error: "더 옮길 곳이 없어요." };
    const ids = current.map((row) => row._id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return commitOrder(client, current, ids, false, onConfirmed);
}
