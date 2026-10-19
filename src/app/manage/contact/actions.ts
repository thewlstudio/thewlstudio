"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAuth } from "@/lib/manage-auth";
import { getWriteClient } from "@/sanity/lib/writeClient";

export type FieldError = { id: string; label: string };
export type SaveResult = { ok: true } | { ok: false; error: string; fields?: FieldError[] };

const SETTINGS_ID = "siteSettings";

type Rule = { id: string; label: string; kind: "text" | "phone" | "url"; hosts?: string[]; max: number };

// 모든 항목은 필수 — 비워두면 화면이 예전 기본값으로 돌아가 혼동되므로 비우지 못하게 한다.
const RULES: Rule[] = [
    { id: "phone", label: "전화번호", kind: "phone", max: 30 },
    { id: "addressKo", label: "한글 주소", kind: "text", max: 200 },
    { id: "addressEn", label: "영문 주소", kind: "text", max: 300 },
    { id: "mapQuery", label: "지도 검색어", kind: "text", max: 200 },
    { id: "naverMapPlaceUrl", label: "네이버 지도 장소 주소", kind: "url", hosts: ["naver.com", "naver.me"], max: 1000 },
    { id: "naverReservationUrl", label: "네이버 예약 주소", kind: "url", hosts: ["naver.com", "naver.me"], max: 1000 },
    { id: "instagramUrl", label: "인스타그램 주소", kind: "url", hosts: ["instagram.com"], max: 500 },
    { id: "blogUrl", label: "블로그 주소", kind: "url", max: 500 },
    { id: "homeHeadline", label: "홈페이지 소개 제목", kind: "text", max: 100 },
    { id: "homeIntro", label: "홈페이지 소개 본문", kind: "text", max: 2000 },
];

function hostMatches(hostname: string, hosts: string[]) {
    const h = hostname.toLowerCase();
    return hosts.some((d) => h === d || h.endsWith(`.${d}`));
}

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
            return { ok: false, error: `${missing.map((m) => m.label).join(", ")}을(를) 입력해 주세요.`, fields: missing };
        }

        for (const r of RULES) {
            const v = values[r.id];
            const bad = (msg: string): SaveResult => ({ ok: false, error: `${r.label}: ${msg}`, fields: [{ id: r.id, label: r.label }] });
            if (v.length > r.max) return bad(`너무 깁니다. (${r.max}자 이내)`);
            // 지도 iframe 같은 코드는 받지 않는다
            if (/[<>]/.test(v)) return bad("태그(<, >)는 넣을 수 없어요. 주소나 글자만 입력해 주세요.");
            if (r.kind === "phone" && !/^[0-9+\-\s()]{5,30}$/.test(v)) return bad("숫자와 하이픈(-)으로만 입력해 주세요. (예: 0507-1331-7285)");
            if (r.kind === "url") {
                let u: URL;
                try {
                    u = new URL(v);
                } catch {
                    return bad("올바른 주소가 아닙니다. https://로 시작하는 주소를 넣어 주세요.");
                }
                if (u.protocol !== "https:") return bad("https://로 시작하는 주소만 쓸 수 있어요.");
                if (r.hosts && !hostMatches(u.hostname, r.hosts)) return bad(`${r.hosts.join(" 또는 ")} 주소만 쓸 수 있어요.`);
            }
        }

        await client.transaction().createIfNotExists({ _id: SETTINGS_ID, _type: "siteSettings" }).patch(SETTINGS_ID, { set: values }).commit();

        updateTag("siteSettings");
        // 헤더(인스타그램)·스튜디오·클래스 링크는 루트 레이아웃에서 읽으므로 전체 경로를 새로 만든다
        revalidatePath("/", "layout");
        return { ok: true };
    } catch (err) {
        console.error("[saveSettings]", err);
        return { ok: false, error: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다." };
    }
}
