import "server-only";
import type { getWriteClient } from "@/sanity/lib/writeClient";
import { isManagedDocumentId } from "./manage-document-id";

export const UNKNOWN_CREATE_RESULT = "추가 요청의 결과를 확인하지 못했어요. 이미 추가됐을 수 있으니 다시 누르기 전에 새 탭에서 관리 목록을 확인해 주세요.";
const unknownResult = () => new Error(UNKNOWN_CREATE_RESULT);

/** 한 번만 호출하며 자동 재시도·교체·삭제하지 않는다. 응답이 불명확하면 생성 여부를 추측하지 않는다. */
export async function createManagedDocument(client: ReturnType<typeof getWriteClient>, fields: Record<string, unknown> & { _type: string }): Promise<string> {
    let result: unknown;
    try { result = await client.create(fields); }
    catch (error) {
        if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409) throw Object.assign(new Error("문서 생성 충돌"), { statusCode: 409 });
        throw unknownResult();
    }
    if (!result || typeof result !== "object" || Array.isArray(result)) throw unknownResult();
    const row = result as Record<string, unknown>;
    if (!["_id", "_type", "_rev"].every((key) => Object.hasOwn(row, key)) || typeof row._id !== "string" || !isManagedDocumentId(row._id) || row._type !== fields._type || typeof row._rev !== "string" || !row._rev.trim() || typeof fields._id === "string" && row._id !== fields._id) throw unknownResult();
    return row._id;
}

export const CREATED_REFRESH_FAILED = "추가는 완료됐지만 화면을 갱신하지 못했어요. 다시 추가하지 말고 새 탭에서 관리 목록을 확인해 주세요.";
