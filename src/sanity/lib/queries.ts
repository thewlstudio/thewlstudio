import { groq } from 'next-sanity';
import { CONTENT_ORDER } from '@/lib/content-order';

/**
 * 홈페이지에 보이는 항목의 공통 조건. 비공개(isActive == false)와 휴지통은 숨기고, 공개 여부 필드가 없으면 공개로 본다.
 * 로그인한 관리자가 미리보기를 켠 요청에서만 $includeHidden이 true가 되어 비공개 항목이 함께 나온다(휴지통은 계속 제외).
 * 이 조건을 쓰는 쿼리는 항상 $includeHidden을 받아야 하므로, sanityFetch가 넣어 주고 직접 조회는 PUBLIC_VISIBILITY_PARAMS를 쓴다.
 */
export const PUBLIC_VISIBILITY = '(!(isActive == false) || $includeHidden == true) && !(trashed == true)';
export const PUBLIC_VISIBILITY_PARAMS = { includeHidden: false } as const;

export const PUBLIC_WORK_FILTER = `_type == "work" && ${PUBLIC_VISIBILITY} && defined(slug.current)`;
export const PUBLIC_CREW_FILTER = `_type == "crew" && ${PUBLIC_VISIBILITY} && defined(slug.current)`;
export const PUBLIC_INSTRUCTOR_FILTER = `_type == "instructor" && ${PUBLIC_VISIBILITY}`;
export const PUBLIC_STUDIO_SPACE_FILTER = `_type == "studioSpace" && ${PUBLIC_VISIBILITY}`;

export const workSitemapQuery = groq`*[${PUBLIC_WORK_FILTER}]{ "slug": slug.current, _updatedAt }`;
export const crewSitemapQuery = groq`*[${PUBLIC_CREW_FILTER}]{ "slug": slug.current, _updatedAt }`;

export const worksQuery = groq`
  *[${PUBLIC_WORK_FILTER}] | order(releaseDate desc) {
    title,
    artist,
    "slug": slug.current,
    releaseDate,
    "imageUrl": coverImage.asset->url,
    "lqip": coverImage.asset->metadata.lqip
  }
`;

export const crewsQuery = groq`
  *[${PUBLIC_CREW_FILTER}] | order(${CONTENT_ORDER}) {
    name,
    koName,
    role,
    "slug": slug.current,
    "imageUrl": image.asset->url,
    links[] {
      url,
      "iconUrl": iconImage.asset->url
    }
  }
`;

export const instructorsQuery = groq`
  *[${PUBLIC_INSTRUCTOR_FILTER}] | order(${CONTENT_ORDER}) {
    _id,
    id,
    category,
    instructorName,
    image,
    imagePosition,
    modalImage,
    bgImage,
    bgScale,
    bgPosition,
    subtitle,
    lessonInfo,
    about,
    process,
    portfolioUrl,
    portfolioText,
    portfolioBtn
  }
`;

export const crewBySlugQuery = groq`
  *[${PUBLIC_CREW_FILTER} && slug.current == $slug][0] {
    name,
    koName,
    role,
    "imageUrl": image.asset->url,
    links[] {
      url,
      "iconUrl": iconImage.asset->url
    },
    sections
  }
`;

export const workBySlugQuery = groq`
  *[${PUBLIC_WORK_FILTER} && slug.current == $slug][0] {
    title,
    artist,
    releaseDate,
    "imageUrl": coverImage.asset->url,
    "lqip": coverImage.asset->metadata.lqip,
    youtubeUrl,
    instagramId,
    instagramUrl,
    contentBlocks[] {
      ...,
      _type == "imageBlock" => {
        ...,
        "imageUrl": image.asset->url
      },
      _type == "audioBlock" => {
        ...,
        "audioUrl": audioFile.asset->url
      }
    }
  }
`;
