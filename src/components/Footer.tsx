export default function Footer() {
    return (
        <footer id="contact" className="bg-black text-white pt-32 pb-12 border-t border-white/10">
            <div className="container mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-end">
                <div className="space-y-4 mb-12 md:mb-0">
                    <p className="text-5xl md:text-8xl font-black uppercase tracking-tighter">WHITE LIGHT<br />STUDIO</p>
                    <p className="text-neutral-500 font-mono text-sm">
                        © {new Date().getFullYear()} WHITE LIGHT STUDIO. All rights reserved.
                    </p>
                </div>

                <div className="text-right space-y-2 text-neutral-400 font-light">
                    <p className="mt-8 text-xs text-neutral-600">Designed & Built for WHITE LIGHT STUDIO</p>
                </div>
            </div>
        </footer>
    );
}
