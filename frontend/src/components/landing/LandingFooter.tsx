import { Orbit } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 px-6 sm:px-8 py-8">
      <p className="flex items-center justify-center gap-2 text-xs text-slate">
        Backed by the power of <span className="text-periwinkle">Stellar</span>
        <Orbit size={13} strokeWidth={1.5} />
      </p>
    </footer>
  );
}
