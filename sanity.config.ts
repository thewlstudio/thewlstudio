import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schema } from './src/sanity/schemaTypes';

// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'antidcuz';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export default defineConfig({
    basePath: '/admin',
    projectId,
    dataset,
    schema,
    plugins: [
        structureTool(),
    ],
});
