/** 문자열의 줄바꿈("\n")을 화면 줄바꿈으로 바꾼다. always가 아니면 데스크톱에서만 줄이 바뀐다. */
export default function Lines({ text, always = false }: { text: string; always?: boolean }) {
    const parts = text.split("\n");
    return (
        <>
            {parts.map((part, i) => (
                <span key={i}>
                    {part}
                    {i < parts.length - 1 && (always ? <br /> : <>{" "}<br className="hidden md:block" /></>)}
                </span>
            ))}
        </>
    );
}
