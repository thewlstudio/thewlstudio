import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '../env';

export const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false, // ISR with revalidate requires fresh data from Sanity API
});
