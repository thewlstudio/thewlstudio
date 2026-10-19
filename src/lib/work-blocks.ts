/**
 * 작업물 상세 페이지 콘텐츠 블록의 공통 모델. 편집 화면(클라이언트)과 저장(서버)이 같은 정의를 쓴다.
 * 블록 종류는 sanity/schemaTypes/workType.ts, 화면 표시는 works/[slug]/WorkDetailClient.tsx와 맞춰져 있다.
 * 편집 대상은 텍스트형 4종 + 이미지·영상 + 오디오(제목·아티스트만, 파일 업로드는 /admin). 자유서식은 "보존 블록"으로 두고 순서만 바꿀 수 있다.
 */
export const BLOCK_META = {
    descriptionBlock: { label: "설명" },
    creditGridBlock: { label: "크레딧" },
    tracklistBlock: { label: "트랙리스트" },
    signatureMessageBlock: { label: "인사말" },
    imageBlock: { label: "이미지" },
    videoEmbedBlock: { label: "유튜브 영상" },
    audioBlock: { label: "오디오" },
} as const;

export type EditableType = keyof typeof BLOCK_META;
export const EDITABLE_TYPES = Object.keys(BLOCK_META) as EditableType[];
/** 새로 추가할 수 있는 종류 — 오디오는 파일 업로드가 필요해 /admin에서만 새로 만든다 */
export const ADDABLE_TYPES = EDITABLE_TYPES.filter((t) => t !== "audioBlock");
export function isEditableType(t: unknown): t is EditableType {
    return typeof t === "string" && t in BLOCK_META;
}

/** 보존 블록의 화면 표시용 이름 (3차에서 편집 지원 예정) */
export const PRESERVED_LABELS: Record<string, string> = {
    freeformTextBlock: "자유 서식",
};

export const LIMITS = { blocks: 30, items: 100, text: 10000, line: 300 } as const;

export type Para = { key: string; text: string };
export type CreditItem = { key: string; role: string; value: string; linkText: string; linkUrl: string };
export type CreditSection = { key: string; title: string; items: CreditItem[] };
export type Track = { key: string; title: string; description: string };

export type BlockState =
    | { key: string; type: "descriptionBlock"; paragraphs: Para[] }
    | { key: string; type: "signatureMessageBlock"; paragraphs: Para[]; signature: string }
    | { key: string; type: "creditGridBlock"; sections: CreditSection[] }
    | { key: string; type: "tracklistBlock"; tracks: Track[] }
    | { key: string; type: "imageBlock"; imageUrl: string | null; caption: string }
    | { key: string; type: "videoEmbedBlock"; url: string }
    | { key: string; type: "audioBlock"; title: string; artist: string; audioUrl: string | null }
    | { key: string; type: "preserved"; rawType: string };

let seq = 0;
/** 새로 만든 항목의 임시 키 — 서버가 저장할 때 진짜 키로 바꾼다 */
export function newKey() {
    seq += 1;
    return `new-${Date.now().toString(36)}-${seq}`;
}

export const emptyPara = (): Para => ({ key: newKey(), text: "" });
export const emptyItem = (): CreditItem => ({ key: newKey(), role: "", value: "", linkText: "", linkUrl: "" });
export const emptyCreditSection = (): CreditSection => ({ key: newKey(), title: "", items: [emptyItem()] });
export const emptyTrack = (): Track => ({ key: newKey(), title: "", description: "" });

export function emptyBlock(type: EditableType): BlockState {
    const key = newKey();
    switch (type) {
        case "descriptionBlock":
            return { key, type, paragraphs: [emptyPara()] };
        case "signatureMessageBlock":
            return { key, type, paragraphs: [emptyPara()], signature: "" };
        case "creditGridBlock":
            return { key, type, sections: [emptyCreditSection()] };
        case "tracklistBlock":
            return { key, type, tracks: [emptyTrack()] };
        case "imageBlock":
            return { key, type, imageUrl: null, caption: "" };
        case "videoEmbedBlock":
            return { key, type, url: "" };
        case "audioBlock":
            return { key, type, title: "", artist: "", audioUrl: null };
    }
}

