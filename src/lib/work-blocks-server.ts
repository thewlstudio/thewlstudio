import "server-only";
import { LIMITS, isEditableType } from "./work-blocks";
import { externalHttpUrl, youTubeVideoId } from "./content-urls";
import { contentListLimit, contentTextLimit } from "./content-limits";
import { arrayKeyError, managedArrayKey as key } from "./manage-array-keys";
import { workBlocksShapeError } from "./body-content-shape";

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** 내용은 그대로 두고(저장 후 화면이 달라지지 않게) 줄바꿈 형식만 통일한다 */
const body = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n") : "");
const filled = (v: string) => v.trim().length > 0;

function paragraphs(v: unknown): string[] {
    return list(v)
        .map((p) => body(p))
        .filter(filled);
}

/** 모든 블록의 한도 검사를 업로드 전에 끝낸다. 보존 블록 원본에는 편집 한도를 적용하지 않는다. */
function blockLimitError(payload: unknown[]): string | null {
    const keyError = arrayKeyError(payload, "상세 페이지 블록");
    if (keyError) return keyError;
    for (const [index, p] of payload.entries()) {
        if (!isObj(p)) continue;
        const label = `블록 ${index + 1}`;
        const text = (v: unknown, max: number, field: string) => contentTextLimit(body(v), max, `${label} ${field}`);
        const count = (v: unknown, field: string) => contentListLimit(v, LIMITS.items, `${label} ${field}`) || arrayKeyError(v, `${label} ${field}`);
        let error: string | null = null;
        switch (p._type) {
            case "descriptionBlock":
            case "signatureMessageBlock":
                error = count(p.paragraphs, "문단");
                for (const paragraph of list(p.paragraphs)) error ||= text(paragraph, LIMITS.text, "문단");
                if (p._type === "signatureMessageBlock") error ||= text(p.signature, LIMITS.line, "서명");
                break;
            case "tracklistBlock":
                error = count(p.tracks, "트랙");
                for (const track of list(p.tracks).filter(isObj)) error ||= text(track.title, LIMITS.line, "트랙 제목") || text(track.description, LIMITS.text, "트랙 설명");
                break;
            case "imageBlock": error = text(p.caption, LIMITS.line, "사진 설명"); break;
            case "videoEmbedBlock": error = text(p.url, 1000, "유튜브 주소"); break;
            case "audioBlock": error = text(p.title, LIMITS.line, "오디오 제목") || text(p.artist, LIMITS.line, "아티스트"); break;
            case "creditGridBlock":
                error = count(p.sections, "크레딧 묶음");
                for (const section of list(p.sections).filter(isObj)) {
                    error ||= text(section.title, LIMITS.line, "크레딧 제목") || count(section.items, "크레딧 항목");
                    for (const item of list(section.items).filter(isObj)) {
                        error ||= text(item.role, LIMITS.line, "역할") || text(item.value, LIMITS.text, "크레딧 내용") || text(item.linkText, LIMITS.line, "링크 이름") || text(item.linkUrl, 1000, "링크 주소");
                    }
                }
                break;
        }
        if (error) return error;
    }
    return null;
}

/**
 * 클라이언트가 보낸 블록 JSON을 검증·정리해 저장용 배열로 만든다.
 * - 편집 가능한 종류(텍스트형 4종·이미지·영상·오디오 제목/아티스트): 필드를 다시 만들고 빈 항목/빈 블록은 버린다.
 *   이미지는 새 파일이 있으면 교체, 없으면 기존 문서의 같은 _key 블록 이미지를 유지한다.
 *   오디오 파일은 기존 문서의 같은 _key 블록에서 가져온다.
 * - 그 밖의 종류(자유서식 등): 클라이언트 값은 무시하고 기존 문서의 같은 _key 블록을 그대로 유지한다.
 * - 기존 문서의 보존 블록이 payload에서 빠져 있으면 오래된 화면일 수 있으므로 저장을 거부한다.
 * - 편집 내용의 길이·항목 수 한도를 넘으면 잘라 저장하지 않고 오류를 반환한다.
 */
