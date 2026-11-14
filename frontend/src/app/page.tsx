import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { Proof } from "@/components/proof";
import { DemoPlayer } from "@/components/demo-player";
import { Connect } from "@/components/connect";
import { Closing } from "@/components/closing";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main" className="frame">
        <Hero />
        <HowItWorks />
        <Proof />
        <DemoPlayer />
        <Connect />
        <Closing />
      </main>
      <Footer />
    </>
  );
}
