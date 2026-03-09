export default function CrewLoading() {
    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <section className="pt-40 pb-24 px-4 lg:px-12 mx-auto max-w-[90rem]">
                {/* Header - border-l-4 border-black style */}
                <div className="mb-24 mt-12 pl-4 md:pl-0 border-l-4 border-neutral-200 animate-pulse">
                    <div className="h-10 md:h-20 w-48 md:w-80 bg-neutral-200 rounded ml-4" />
                </div>

                {/* Grid - grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-10 gap-x-4 lg:gap-y-16 lg:gap-x-6 mt-8 px-2 md:px-0">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex flex-col animate-pulse">
                            <div className="h-5 md:h-7 w-2/3 bg-neutral-200 rounded mb-2 md:mb-3" />
                            <div className="aspect-[3/4] w-full bg-neutral-200 overflow-hidden shadow-lg" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
