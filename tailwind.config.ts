import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        // font-sans 기본을 Pretendard로 설정 (사이트 전체 기본 폰트)
        sans: ["var(--font-pretendard)", "Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"],
        // font-pretendard 클래스도 동일하게 유지 (하위 호환)
        pretendard: ["var(--font-pretendard)", "Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"],
        // font-mono는 변경하지 않음 (studio 요금, 날짜 등 의도적 사용)
      },
    },
  },
  plugins: [],
};
export default config;
