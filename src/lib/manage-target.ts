import "server-only";
import type { getWriteClient } from "@/sanity/lib/writeClient";
import { isManagedDocumentId } from "./manage-document-id";
import { createManagedDocument } from "./manage-create-result";
import { commitManagedPatch, ManagedRefreshError, refreshManagedChange } from "./manage-patch-result";
import { reportError } from "./error-reporting";

type Client = ReturnType<typeof getWriteClient>;
type Doc = Record<string, unknown> & { _id: string; _type: string; _rev: string };

function isManagedDocument(value: unknown, id: string, type: string): value is Doc {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const doc = value as Record<string, unknown>;
    return ["_id", "_type", "_rev"].every((key) => Object.hasOwn(doc, key)) &&
        doc._id === id && doc._type === type && typeof doc._rev === "string" && !!doc._rev.trim();
}

/** 호출부에서 인증한 뒤, 업로드·쓰기보다 먼저 문서 ID와 종류를 확인한다. */
export async function requireManagedDocument(client: Client, id: string, type: string): Promise<Doc> {
    if (!isManagedDocumentId(id)) throw new Error("관리할 수 없는 항목 주소예요. 목록에서 다시 골라 주세요.");
    const doc = await client.getDocument<Record<string, unknown>>(id);
    if (!isManagedDocument(doc, id, type)) {
        throw new Error("이 관리 화면의 항목을 찾지 못했어요. 목록에서 다시 골라 주세요.");
    }
    return doc;
}

/** 휴지통 상태를 추측해 덮어쓰지 않는다. 정상적인 누락/null은 기존처럼 허용한다. */
export async function requireManagedTrashDocument(client: Client, id: string, type: string): Promise<Doc> {
    const doc = await requireManagedDocument(client, id, type);
    if ("trashed" in doc && (!Object.hasOwn(doc, "trashed") || doc.trashed != null && typeof doc.trashed !== "boolean")) {
        throw new Error("휴지통 상태를 확인하지 못했어요. Sanity Studio(/admin)에서 원본을 확인한 뒤 다시 시도해 주세요.");
    }
    return doc;
}

export function managedSlug(doc: Record<string, unknown>): string | undefined {
    const slug = (doc.slug as { current?: unknown } | null)?.current;
    return typeof slug === "string" ? slug : undefined;
}

/** 고정 ID의 종류가 다르면 거부하고, 최초 생성이 겹쳐도 덮어쓰지 않는다. */
export async function saveManagedSingleton(client: Client, type: "siteSettings" | "studioInfo", fields: Record<string, unknown>, validateExisting?: (existing: Doc) => void, onConfirmed?: () => void): Promise<void> {
    let existing: unknown;
    try { existing = await client.getDocument(type); }
    catch (error) {
        reportError("saveManagedSingleton:read", error);
        throw new Error("설정 문서를 불러오지 못해 저장하지 않았어요. 입력 내용을 따로 보관한 뒤 다시 시도해 주세요.");
    }
    // getDocument의 문서 없음 반환값은 undefined다. GROQ의 null 계약과 혼동하지 않는다.
    if (existing === undefined) {
        await createManagedDocument(client, { ...fields, _id: type, _type: type });
        refreshManagedChange(onConfirmed);
        return;
    }
    if (!isManagedDocument(existing, type, type)) {
        throw new Error("설정용 문서의 종류를 확인하지 못했어요. 개발자에게 알려 주세요.");
    }
    // 검증한 바로 그 스냅샷의 revision으로만 저장한다. 검사 후 재조회로 보호를 우회하지 않는다.
    validateExisting?.(existing);
    await commitManagedPatch(() => client.patch(type).ifRevisionId(existing._rev).set(fields).commit(), type, type, onConfirmed);
}

/** 폼에 전달할 저장 결과. 문구가 아니라 확인된 저장 후 갱신 오류의 종류로 구분한다. */
export function managedSaveFailure(error: unknown): { ok: false; error: string; committed?: true } {
    const failure = { ok: false as const, error: managedWriteError(error) };
    return error instanceof ManagedRefreshError ? { ...failure, committed: true } : failure;
}

export function managedWriteError(error: unknown): string {
    if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409) {
        return "확인하는 사이에 내용이 바뀌었어요. 새 탭에서 최신 내용을 확인한 뒤 다시 시도해 주세요.";
    }
    return error instanceof Error ? error.message : "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요.";
}
