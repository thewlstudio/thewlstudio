import { DEFAULT_SANITY_PROJECT_ID } from '../config/site';
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || DEFAULT_SANITY_PROJECT_ID;
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-03-01';