type Raw = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? (v as Raw[]) : []);

function toParas(v: unknown): Para[] {
    return (Array.isArray(v) ? (v as unknown[]) : []).map((p, i) => ({ key: `p-${i}`, text: s(p) }));
}

/** 서버에서 읽은 contentBlocks 배열 → 편집 상태 */
export function toState(raw: unknown): BlockState[] {
    return arr(raw).map((b): BlockState => {
        const key = s(b._key) || newKey();
        const type = s(b._type);
        switch (type) {
            case "descriptionBlock":
                return { key, type, paragraphs: toParas(b.paragraphs) };
            case "signatureMessageBlock":
                return { key, type, paragraphs: toParas(b.paragraphs), signature: s(b.signature) };
            case "creditGridBlock":
                return {
                    key,
                    type,
                    sections: arr(b.sections).map((sec) => ({
                        key: s(sec._key) || newKey(),
                        title: s(sec.title),
                        items: arr(sec.items).map((it) => ({
                            key: s(it._key) || newKey(),
                            role: s(it.role),
                            value: s(it.value),
                            linkText: s(it.linkText),
                            linkUrl: s(it.linkUrl),
                        })),
                    })),
                };
            case "tracklistBlock":
                return {
                    key,
                    type,
                    tracks: arr(b.tracks).map((t) => ({ key: s(t._key) || newKey(), title: s(t.title), description: s(t.description) })),
                };
            case "imageBlock":
                return { key, type, imageUrl: s(b.imageUrl) || null, caption: s(b.caption) };
            case "videoEmbedBlock":
                return { key, type, url: s(b.url) };
            case "audioBlock":
                return { key, type, title: s(b.title), artist: s(b.artist), audioUrl: s(b.audioUrl) || null };
            default:
                return { key, type: "preserved", rawType: type };
        }
    });
}

/** 편집 상태 → 서버로 보낼 JSON (서버가 다시 검증·정리한다) */
export function toPayload(states: BlockState[]) {
    return states.map((b) => {
        switch (b.type) {
            case "descriptionBlock":
                return { _key: b.key, _type: b.type, paragraphs: b.paragraphs.map((p) => p.text) };
            case "signatureMessageBlock":
                return { _key: b.key, _type: b.type, paragraphs: b.paragraphs.map((p) => p.text), signature: b.signature };
            case "creditGridBlock":
                return {
                    _key: b.key,
                    _type: b.type,
                    sections: b.sections.map((sec) => ({
                        _key: sec.key,
                        title: sec.title,
                        items: sec.items.map((it) => ({ _key: it.key, role: it.role, value: it.value, linkText: it.linkText, linkUrl: it.linkUrl })),
                    })),
                };
            case "tracklistBlock":
                return { _key: b.key, _type: b.type, tracks: b.tracks.map((t) => ({ _key: t.key, title: t.title, description: t.description })) };
            case "imageBlock":
                // 사진은 파일 입력(blockImage_<key>)으로 따로 올라오고, 기존 사진은 서버가 기존 문서에서 유지한다
                return { _key: b.key, _type: b.type, caption: b.caption };
            case "videoEmbedBlock":
                return { _key: b.key, _type: b.type, url: b.url };
            case "audioBlock":
                // 파일은 서버가 기존 문서에서 유지한다. 제목·아티스트만 받는다
                return { _key: b.key, _type: b.type, title: b.title, artist: b.artist };
            default:
                // 내용은 서버가 기존 문서에서 직접 다시 읽는다 (클라이언트가 보낸 값은 쓰지 않음)
                return { _key: b.key, _type: b.rawType, preserved: true };
        }
    });
}
