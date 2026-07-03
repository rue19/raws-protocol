import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-abyss">
      <LandingHeader />
      <main className="flex-1 flex flex-col justify-center">
        <Hero />
      </main>
      <LandingFooter />
    </div>
  );
}
