import { createClient, type QueryParams } from 'next-sanity';
import { apiVersion, dataset, projectId } from '../env';
import { draftMode } from 'next/headers';

export const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false, // ISR with revalidate requires fresh data from Sanity API
});

/**
 * 홈페이지용 조회.
 *
 * 미리보기(draftMode)는 로그인한 관리자가 /manage/preview에서만 켠다. 켜져 있으면 비공개 항목도 함께 읽는다.
 * 비공개 문서도 발행된 문서이므로 읽기 토큰이 필요 없고, 초안(drafts.*)은 읽지 않는다.
 * 미리보기 요청은 공개 캐시를 쓰지 않는다(revalidate 0). 일반 방문자는 캐시된 공개 내용만 받는다.
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
    const includeHidden = (await draftMode()).isEnabled;

    return client.fetch<QueryResponse>(query, { ...params, includeHidden }, {
        next: {
            revalidate: includeHidden ? 0 : 3600,
            tags,
        },
    });
}
