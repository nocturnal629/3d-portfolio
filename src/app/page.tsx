import About from '@/components/sections/About';
import Certifications from '@/components/sections/Certifications';
import Experience from '@/components/sections/Experience';
import Footer from '@/components/sections/Footer';
import Hero from '@/components/sections/Hero';
import Projects from '@/components/sections/Projects';
import Signal from '@/components/sections/Signal';

/** Section order here must match `src/data/sections.ts` — that array maps
 *  each section to the celestial body the camera flies to, by index. */
export default function Home() {
  return (
    <>
      <Hero />
      <Projects />
      <Experience />
      <Certifications />
      <About />
      <Signal />
      <Footer />
    </>
  );
}
