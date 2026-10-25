/** 안내 문구 안의 **강조**를 굵게 보여 준다. (그 밖의 서식은 지원하지 않는다) */
export default function Rich({ text }: { text: string }) {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return (
        <>
            {parts.map((p, i) =>
                i % 2 === 1 ? (
                    <strong key={i} className="font-bold text-neutral-900">
                        {p}
                    </strong>
                ) : (
                    p
                ),
            )}
        </>
    );
}
