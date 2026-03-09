export default function ClassLoading() {
    return (
        <div className="min-h-screen bg-[#fafafa] pt-40 pb-24 px-4 lg:px-12 mx-auto max-w-[90rem]">
            {/* Header skeleton */}
            <div className="mb-16">
                <div className="h-3 w-20 bg-neutral-200 rounded mb-4 animate-pulse" />
                <div className="h-10 w-48 bg-neutral-200 rounded animate-pulse" />
            </div>
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse bg-white rounded-xl overflow-hidden shadow-sm">
                        <div className="aspect-[4/3] bg-neutral-200" />
                        <div className="p-6">
                            <div className="h-4 w-2/3 bg-neutral-200 rounded mb-3" />
                            <div className="h-3 w-1/2 bg-neutral-200 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
