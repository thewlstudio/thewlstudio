import "server-only";
import { randomUUID } from "crypto";
import { LIMITS, isEditableType } from "./work-blocks";

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
/** 내용은 그대로 두고(저장 후 화면이 달라지지 않게) 줄바꿈 형식만 통일한다 */
const body = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").slice(0, max) : "");
const filled = (v: string) => v.trim().length > 0;
/** 클라이언트의 임시 키("new-…")나 빈 키는 새로 발급, 기존 키는 유지 */
const key = (v: unknown) => (typeof v === "string" && v && !v.startsWith("new-") ? v.slice(0, 40) : randomUUID().slice(0, 12));

function isHttpUrl(value: string): boolean {
    try {
        const u = new URL(value);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

function paragraphs(v: unknown): string[] {
    return list(v, LIMITS.items)
        .map((p) => body(p, LIMITS.text))
        .filter(filled);
}

/**
 * 클라이언트가 보낸 블록 JSON을 검증·정리해 저장용 배열로 만든다.
 * - 텍스트형 4종: 필드를 다시 만들고 빈 항목/빈 블록은 버린다.
 * - 그 밖의 종류(이미지·영상·자유서식·오디오): 클라이언트 값은 무시하고 기존 문서의 같은 _key 블록을 그대로 유지한다.
 * - 기존 문서의 보존 블록이 payload에서 빠져 있으면 오래된 화면일 수 있으므로 저장을 거부한다.
 */
export function sanitizeBlocks(payload: unknown, existing: Raw[]): { blocks: unknown[] } | { error: string } {
    const stale = { error: "상세 내용 정보를 읽지 못했거나 오래된 화면이에요. 화면을 새로고침한 뒤 다시 시도해 주세요." };
    if (!Array.isArray(payload)) return stale;
    if (payload.length > LIMITS.blocks) return { error: `블록은 최대 ${LIMITS.blocks}개까지 만들 수 있어요.` };

    const out: unknown[] = [];
    const kept = new Set<string>();
    for (const p of payload) {
        if (!isObj(p)) continue;
        const type = p._type;
        if (!isEditableType(type)) {
            const prev = existing.find((e) => e._key === p._key && e._type === type);
            if (prev) {
                out.push(prev);
                kept.add(String(prev._key));
            }
            continue;
        }
        const _key = key(p._key);
        switch (type) {
            case "descriptionBlock": {
                const paras = paragraphs(p.paragraphs);
                if (paras.length > 0) out.push({ _key, _type: type, paragraphs: paras });
                break;
            }
            case "signatureMessageBlock": {
                const paras = paragraphs(p.paragraphs);
                const signature = body(p.signature, LIMITS.line).trim();
                if (paras.length > 0 || signature) out.push({ _key, _type: type, paragraphs: paras, ...(signature ? { signature } : {}) });
                break;
            }
            case "tracklistBlock": {
                const tracks = list(p.tracks, LIMITS.items)
                    .filter(isObj)
                    .map((t) => ({ t, title: body(t.title, LIMITS.line).trim(), description: body(t.description, LIMITS.text) }))
                    .filter((x) => x.title || filled(x.description))
                    .map((x) => ({ _key: key(x.t._key), title: x.title, ...(filled(x.description) ? { description: x.description } : {}) }));
                if (tracks.length > 0) out.push({ _key, _type: type, tracks });
                break;
            }
            case "creditGridBlock": {
                const sections: unknown[] = [];
                for (const sec of list(p.sections, LIMITS.items).filter(isObj)) {
                    const items: unknown[] = [];
                    for (const it of list(sec.items, LIMITS.items).filter(isObj)) {
                        const role = body(it.role, LIMITS.line).trim();
                        const value = body(it.value, LIMITS.text);
                        const linkText = body(it.linkText, LIMITS.line).trim();
                        const linkUrl = body(it.linkUrl, 1000).trim();
                        if (linkUrl && !isHttpUrl(linkUrl)) {
                            return { error: `크레딧 링크 주소가 올바르지 않습니다: ${linkUrl.slice(0, 60)} — https://로 시작하는 주소를 넣어 주세요.` };
                        }
                        if (!role && !filled(value) && !linkText) continue;
                        items.push({
                            _key: key(it._key),
                            ...(role ? { role } : {}),
                            ...(filled(value) ? { value } : {}),
                            ...(linkText ? { linkText } : {}),
                            ...(linkUrl ? { linkUrl } : {}),
                        });
                    }
                    const title = body(sec.title, LIMITS.line).trim();
                    if (title || items.length > 0) sections.push({ _key: key(sec._key), ...(title ? { title } : {}), items });
                }
                if (sections.length > 0) out.push({ _key, _type: type, sections });
                break;
            }
        }
    }

    for (const e of existing) {
        if (!isEditableType(e._type) && !kept.has(String(e._key))) return stale;
    }
    return { blocks: out };
}
