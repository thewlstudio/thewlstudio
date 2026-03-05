import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "계절이 물든다 해서 그대를 잊은 적 없다",
    description: "계절이 물든다 해서 그대를 잊은 적 없다 - WHITE LIGHT STUDIO 작업 포트폴리오",
};

export default function NeverForgotYouLayout({ children }: { children: React.ReactNode }) {
    return children;
}
