import "server-only";
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

/**
 * 쓰기 전용 Sanity 클라이언트 — 서버에서만 사용한다.
 *
 * SANITY_API_WRITE_TOKEN은 절대 클라이언트로 노출되면 안 되므로
 * NEXT_PUBLIC_ 접두사를 쓰지 않으며, 이 파일은 "server-only"로 잠가 둔다.
 */

const token = process.env.SANITY_API_WRITE_TOKEN;

export function isWriteConfigured(): boolean {
    return Boolean(token);
}

export function getWriteClient() {
    if (!token) {
        throw new Error(
            "SANITY_API_WRITE_TOKEN이 설정되지 않았습니다. Sanity 대시보드에서 Editor 권한 토큰을 발급받아 환경변수에 추가해 주세요."
        );
    }
    return createClient({
        projectId,
        dataset,
        apiVersion,
        token,
        useCdn: false,
    });
}
