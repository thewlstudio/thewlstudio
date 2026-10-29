"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAuth } from "@/lib/manage-auth";
import { getWriteClient } from "@/sanity/lib/writeClient";
import { labelsEulReul } from "@/lib/josa";
import { managedWriteError, saveManagedSingleton } from "@/lib/manage-target";
import { externalHttpUrl } from "@/lib/content-urls";
import { SITE_SETTINGS_LINK_HOSTS, siteSettingsLinkUrl, siteSettingsPhone, type SiteSettingsLinkKey } from "@/lib/site-settings";
import { reportError } from "@/lib/error-reporting";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

type Rule = { id: string; label: string; kind: "text" | "phone"; max: number } | { id: SiteSettingsLinkKey; label: string; kind: "url"; max: number };

// 모든 항목은 필수 — 비워두면 화면이 예전 기본값으로 돌아가 혼동되므로 비우지 못하게 한다.
const RULES: Rule[] = [
    { id: "phone", label: "전화번호", kind: "phone", max: 30 },
    { id: "addressKo", label: "한글 주소", kind: "text", max: 200 },
    { id: "addressEn", label: "영문 주소", kind: "text", max: 300 },
    { id: "mapQuery", label: "지도 검색어", kind: "text", max: 200 },
    { id: "naverMapPlaceUrl", label: "네이버 지도 장소 주소", kind: "url", max: 1000 },
    { id: "naverReservationUrl", label: "네이버 예약 주소", kind: "url", max: 1000 },
    { id: "instagramUrl", label: "인스타그램 주소", kind: "url", max: 500 },
    { id: "blogUrl", label: "블로그 주소", kind: "url", max: 500 },
    { id: "homeHeadline", label: "홈페이지 소개 제목", kind: "text", max: 100 },
    { id: "homeIntro", label: "홈페이지 소개 본문", kind: "text", max: 2000 },
];

export async function saveSettings(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
    try {
        await requireAuth();
        const client = getWriteClient();

        const values: Record<string, string> = {};
        const missing: FieldError[] = [];
        for (const r of RULES) {
            const v = String(formData.get(r.id) ?? "").replace(/\r\n/g, "\n").trim();
            if (!v) missing.push({ id: r.id, label: r.label });
            values[r.id] = v;
        }
        if (missing.length > 0) {
            return { ok: false, error: `${labelsEulReul(missing)} 입력해 주세요.`, fields: missing };
        }

        for (const r of RULES) {
            const v = values[r.id];
            const bad = (msg: string): SaveResult => ({ ok: false, error: `${r.label}: ${msg}`, fields: [{ id: r.id, label: r.label }] });
            if (v.length > r.max) return bad(`너무 길어요. (${r.max}자 이내)`);
            // 지도 iframe 같은 코드는 받지 않는다
            if (/[<>]/.test(v)) return bad("글자와 주소만 입력해 주세요. < > 기호가 들어 있으면 저장되지 않아요.");
            if (r.kind === "phone" && !siteSettingsPhone(v)) return bad("숫자를 포함한 전화번호를 입력해 주세요. 줄바꿈은 쓸 수 없어요. (예: 0507-1331-7285)");
            if (r.kind === "url") {
                if (!externalHttpUrl(v)) {
                    return bad("올바른 주소가 아니에요. 브라우저 주소창의 주소를 복사해 붙여넣어 주세요.");
                }
                const u = new URL(v);
                if (u.protocol !== "https:") return bad("안전한 주소(https://…)만 쓸 수 있어요.");
                if (!siteSettingsLinkUrl(r.id, v)) return bad(`${SITE_SETTINGS_LINK_HOSTS[r.id].join(" 또는 ")} 주소만 쓸 수 있어요.`);
            }
        }

        await saveManagedSingleton(client, "siteSettings", values);

        updateTag("siteSettings");
        // 헤더(인스타그램)·스튜디오·클래스 링크는 루트 레이아웃에서 읽으므로 전체 경로를 새로 만든다
        revalidatePath("/", "layout");
        return { ok: true };
    } catch (err) {
        reportError("saveSettings", err);
        return { ok: false, error: managedWriteError(err) };
    }
}
