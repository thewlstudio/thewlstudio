export default function WorksLoading() {
    return (
        <div>
            {/* Header - matches pt-24 pb-16 md:pt-40 md:pb-32 px-6 in WorksClient */}
            <div className="pt-24 pb-16 md:pt-40 md:pb-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="h-3 w-16 bg-neutral-200 rounded mb-4 animate-pulse" />
                    <div className="h-8 md:h-12 w-40 md:w-64 bg-neutral-200 rounded animate-pulse" />
                </div>
            </div>

            {/* Grid - matches grid-cols-2 md:grid-cols-2 lg:grid-cols-3 */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pb-24">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-16 lg:gap-x-10 lg:gap-y-20">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse">
                            {/* aspect-square image with border */}
                            <div className="aspect-square bg-neutral-200 rounded border border-neutral-200/60 mb-5" />
                            {/* subtitle - text-[9px] md:text-[12px] uppercase */}
                            <div className="h-2 md:h-3 w-1/3 bg-neutral-200 rounded mb-1.5" />
                            {/* title - text-xs md:text-lg lg:text-xl */}
                            <div className="h-3 md:h-5 w-2/3 bg-neutral-200 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
