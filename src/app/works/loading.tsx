export default function WorksLoading() {
    return (
        <div className="min-h-screen bg-[#fafafa] pt-40 pb-24 px-4 lg:px-12 mx-auto max-w-[90rem]">
            {/* Header skeleton */}
            <div className="mb-16">
                <div className="h-3 w-20 bg-neutral-200 rounded mb-4 animate-pulse" />
                <div className="h-10 w-48 bg-neutral-200 rounded animate-pulse" />
            </div>
            {/* Grid skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="aspect-square bg-neutral-200 rounded-lg mb-3" />
                        <div className="h-3 w-3/4 bg-neutral-200 rounded mb-2" />
                        <div className="h-3 w-1/2 bg-neutral-200 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
