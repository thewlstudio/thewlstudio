import Link from "./_components/GuardedLink";

/** 관리 화면에서 없는 항목(삭제됐거나 잘못된 주소)을 열었을 때의 안내 */
export default function ManageNotFound() {
    return (
        <main id="main-content" className="max-w-md mx-auto px-5 py-20 text-center">
            <h1 className="text-2xl font-black tracking-tight mb-3">찾는 항목이 없어요</h1>
            <p className="text-sm text-neutral-600 leading-relaxed mb-6 break-keep">
                이미 삭제됐거나 주소가 잘못됐을 수 있어요. 휴지통에 있다면 목록 위의 &lsquo;휴지통 보기&rsquo;에서 복원할 수 있어요.
            </p>
            <Link
                href="/manage"
                className="inline-flex h-11 px-5 rounded-xl bg-black text-white text-sm font-bold items-center hover:bg-neutral-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
                관리 허브로
            </Link>
        </main>
    );
}
