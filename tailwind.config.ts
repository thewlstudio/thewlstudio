import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // ⚠️ Sanity CMS(instructor.imagePosition)에서 런타임에 들어오는 클래스는
  // Tailwind가 빌드 시점에 스캔할 수 없어 CSS가 생성되지 않는다.
  // 아래 목록에 없는 값을 CMS에 입력하면 조용히 무시되므로,
  // 새 값을 쓰려면 반드시 여기에 먼저 추가해야 한다.
  // (근본 해결은 CMS 필드를 자유입력 → 선택지로 바꾸는 것)
  safelist: [
    "object-top",
    "object-center",
    "object-bottom",
    "object-[center_20%]",
    "object-[center_30%]",
    "object-[center_40%]",
    "scale-[1.2]",
    "scale-[1.5]",
    "scale-[1.8]",
    "scale-[2.2]",
    "origin-[center_10%]",
    "origin-[center_20%]",
    "origin-[center_30%]",
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
