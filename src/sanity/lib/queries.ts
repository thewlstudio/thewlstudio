import { groq } from 'next-sanity';

export const worksQuery = groq`
  *[_type == "work"] | order(releaseDate desc) {
    title,
    artist,
    "slug": slug.current,
    releaseDate,
    "imageUrl": coverImage.asset->url,
    "lqip": coverImage.asset->metadata.lqip
  }
`;

export const crewsQuery = groq`
  *[_type == "crew" && isActive == true] | order(order asc) {
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
  *[_type == "instructor" && !(isActive == false) && !(trashed == true)] | order(order asc) {
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
  *[_type == "crew" && slug.current == $slug][0] {
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
  *[_type == "work" && slug.current == $slug][0] {
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
