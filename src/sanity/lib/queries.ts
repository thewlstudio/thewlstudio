import { groq } from 'next-sanity';
import { CONTENT_ORDER } from '@/lib/content-order';

export const PUBLIC_WORK_FILTER = '_type == "work" && !(trashed == true) && defined(slug.current)';
export const PUBLIC_CREW_FILTER = '_type == "crew" && isActive == true && !(trashed == true) && defined(slug.current)';

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
  *[_type == "instructor" && !(isActive == false) && !(trashed == true)] | order(${CONTENT_ORDER}) {
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
