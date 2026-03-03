import { groq } from 'next-sanity';

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
