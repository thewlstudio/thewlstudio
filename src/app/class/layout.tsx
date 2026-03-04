import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "CLASS",
    description: "화이트라이트 스튜디오 음악 클래스 - 보컬, 기타, 피아노, 작곡, 플룻 레슨",
};

export default function ClassLayout({ children }: { children: React.ReactNode }) {
    return children;
}
