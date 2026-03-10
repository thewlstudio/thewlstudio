import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      ".next/",
      "dist/",
      "node_modules/",
      ".sanity/",
    ],
  },
];

export default eslintConfig;
