export default function WorksLoading() {
    return (
        <main className="relative bg-[#fafafa] min-h-screen w-full text-black font-sans">
            {/* Header - centered single title */}
            <section className="pt-24 pb-16 md:pt-40 md:pb-32 px-6 flex flex-col items-center justify-center">
                <div className="h-8 md:h-12 w-32 md:w-48 bg-neutral-200 rounded animate-pulse" />
            </section>

            {/* Grid - grid-cols-2 md:grid-cols-2 lg:grid-cols-3 */}
            <section className="max-w-7xl mx-auto px-4 md:px-6 pb-24">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-16 lg:gap-x-10 lg:gap-y-20">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center text-center animate-pulse">
                            <div className="w-full aspect-square bg-neutral-200 border border-neutral-200/60 mb-5" />
                            <div className="h-2 md:h-3 w-1/3 bg-neutral-200 rounded mb-1 md:mb-1.5" />
                            <div className="h-3 md:h-5 w-2/3 bg-neutral-200 rounded" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
