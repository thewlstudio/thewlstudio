import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main id="main-content" className="relative bg-black min-h-screen w-full overflow-hidden">
      <Header />
      <Hero />
      <About />
      <Footer />
    </main>
  );
}
