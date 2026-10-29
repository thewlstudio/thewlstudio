import { DEFAULT_SANITY_PROJECT_ID } from './src/config/site';
import { defineCliConfig } from 'sanity/cli';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || DEFAULT_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export default defineCliConfig({ api: { projectId, dataset } });
