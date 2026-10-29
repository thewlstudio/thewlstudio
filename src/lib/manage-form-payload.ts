// next.config.mjs의 요청 한도(4mb)보다 여유 있게 잡는다. 개별 사진이 아닌 폼 전체의 예산이다.
export const MAX_MANAGE_FORM_BYTES = 3_800_000;
const ENVELOPE_ALLOWANCE = 32 * 1024;
const FIELD_ALLOWANCE = 1024;
const byteLength = (text: string) => new Blob([text]).size;

/** 파일을 읽거나 복사하지 않고 파일 크기·UTF-8 텍스트·multipart 여유분을 합산한다. */
export function formPayloadError(data: FormData): string | null {
    let bytes = ENVELOPE_ALLOWANCE;
    for (const [name, value] of data) {
        bytes += FIELD_ALLOWANCE + byteLength(name);
        bytes += typeof value === "string"
            ? byteLength(value.replace(/\r\n|\r|\n/g, "\r\n"))
            : value.size + byteLength(value.name);
        if (bytes > MAX_MANAGE_FORM_BYTES) {
            return "한 번에 보내는 사진과 입력 내용의 용량이 너무 커요. 사진을 나눠 저장하거나 용량을 줄인 뒤 다시 시도해 주세요.";
        }
    }
    return null;
}
