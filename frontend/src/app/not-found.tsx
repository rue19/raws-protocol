import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0D0B0B] flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="font-display text-6xl font-bold text-[#810100]">404</p>
        <p className="font-mono text-xs text-[#7A6A6A]">This page doesn't exist.</p>
        <Link href="/" className="font-mono text-xs text-[#810100] hover:text-[#EDEBDD]">
          ← Back to RAW$
        </Link>
      </div>
    </div>
  );
}
