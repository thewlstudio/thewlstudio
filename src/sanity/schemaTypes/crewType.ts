import { defineField, defineType } from 'sanity'

export default defineType({
    name: 'crew',
    title: 'Crew Member',
    type: 'document',
    fields: [
        defineField({
            name: 'isActive',
            title: 'Active (Show on Website)',
            type: 'boolean',
            description: '크루 목록에 이 멤버를 공개할지 여부를 결정합니다.',
            initialValue: true,
        }),
        defineField({
            name: 'order',
            title: 'Display Order',
            type: 'number',
            description: '크루 목록에서 보여질 순서를 숫자로 입력하세요. (낮을수록 먼저 렌더링됩니다)',
            initialValue: 0,
        }),
        defineField({
            name: 'slug',
            title: 'Slug (URL 경로)',
            type: 'slug',
            options: {
                source: 'name',
                maxLength: 96,
            },
            validation: (Rule) => Rule.required(),
            description: '예: ceo-bkh, vocal-scon (영문 소문자와 하이픈만 사용)',
        }),
        defineField({
            name: 'name',
            title: 'English Name (영문 이름)',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'koName',
            title: 'Korean Name (한글 이름)',
            type: 'string',
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'role',
            title: 'Role (직책/역할)',
            type: 'string',
            validation: (Rule) => Rule.required(),
            description: '예: CEO / HEAD PRODUCER',
        }),
        defineField({
            name: 'image',
            title: 'Profile Image',
            type: 'image',
            options: {
                hotspot: true,
            },
            validation: (Rule) => Rule.required(),
        }),
        defineField({
            name: 'links',
            title: 'Social Links',
            type: 'array',
            of: [
                {
                    type: 'object',
                    fields: [
                        { name: 'url', title: 'URL', type: 'url' },
                        { name: 'iconImage', title: 'Icon Image', type: 'image' },
                    ],
                    preview: {
                        select: {
                            title: 'url',
                            media: 'iconImage',
                        },
                    },
                },
            ],
        }),

        // --- Modular Page Builder Sections ---
        defineField({
            name: 'sections',
            title: 'Profile Sections (프로필 내용 구성)',
            description: '원하는 섹션을 추가하고 드래그 앤 드롭으로 순서를 자유롭게 변경할 수 있습니다. 추가하지 않은 섹션은 화면에 나타나지 않습니다.',
            type: 'array',
            of: [
                // 1. ABOUT
                {
                    name: 'aboutSection',
                    title: 'ABOUT (소개)',
                    type: 'object',
                    fields: [
                        {
                            name: 'text',
                            title: '소개 내용',
                            type: 'text',
                            rows: 5,
                        },
                    ],
                    preview: { prepare() { return { title: 'ABOUT Section' } } }
                },
                // 2. DISCOGRAPHY
                {
                    name: 'discographySection',
                    title: 'DISCOGRAPHY (음반 경력)',
                    type: 'object',
                    fields: [
                        {
                            name: 'years',
                            title: 'Years (연도별)',
                            type: 'array',
                            of: [
                                {
                                    type: 'object',
                                    fields: [
                                        { name: 'year', title: 'Year (연도)', type: 'string' },
                                        {
                                            name: 'tracks',
                                            title: 'Tracks (트랙)',
                                            type: 'array',
                                            of: [
                                                {
                                                    type: 'object',
                                                    fields: [
                                                        { name: 'title', title: 'Track Title', type: 'string' },
                                                        { name: 'desc', title: 'Description (앨범 종류/역할 등)', type: 'string' },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    preview: { prepare() { return { title: 'DISCOGRAPHY Section' } } }
                },
                // 3. CAREER
                {
                    name: 'careerSection',
                    title: 'CAREER (경력)',
                    type: 'object',
                    fields: [
                        {
                            name: 'items',
                            title: '경력 목록',
                            type: 'array',
                            of: [
                                {
                                    type: 'object',
                                    fields: [
                                        { name: 'date', title: 'Date/Period (기간)', type: 'string' },
                                        { name: 'title', title: 'Title (내용)', type: 'string' },
                                        { name: 'desc', title: 'Description (상세/선택사항)', type: 'string' },
                                    ],
                                },
                            ],
                        },
                    ],
                    preview: { prepare() { return { title: 'CAREER Section' } } }
                },
                // 4. AWARDS & ACTIVITIES
                {
                    name: 'awardsAndActivitiesSection',
                    title: 'AWARDS & ACTIVITIES (수상 및 대외 활동)',
                    type: 'object',
                    fields: [
                        {
                            name: 'awards',
                            title: 'AWARDS (수상 내역)',
                            type: 'array',
                            of: [
                                {
                                    type: 'object',
                                    fields: [
                                        { name: 'date', title: 'Date (연도)', type: 'string' },
                                        { name: 'title', title: 'Title (수상명)', type: 'string' },
                                    ],
                                },
                            ],
                        },
                        {
                            name: 'activities',
                            title: 'ACTIVITIES (대외 활동)',
                            type: 'array',
                            of: [
                                {
                                    type: 'object',
                                    fields: [
                                        { name: 'date', title: 'Date (연도)', type: 'string' },
                                        { name: 'title', title: 'Title (활동명)', type: 'string' },
                                    ],
                                },
                            ],
                        },
                    ],
                    preview: { prepare() { return { title: 'AWARDS & ACTIVITIES Section' } } }
                },
                // 6. EDUCATION
                {
                    name: 'educationSection',
                    title: 'EDUCATION (학력)',
                    type: 'object',
                    fields: [
                        {
                            name: 'items',
                            title: '학력 목록',
                            type: 'array',
                            of: [{ type: 'string' }],
                        },
                    ],
                    preview: { prepare() { return { title: 'EDUCATION Section' } } }
                },
                // 7. CERTIFICATIONS
                {
                    name: 'certificationsSection',
                    title: 'CERTIFICATIONS (자격증)',
                    type: 'object',
                    fields: [
                        {
                            name: 'items',
                            title: '자격증 목록',
                            type: 'array',
                            of: [{ type: 'string' }],
                        },
                    ],
                    preview: { prepare() { return { title: 'CERTIFICATIONS Section' } } }
                },
            ],
        }),
    ],
    preview: {
        select: {
            title: 'koName',
            subtitle: 'role',
            media: 'image',
        },
    },
})