export async function sanitizeBlocks(
    payload: unknown,
    existing: Raw[],
    /** 이미지 블록의 새 사진을 올려 image 값을 돌려준다 (클라이언트가 보낸 블록 _key 기준) */
    uploadFor: (clientKey: string) => Promise<Raw | null>,
): Promise<{ blocks: unknown[] } | { error: string }> {
    const stale = { error: "상세 내용 정보를 읽지 못했거나 오래된 화면이에요. 화면을 새로고침한 뒤 다시 시도해 주세요." };
    if (!Array.isArray(payload)) return stale;
    if (payload.length > LIMITS.blocks) return { error: `블록은 최대 ${LIMITS.blocks}개까지 만들 수 있어요.` };
    const shapeError = workBlocksShapeError(payload, existing);
    if (shapeError) return { error: shapeError };
    const limitError = blockLimitError(payload);
    if (limitError) return { error: limitError };

    const out: unknown[] = [];
    for (const p of payload) {
        if (!isObj(p)) continue;
        const type = p._type;
        if (!isEditableType(type)) {
            const prev = existing.find((e) => e._key === p._key && e._type === type);
            if (prev) {
                out.push(prev);
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
                const signature = body(p.signature).trim();
                if (paras.length > 0 || signature) out.push({ _key, _type: type, paragraphs: paras, ...(signature ? { signature } : {}) });
                break;
            }
            case "tracklistBlock": {
                const tracks = list(p.tracks)
                    .filter(isObj)
                    .map((t) => ({ t, title: body(t.title).trim(), description: body(t.description) }))
                    .filter((x) => x.title || filled(x.description))
                    .map((x) => ({ _key: key(x.t._key), title: x.title, ...(filled(x.description) ? { description: x.description } : {}) }));
                if (tracks.length > 0) out.push({ _key, _type: type, tracks });
                break;
            }
            case "imageBlock": {
                const clientKey = typeof p._key === "string" ? p._key : "";
                const prev = existing.find((e) => e._key === clientKey && e._type === "imageBlock");
                const uploaded = clientKey ? await uploadFor(clientKey) : null;
                const image = uploaded ?? (prev && isObj(prev.image) ? prev.image : null);
                if (!image) break; // 사진이 없는 이미지 블록은 의미가 없어 버린다
                const caption = body(p.caption).trim();
                out.push({ _key, _type: type, image, ...(caption ? { caption } : {}) });
                break;
            }
            case "videoEmbedBlock": {
                const url = body(p.url).trim();
                if (!url) break;
                if (!youTubeVideoId(url)) {
                    return { error: `유튜브 주소가 올바르지 않아요: ${url.slice(0, 60)} — 유튜브 영상 화면의 주소창에서 주소를 복사해 붙여넣어 주세요.` };
                }
                out.push({ _key, _type: type, url });
                break;
            }
            case "audioBlock": {
                // 파일 업로드는 /admin 전용 — 기존 문서의 같은 _key 블록이 있어야 하고, 파일은 그대로 유지한다
                const prev = existing.find((e) => e._key === p._key && e._type === "audioBlock");
                if (!prev) break;
                const title = body(p.title).trim();
                const artist = body(p.artist).trim();
                if (!title || !artist) return { error: "오디오 블록은 제목과 아티스트가 모두 필요해요." };
                out.push({ ...prev, title, artist });
                break;
            }
            case "creditGridBlock": {
                const sections: unknown[] = [];
                for (const sec of list(p.sections).filter(isObj)) {
                    const items: unknown[] = [];
                    for (const it of list(sec.items).filter(isObj)) {
                        const role = body(it.role).trim();
                        const value = body(it.value);
                        const linkText = body(it.linkText).trim();
                        const linkUrl = body(it.linkUrl).trim();
                        if (linkUrl && !externalHttpUrl(linkUrl)) {
                            return { error: `크레딧 링크 주소가 올바르지 않아요: ${linkUrl.slice(0, 60)} — 브라우저 주소창의 주소를 복사해 붙여넣어 주세요.` };
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
                    const title = body(sec.title).trim();
                    if (title || items.length > 0) sections.push({ _key: key(sec._key), ...(title ? { title } : {}), items });
                }
                if (sections.length > 0) out.push({ _key, _type: type, sections });
                break;
            }
        }
    }

    return { blocks: out };
}
