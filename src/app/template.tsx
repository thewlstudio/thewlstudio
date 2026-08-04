"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // 관리 화면(/manage, /admin)은 안정성이 우선이라 전환 애니메이션을 건너뛴다
    if (pathname.startsWith("/manage") || pathname.startsWith("/admin")) {
        return <>{children}</>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: "easeOut", duration: 0.5 }}
        >
            {children}
        </motion.div>
    );
}
