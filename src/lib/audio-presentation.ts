import { REDUCED_MOTION_QUERY } from "@/hooks/usePrefersReducedMotion";

/** 재생 탭 제목·파비콘은 한 재생기만 소유한다. 늦은 pause가 새 재생기를 덮어쓰지 않는다. */
let owner: HTMLAudioElement | null = null;
let original: { title: string; icon: HTMLLinkElement | null; href: string | null } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let playingTitle = "";
let playingIcon = "";
let unsubscribeMotion: (() => void) | null = null;

function stopIconAnimation() {
    if (timer) clearInterval(timer);
    timer = null;
    unsubscribeMotion?.();
    unsubscribeMotion = null;
}

const frames = [10, 6, 2, 6].map((height, index) => {
    const bars = [height, [6, 2, 10, 10][index], [2, 10, 6, 2][index]];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#000"/>${bars.map((y, i) => `<rect x="${3 + i * 4}" y="${y}" width="2" height="${14 - y}" fill="#fff"/>`).join("")}</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
});

export function showAudioPresentation(audio: HTMLAudioElement, title?: string) {
    if (!original) {
        const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        original = { title: document.title, icon, href: icon?.getAttribute("href") ?? null };
    }
    owner = audio;
    stopIconAnimation();
    playingTitle = `▶ Playing: ${title || "Audio"}`;
    document.title = playingTitle;
    const icon = original.icon;
    if (!icon?.isConnected) return;
    let frame = 0;
    const paint = () => {
        playingIcon = frames[frame];
        icon.setAttribute("href", playingIcon);
        frame = (frame + 1) % frames.length;
    };
    const media = window.matchMedia?.(REDUCED_MOTION_QUERY);
    const updateMotion = () => {
        if (owner !== audio) return;
        if (timer) clearInterval(timer);
        timer = null;
        frame = 0;
        paint();
        if (!media?.matches) timer = setInterval(paint, 300);
    };
    updateMotion();
    media?.addEventListener?.("change", updateMotion);
    unsubscribeMotion = () => media?.removeEventListener?.("change", updateMotion);
}

export function hideAudioPresentation(audio: HTMLAudioElement) {
    if (owner !== audio || !original) return;
    stopIconAnimation();
    if (document.title === playingTitle) document.title = original.title;
    if (original.icon?.isConnected && original.icon.getAttribute("href") === playingIcon) {
        if (original.href === null) original.icon.removeAttribute("href");
        else original.icon.setAttribute("href", original.href);
    }
    original = null;
    owner = null;
}

export function updateAudioPresentation(audio: HTMLAudioElement, title?: string) {
    if (owner === audio) showAudioPresentation(audio, title);
}
