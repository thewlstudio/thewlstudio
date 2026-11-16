import { createClient, type QueryParams } from 'next-sanity';
import { apiVersion, dataset, projectId } from '../env';
import { isManagedPreview } from '@/lib/manage-preview';

export const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false, // ISR with revalidate requires fresh data from Sanity API
});

/**
 * 홈페이지용 조회.
 *
 * 미리보기(draftMode)는 로그인한 관리자가 /manage/preview에서만 켠다. 조회 때도 유효한 관리자 세션이 있어야 비공개 항목을 읽는다.
 * 비공개 문서도 발행된 문서이므로 읽기 토큰이 필요 없고, 초안(drafts.*)은 읽지 않는다.
 * 인증된 미리보기 요청은 공개 캐시를 쓰지 않는다(revalidate 0). 일반 방문자는 캐시된 공개 내용만 받는다.
 */
export async function sanityFetch<QueryResponse>({
    query,
    params = {},
    tags,
}: {
    query: string;
    params?: QueryParams;
    tags?: string[];
}) {
    const includeHidden = await isManagedPreview();

    return client.fetch<QueryResponse>(query, { ...params, includeHidden }, {
        next: {
            revalidate: includeHidden ? 0 : 3600,
            tags,
        },
    });
}
