import Link from 'next/link';
import { ArrowRight, Orbit, Droplet, RefreshCw, LineChart } from 'lucide-react';
import { Component as BloimBackground } from '@/components/ui/bloim-animation-background';
import { LandingHeader } from './LandingHeader';
import { LandingFooter } from './LandingFooter';

const features = [
  {
    icon: Orbit,
    label: 'Stellar Native',
    body: 'Built on Stellar for speed, scale, and ultra-low fees.',
  },
  {
    icon: Droplet,
    label: 'Multi-AMM Routing',
    body: 'Auto-allocates across Aquarius, Soroswap, and Phoenix.',
  },
  {
    icon: RefreshCw,
    label: 'Auto-Compound',
    body: 'Rewards are harvested and compounded every 4 hours.',
  },
  {
    icon: LineChart,
    label: 'Net Effective Yield',
    body: 'See the real yield: fees earned minus impermanent loss.',
  },
];

export function Hero() {
  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden bg-abyss">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <BloimBackground />
      </div>

      <LandingHeader />

      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-8 pt-28 sm:pt-32 pb-24 sm:pb-32">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.12] text-white mb-8">
            The naked truth
            <br />
            about your <span className="text-periwinkle">yield.</span>
          </h1>

          <p className="text-slate text-base sm:text-lg leading-relaxed max-w-xl mb-12">
            RAW$ is a Stellar-native DeFi yield optimizer. Deposit a single
            token — RAW$ automatically optimizes across top AMMs,
            auto-compounds, and shows your{' '}
            <span className="text-periwinkle">Net Effective Yield</span>.
          </p>

          <Link
            href="/pools"
            className="inline-flex items-center gap-2 bg-indigo text-white px-7 py-3.5 rounded-full text-sm font-medium hover:bg-indigo-dim transition-colors"
          >
            explore pools
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="max-w-4xl mx-auto mt-20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-center divide-y md:divide-y-0 divide-white/10">
            {features.map(({ icon: Icon, label, body }, i) => (
              <div key={label} className="flex items-center justify-center md:flex-1 py-5 md:py-0">
                {i > 0 && <div className="hidden md:block w-px h-12 bg-white/10 mx-6 shrink-0" />}
                <div className="flex items-center gap-4">
                  <Icon size={26} className="text-indigo shrink-0" strokeWidth={1.5} />
                  <div className="text-left">
                    <p className="text-white text-sm font-medium mb-0.5">{label}</p>
                    <p className="text-slate text-xs leading-relaxed max-w-[160px]">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LandingFooter />
    </section>
  );
}
