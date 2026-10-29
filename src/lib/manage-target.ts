import "server-only";
import type { getWriteClient } from "@/sanity/lib/writeClient";
import { isManagedDocumentId } from "./manage-document-id";

type Client = ReturnType<typeof getWriteClient>;
type Doc = Record<string, unknown> & { _id: string; _type: string; _rev: string };

/** 호출부에서 인증한 뒤, 업로드·쓰기보다 먼저 문서 ID와 종류를 확인한다. */
export async function requireManagedDocument(client: Client, id: string, type: string): Promise<Doc> {
    if (!isManagedDocumentId(id)) throw new Error("관리할 수 없는 항목 주소예요. 목록에서 다시 골라 주세요.");
    const doc = await client.getDocument<Record<string, unknown>>(id);
    if (!doc || doc._id !== id || doc._type !== type || typeof doc._rev !== "string" || !doc._rev) {
        throw new Error("이 관리 화면의 항목을 찾지 못했어요. 목록에서 다시 골라 주세요.");
    }
    return doc;
}

export function managedSlug(doc: Record<string, unknown>): string | undefined {
    const slug = (doc.slug as { current?: unknown } | null)?.current;
    return typeof slug === "string" ? slug : undefined;
}

/** 고정 ID의 종류가 다르면 거부하고, 최초 생성이 겹쳐도 덮어쓰지 않는다. */
export async function saveManagedSingleton(client: Client, type: "siteSettings" | "studioInfo", fields: Record<string, unknown>): Promise<void> {
    const existing = await client.getDocument(type);
    if (!existing) {
        await client.create({ ...fields, _id: type, _type: type });
        return;
    }
    if (existing._id !== type || existing._type !== type || typeof existing._rev !== "string" || !existing._rev) {
        throw new Error("설정용 문서의 종류를 확인하지 못했어요. 개발자에게 알려 주세요.");
    }
    await client.patch(type).ifRevisionId(existing._rev).set(fields).commit();
}

export function managedWriteError(error: unknown): string {
    if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409) {
        return "확인하는 사이에 내용이 바뀌었어요. 새 탭에서 최신 내용을 확인한 뒤 다시 시도해 주세요.";
    }
    return error instanceof Error ? error.message : "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요.";
}
