// ─────────────────────────────────────────────────────────────────────────────
// Shared Sanity CMS types
// Query projections resolve image references to URL strings, so imageUrl
// fields are typed as string | null (not SanityImageAsset).
// ─────────────────────────────────────────────────────────────────────────────
import type { PortableTextBlock } from '@portabletext/types';

// ── Crew ──────────────────────────────────────────────────────────────────────

export type CrewLink = {
    url: string;
    // CMS에서 아이콘 이미지는 선택 입력이므로 비어 있을 수 있다.
    iconUrl: string | null;
};

export type CrewMemberSummary = {
    name: string;
    koName: string;
    role: string;
    slug: string;
    imageUrl: string | null;
    links?: CrewLink[];
};

// Crew profile sections — discriminated union by _type
type AboutSection = {
    _type: 'aboutSection';
    _key: string;
    text?: string;
};
type DiscographySection = {
    _type: 'discographySection';
    _key: string;
    years?: Array<{
        _key: string;
        year?: string;
        tracks?: Array<{ _key: string; title: string; desc?: string }>;
    }>;
};
type CareerSection = {
    _type: 'careerSection';
    _key: string;
    items?: Array<{ _key: string; date?: string; title?: string; desc?: string }>;
};
type AwardsAndActivitiesSection = {
    _type: 'awardsAndActivitiesSection';
    _key: string;
    awards?: Array<{ _key: string; date?: string; title?: string }>;
    activities?: Array<{ _key: string; date?: string; title?: string }>;
};
type EducationSection = {
    _type: 'educationSection';
    _key: string;
    items?: string[];
};
type CertificationsSection = {
    _type: 'certificationsSection';
    _key: string;
    items?: string[];
};
export type CrewSection =
    | AboutSection
    | DiscographySection
    | CareerSection
    | AwardsAndActivitiesSection
    | EducationSection
    | CertificationsSection;

export type CrewMemberDetail = {
    name: string;
    koName: string;
    role: string;
    imageUrl: string | null;
    links: CrewLink[];
    sections?: CrewSection[];
};

// ── Works ─────────────────────────────────────────────────────────────────────

export type WorkSummary = {
    title: string;
    artist: string;
    slug: string;
    releaseDate: string;
    imageUrl: string | null;
    lqip: string | null;
};

// Works content blocks — discriminated by _type
export type AudioBlock = {
    _type: 'audioBlock';
    _key: string;
    audioUrl: string;
    title?: string;
    artist?: string;
    tracks?: Array<{ _key: string; title: string; audioUrl?: string }>;
};

type DescriptionBlock = {
    _type: 'descriptionBlock';
    _key: string;
    paragraphs?: string[];
};

type TracklistBlock = {
    _type: 'tracklistBlock';
    _key: string;
    tracks?: Array<{ title: string; description?: string }>;
};

type SignatureMessageBlock = {
    _type: 'signatureMessageBlock';
    _key: string;
    paragraphs?: string[];
    signature?: string;
};

type CreditGridBlock = {
    _type: 'creditGridBlock';
    _key: string;
    sections?: Array<{
        title?: string;
        items?: Array<{ role?: string; value?: string; linkText?: string; linkUrl?: string }>;
    }>;
};

type ImageBlock = {
    _type: 'imageBlock';
    _key: string;
    imageUrl?: string;
    caption?: string;
};

type VideoEmbedBlock = {
    _type: 'videoEmbedBlock';
    _key: string;
    url: string;
};

type FreeformTextBlock = {
    _type: 'freeformTextBlock';
    _key: string;
    content?: PortableTextBlock | PortableTextBlock[];
};

export type ContentBlock =
    | AudioBlock
    | DescriptionBlock
    | TracklistBlock
    | SignatureMessageBlock
    | CreditGridBlock
    | ImageBlock
    | VideoEmbedBlock
    | FreeformTextBlock;

export type WorkDetail = WorkSummary & {
    youtubeUrl?: string | null;
    instagramId?: string | null;
    instagramUrl?: string | null;
    contentBlocks?: ContentBlock[];
};
