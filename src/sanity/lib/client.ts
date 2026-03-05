import { createClient, type QueryParams } from 'next-sanity';
import { apiVersion, dataset, projectId } from '../env';
import { draftMode } from 'next/headers';

export const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false, // ISR with revalidate requires fresh data from Sanity API
});

export async function sanityFetch<QueryResponse>({
    query,
    params = {},
    tags,
}: {
    query: string;
    params?: QueryParams;
    tags?: string[];
}) {
    const isDraftMode = draftMode().isEnabled;
    const token = process.env.SANITY_API_READ_TOKEN;

    if (isDraftMode && !token) {
        console.warn("Draft mode is enabled, but SANITY_API_READ_TOKEN is missing. Drafts may not load if your dataset is private.");
    }

    return client.fetch<QueryResponse>(query, params, {
        ...(isDraftMode && {
            token: token,
            perspective: 'previewDrafts',
            stega: true,
        }),
        next: {
            revalidate: isDraftMode ? 0 : 10,
            tags,
        },
    });
}
