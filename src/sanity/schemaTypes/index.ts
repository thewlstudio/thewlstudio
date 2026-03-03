import { type SchemaTypeDefinition } from 'sanity';
import { instructorType } from './instructorType';

export const schema: { types: SchemaTypeDefinition[] } = {
    types: [instructorType],
};
