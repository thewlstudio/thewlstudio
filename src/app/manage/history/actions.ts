"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAuth } from "@/lib/manage-auth";
import { buildRestoredDoc, docAt, HISTORY_AREAS, isHistoryArea } from "@/lib/manage-history";
import { getWriteClient } from "@/sanity/lib/writeClient";

type Result = { ok: true } | { ok: false; error: string };

/**
 * 문서를 지정한 저장 시점의 내용으로 되돌린다.
 * 지금의 휴지통 상태·순서는 그대로 두고 내용만 되돌리며, 되돌리기 직전 상태는 이력에 남는다.
 */
export async function restoreRevision(area: string, documentId: string, time: string): Promise<Result> {
    try {
        await requireAuth();
        if (!isHistoryArea(area)) return { ok: false, error: "되돌릴 수 없는 항목이에요." };
        const cfg = HISTORY_AREAS[area];
        if (cfg.fixedId && cfg.fixedId !== documentId) return { ok: false, error: "항목을 찾지 못했어요. 목록에서 다시 골라 주세요." };
        if (!documentId || !time || Number.isNaN(Date.parse(time))) return { ok: false, error: "되돌릴 시점을 확인하지 못했어요. 이력 화면에서 다시 골라 주세요." };

        const client = getWriteClient();
        const [old, current] = await Promise.all([docAt(client, documentId, time), client.getDocument(documentId)]);
        if (!old || old._type !== cfg.type) return { ok: false, error: "그 시점의 내용을 찾지 못했어요. 이력 화면에서 다시 골라 주세요." };

        const restored = buildRestoredDoc(old, (current as Record<string, unknown> | undefined) ?? null);
        await client.createOrReplace(restored as { _id: string; _type: string });

        updateTag(cfg.tag);
        cfg.paths.forEach((p) => revalidatePath(p, p === "/" ? "layout" : "page"));
        const slug = (restored.slug as { current?: string } | undefined)?.current;
        if (slug && cfg.slugPath) revalidatePath(cfg.slugPath(slug));
        return { ok: true };
    } catch (err) {
        console.error("[restoreRevision]", err);
        return { ok: false, error: err instanceof Error ? err.message : "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요. 계속되면 개발자에게 알려 주세요." };
    }
}
