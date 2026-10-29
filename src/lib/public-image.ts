/** Next Image의 공개 화면 허용 범위를 넓히지 않고, 잘못된 CMS src는 대체 표시한다. */
export function isPublicImageSource(value: unknown): value is string {
    if (typeof value !== 'string' || !value || value.trim() !== value || /[\u0000-\u001f\u007f\\]/.test(value)) return false;
    if (value.startsWith('/') && !value.startsWith('//')) return true;
    if (value.startsWith('data:') && /^data:image\/[a-z0-9.+-]+[;,]/i.test(value)) return true;
    try {
        const url = new URL(value);
        if (url.protocol === 'blob:') return value.startsWith('blob:') && url.pathname.length > 0;
        return url.protocol === 'https:' && url.hostname === 'cdn.sanity.io' && !url.port && !url.username && !url.password;
    } catch { return false; }
}

// 반응형 img의 height:auto는 SVG 자체의 비율을 쓴다. 원본의 예약 비율에
// 맞는 내장 SVG를 만들어 오류 뒤에 정사각형으로 커지는 현상도 방지한다.
export function publicImageFallback(width: unknown = 400, height: unknown = 400): string {
    const dimension = (value: unknown) => {
        const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
        return Number.isFinite(number) && number > 0 ? number : 400;
    };
    const w = dimension(width), h = dimension(height);
    const scale = Math.min(w, h) / 400;
    // 숫자 외에는 SVG에 삽입하지 않는다. URL·alt·캡션 같은 사용자 문자열은 받지 않는다.
    return 'data:image/svg+xml,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f5f5f5"/><g transform="translate(${w / 2} ${h / 2}) scale(${scale})" fill="none" stroke="#a3a3a3" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><rect x="-44" y="-34" width="88" height="68" rx="6"/><circle cx="-20" cy="-12" r="7"/><path d="m-42 25 25-23 18 15 18-24 23 30M-47-42l94 84"/></g></svg>`,
    );
}

export const PUBLIC_IMAGE_FALLBACK = publicImageFallback();
