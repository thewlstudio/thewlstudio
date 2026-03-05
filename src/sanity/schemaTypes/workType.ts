import { defineField, defineType, defineArrayMember } from "sanity";

export const workType = defineType({
    name: 'work',
    title: 'Work / Project',
    type: 'document',
    fields: [
        defineField({ name: 'title', title: 'Album Title', type: 'string', validation: (rule) => rule.required() }),
        defineField({ name: 'artist', title: 'Artist', type: 'string', validation: (rule) => rule.required() }),
        defineField({
            name: 'slug',
            title: 'URL Slug',
            type: 'slug',
            options: { source: 'title', maxLength: 96 },
            validation: (rule) => rule.required()
        }),
        defineField({
            name: 'releaseDate',
            title: 'Release Date (Format: YYYY. MM. DD.)',
            type: 'string',
            validation: (rule) => rule.required()
        }),
        defineField({
            name: 'coverImage',
            title: 'Cover Image',
            type: 'image',
            options: { hotspot: true },
            validation: (rule) => rule.required()
        }),
        defineField({
            name: 'youtubeUrl',
            title: 'YouTube URL (Cover Click)',
            type: 'url'
        }),
        defineField({
            name: 'instagramId',
            title: 'Instagram Handle (e.g., @warobaru)',
            type: 'string'
        }),
        defineField({
            name: 'instagramUrl',
            title: 'Instagram Profile URL',
            type: 'url'
        }),
        defineField({
            name: 'contentBlocks',
            title: 'Page Builder (Content Blocks)',
            type: 'array',
            of: [
                // 1. Description Block
                defineArrayMember({
                    name: 'descriptionBlock',
                    title: '1. Description Block (텍스트 모음)',
                    type: 'object',
                    fields: [
                        defineField({
                            name: 'paragraphs',
                            title: 'Paragraphs',
                            type: 'array',
                            of: [{ type: 'text' }]
                        })
                    ]
                }),
                // 2. Credit Grid Block
                defineArrayMember({
                    name: 'creditGridBlock',
                    title: '2. Credit Grid Block (크레딧)',
                    type: 'object',
                    fields: [
                        defineField({
                            name: 'sections',
                            title: 'Credit Sections',
                            type: 'array',
                            of: [
                                defineArrayMember({
                                    type: 'object',
                                    fields: [
                                        defineField({ name: 'title', title: 'Section Title (e.g., Track Info)', type: 'string' }),
                                        defineField({
                                            name: 'items',
                                            title: 'Credit Items',
                                            type: 'array',
                                            of: [
                                                defineArrayMember({
                                                    type: 'object',
                                                    fields: [
                                                        defineField({ name: 'role', title: 'Role (e.g., Composed by)', type: 'string', description: 'Left empty for full-width text like Thanks To' }),
                                                        defineField({ name: 'value', title: 'Value (e.g., 백광흠)', type: 'text' }),
                                                        defineField({ name: 'linkText', title: 'Link Text (e.g., @shcord_re)', type: 'string' }),
                                                        defineField({ name: 'linkUrl', title: 'Link URL', type: 'url' })
                                                    ]
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                // 3. Tracklist Block
                defineArrayMember({
                    name: 'tracklistBlock',
                    title: '3. Tracklist Block (트랙리스트 모음)',
                    type: 'object',
                    fields: [
                        defineField({
                            name: 'tracks',
                            title: 'Tracks',
                            type: 'array',
                            of: [
                                defineArrayMember({
                                    type: 'object',
                                    fields: [
                                        defineField({ name: 'title', title: 'Track Title (e.g., 1. 너와)', type: 'string' }),
                                        defineField({ name: 'description', title: 'Track Description / Lyrics', type: 'text' })
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                // 4. Signature Message Block
                defineArrayMember({
                    name: 'signatureMessageBlock',
                    title: '4. Signature Message Block (인사말)',
                    type: 'object',
                    fields: [
                        defineField({
                            name: 'paragraphs',
                            title: 'Paragraphs',
                            type: 'array',
                            of: [{ type: 'text' }]
                        }),
                        defineField({ name: 'signature', title: 'Signature (e.g., - White Light Studio)', type: 'string' })
                    ]
                }),
                // 5. Image Block
                defineArrayMember({
                    name: 'imageBlock',
                    title: '5. Image Block (사진 갤러리)',
                    type: 'object',
                    fields: [
                        defineField({ name: 'image', title: 'Image', type: 'image', options: { hotspot: true } }),
                        defineField({ name: 'caption', title: 'Caption', type: 'string' })
                    ]
                }),
                // 6. Video Embed Block
                defineArrayMember({
                    name: 'videoEmbedBlock',
                    title: '6. Video Embed Block (유튜브 삽입)',
                    type: 'object',
                    fields: [
                        defineField({ name: 'url', title: 'YouTube URL', type: 'url' })
                    ]
                }),
                // 7. Freeform Text Block
                defineArrayMember({
                    name: 'freeformTextBlock',
                    title: '7. Freeform Text Block (자유 서식)',
                    type: 'object',
                    fields: [
                        defineField({ name: 'content', title: 'Content', type: 'array', of: [{ type: 'block' }] })
                    ]
                })
            ]
        })
    ],
    preview: {
        select: {
            title: 'title',
            subtitle: 'artist',
            media: 'coverImage',
        },
    },
});
