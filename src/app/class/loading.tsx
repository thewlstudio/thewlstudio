export default function ClassLoading() {
    return (
        <main className="relative bg-white min-h-screen w-full overflow-hidden text-black font-sans">
            <section className="pt-40 pb-24 px-4 lg:px-12 mx-auto max-w-7xl">
                {/* Header - border-l-4 style with subtitle */}
                <div className="mb-24 mt-12 pl-4 md:pl-0 border-l-4 border-neutral-200 animate-pulse">
                    <div className="h-10 md:h-20 w-56 md:w-96 bg-neutral-200 rounded ml-4" />
                    <div className="h-3 w-40 bg-neutral-200 rounded ml-4 mt-4" />
                </div>

                {/* Curriculum section skeleton */}
                <div className="mb-32 md:mb-48 animate-pulse">
                    <div className="mb-10 lg:mb-12 border-b border-neutral-100 pb-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end md:justify-between">
                        <div className="h-8 md:h-12 w-48 md:w-72 bg-neutral-200 rounded" />
                        <div className="h-3 w-24 bg-neutral-200 rounded mt-4 md:mt-0" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-0 px-4 md:px-8 mt-8 pb-4">
                        <div className="md:pr-12 md:border-r border-neutral-100">
                            <div className="h-4 w-36 bg-neutral-200 rounded mb-6" />
                            <div className="space-y-5 pl-5 border-l border-neutral-100">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="h-3 bg-neutral-200 rounded" style={{ width: `${60 + i * 5}%` }} />
                                ))}
                            </div>
                        </div>
                        <div className="md:pl-16">
                            <div className="h-4 w-28 bg-neutral-200 rounded mb-6" />
                            <div className="space-y-5 pl-5 border-l border-neutral-100">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-3 bg-neutral-200 rounded" style={{ width: `${65 + i * 8}%` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructors heading */}
                <div className="mb-0 border-b border-neutral-100 pb-4 md:pb-6 px-4 md:px-8 animate-pulse">
                    <div className="h-8 md:h-12 w-48 md:w-64 bg-neutral-200 rounded" />
                </div>

                {/* Instructor list */}
                <ul className="flex flex-col">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <li
                            key={i}
                            className="border-b border-black/10 animate-pulse list-none"
                        >
                            <div className="py-8 md:py-12 px-4 md:px-8 flex flex-col md:flex-row md:items-center w-full">
                                <div className="flex flex-col md:flex-row items-center md:items-center w-full text-center md:text-left">
                                    {/* Portrait image */}
                                    <div className="w-32 sm:w-40 md:w-28 aspect-[3/4] bg-neutral-200 rounded-sm shrink-0 border-[3px] border-white shadow-md mb-6 md:mb-0 md:mr-10" />
                                    {/* Text content */}
                                    <div className="flex flex-col gap-3 items-center md:items-start">
                                        <div className="h-7 sm:h-8 md:h-9 lg:h-10 w-40 md:w-56 bg-neutral-200 rounded" />
                                        <div className="h-4 md:h-5 w-28 md:w-36 bg-neutral-200 rounded" />
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
