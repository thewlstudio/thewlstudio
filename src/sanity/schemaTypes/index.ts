import { type SchemaTypeDefinition } from 'sanity';
import { instructorType } from './instructorType';
import crewType from './crewType';
import { workType } from './workType';
import { studioSpaceType } from './studioSpaceType';
import { siteSettingsType } from './siteSettingsType';
import { studioInfoType } from './studioInfoType';

export const schema: { types: SchemaTypeDefinition[] } = {
    types: [instructorType, crewType, workType, studioSpaceType, siteSettingsType, studioInfoType],
};
