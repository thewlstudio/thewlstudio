"use client";

import { usePublicMotion } from "@/hooks/usePublicMotion";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { isManagePath, isStudioPath } from "@/lib/page-focus";

export default function Template({ children }: { children: React.ReactNode }) {
    const { reduced, transitionFor } = usePublicMotion();
    const pathname = usePathname();

    // 관리 화면(/manage, /admin)은 안정성이 우선이라 전환 애니메이션을 건너뛴다
    if (isManagePath(pathname) || isStudioPath(pathname)) {
        return <>{children}</>;
    }

    return (
        <motion.div data-public-motion
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transitionFor({ ease: "easeOut", duration: 0.5 })}
        >
            {children}
        </motion.div>
    );
}
