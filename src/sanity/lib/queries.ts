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

export const instructorsQuery = groq`
  *[_type == "instructor"] | order(order asc) {
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
