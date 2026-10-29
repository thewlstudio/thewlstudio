"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAuth } from "@/lib/manage-auth";
import { buildRestorePatch, docAt, HISTORY_AREAS, isHistoryArea, isHistoryDocument, isHistoryDocumentId } from "@/lib/manage-history";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { reportError } from "@/lib/error-reporting";

type Result = { ok: true } | { ok: false; error: string };

/**
 * 문서를 지정한 저장 시점의 내용으로 되돌린다.
 * 지금의 휴지통 상태·순서는 그대로 두고 내용만 되돌리며, 되돌리기 직전 상태는 이력에 남는다.
 */
export async function restoreRevision(area: string, documentId: string, time: string, expectedRevision: string): Promise<Result> {
    try {
        await requireAuth();
        if (!isHistoryArea(area)) return { ok: false, error: "되돌릴 수 없는 항목이에요." };
        const cfg = HISTORY_AREAS[area];
        if (cfg.fixedId && cfg.fixedId !== documentId) return { ok: false, error: "항목을 찾지 못했어요. 목록에서 다시 골라 주세요." };
        if (!isHistoryDocumentId(documentId) || typeof time !== "string" || !time || !Number.isFinite(Date.parse(time))) return { ok: false, error: "되돌릴 시점을 확인하지 못했어요. 이력 화면에서 다시 골라 주세요." };
        if (typeof expectedRevision !== "string" || !expectedRevision) return { ok: false, error: "지금 내용을 확인하지 못했어요. 이력 화면을 새로고침한 뒤 다시 골라 주세요." };

        const client = getWriteClient();
        const [old, current] = await Promise.all([docAt(client, documentId, time), client.getDocument(documentId)]);
        if (!isHistoryDocument(old, documentId, cfg.type)) return { ok: false, error: "그 시점의 내용을 찾지 못했어요. 이력 화면에서 다시 골라 주세요." };
        if (!isHistoryDocument(current, documentId, cfg.type)) return { ok: false, error: "지금 항목을 찾지 못했어요. 목록을 새로고침해 확인해 주세요." };
        if (current._rev !== expectedRevision) return { ok: false, error: "확인하는 사이에 내용이 바뀌었어요. 이력 화면을 새로고침한 뒤 다시 확인해 주세요." };

        const changes = buildRestorePatch(old, current);
        let patch = client.patch(documentId).ifRevisionId(expectedRevision).set(changes.set);
        if (changes.unset.length) patch = patch.unset(changes.unset);
        await patch.commit();

        updateTag(cfg.tag);
        const paths = new Set([...cfg.paths, cfg.back(documentId), `/manage/history/${area}/${documentId}`]);
        for (const doc of [old, current]) {
            const slug = (doc.slug as { current?: string } | undefined)?.current;
            if (typeof slug === "string" && slug && cfg.slugPath) paths.add(cfg.slugPath(slug));
        }
        paths.forEach((path) => path === "/" ? revalidatePath(path, "layout") : revalidatePath(path));
        return { ok: true };
    } catch (err) {
        reportError("restoreRevision", err);
        if (err && typeof err === "object" && "statusCode" in err && err.statusCode === 409) {
            return { ok: false, error: "확인하는 사이에 내용이 바뀌었어요. 이력 화면을 새로고침한 뒤 다시 확인해 주세요." };
        }
        if (err instanceof Error && err.message.includes("인증이 필요")) return { ok: false, error: err.message };
        return { ok: false, error: "복원 결과를 확인하지 못했어요. 화면을 새로고침해 확인한 뒤 다시 시도해 주세요." };
    }
}
