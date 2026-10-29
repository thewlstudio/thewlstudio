/** CMS·관리 화면 어느 쪽에서 온 값이든 공개 링크는 절대 http(s) 주소만 쓴다. */
export function externalHttpUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!/^https?:\/\//i.test(raw) || /[\u0000-\u001f\u007f\\]/.test(raw)) return null;
    try {
        const url = new URL(raw);
        return url.hostname && !url.username && !url.password ? raw : null;
    } catch { return null; }
}

/** 자유 서식 링크 전용. 외부 웹 주소 외에 기존 상대 주소·메일·전화를 유지한다. */
export function publicRichTextHref(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw || /[\u0000-\u001f\u007f\\]/.test(raw) || raw.startsWith("//")) return null;
    const external = externalHttpUrl(raw);
    if (external) return external;
    try {
        const url = new URL(raw, "https://rich-text.invalid");
        if (url.protocol === "mailto:" || url.protocol === "tel:") return url.pathname ? raw : null;
        // 절대 주소가 검증에 실패한 뒤 상대 주소로 재해석되지 않게 한다.
        if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
        return url.origin === "https://rich-text.invalid" && !url.pathname.startsWith("//") ? raw : null;
    } catch { return null; }
}

const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);
const PRIVATE_HOSTS = new Set(["youtube-nocookie.com", "www.youtube-nocookie.com"]);

/** 저장 검사와 실제 임베드가 같은 호스트·경로·영상 ID 규칙을 사용한다. */
export function youTubeVideoId(value: unknown): string | null {
    const raw = externalHttpUrl(value);
    if (!raw) return null;
    const url = new URL(raw);
    if (url.port) return null;
    const path = url.pathname.split("/").slice(1);
    if (path.at(-1) === "") path.pop();
    let id: string | null = null;
    if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
        if (path.length === 1) id = path[0];
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
        if (url.pathname === "/watch") id = url.searchParams.get("v");
        else if (path.length === 2 && ["embed", "v", "shorts", "live"].includes(path[0])) id = path[1];
        else if (path.length === 3 && path[0] === "u" && /^\w$/.test(path[1])) id = path[2];
    } else if (PRIVATE_HOSTS.has(url.hostname) && path.length === 2 && path[0] === "embed") {
        id = path[1];
    }
    return id && VIDEO_ID.test(id) ? id : null;
}

export function instagramProfileUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const handle = value.trim().replace(/^@/, "");
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle) || handle === "." || handle === "..") return null;
    return `https://instagram.com/${handle}`;
}
