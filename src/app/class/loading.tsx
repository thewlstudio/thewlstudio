export default function ClassLoading() {
    return (
        <div className="pt-40 pb-24 px-4 lg:px-12 mx-auto max-w-7xl">
            {/* Header - matches border-l-4 border-black style in ClassClient */}
            <div className="mb-24 mt-12 pl-4 md:pl-0 border-l-4 border-neutral-200 animate-pulse">
                <div className="h-10 md:h-20 w-48 md:w-80 bg-neutral-200 rounded ml-4 mb-2" />
                {/* subtitle */}
                <div className="h-3 w-32 bg-neutral-200 rounded ml-4 mt-4" />
            </div>

            {/* Editorial list - matches flex flex-col in ClassClient */}
            <div className="flex flex-col divide-y divide-neutral-100">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col md:flex-row items-start py-8 md:py-12 px-4 md:px-8 animate-pulse gap-6 md:gap-10"
                    >
                        {/* Portrait image - w-32 sm:w-40 md:w-28 aspect-[3/4] */}
                        <div className="w-32 sm:w-40 md:w-28 aspect-[3/4] bg-neutral-200 rounded-sm shrink-0" />
                        {/* Text content */}
                        <div className="flex flex-col justify-center gap-3 w-full">
                            {/* category heading - text-xl sm:text-2xl md:text-3xl lg:text-4xl */}
                            <div className="h-7 md:h-9 w-3/5 bg-neutral-200 rounded" />
                            {/* instructor name */}
                            <div className="h-4 w-2/5 bg-neutral-200 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
