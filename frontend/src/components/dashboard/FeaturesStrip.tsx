'use client';

const features = [
  {
    title: 'Auto Compound',
    desc: 'Rewards are harvested and compounded automatically.',
    icon: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  },
  {
    title: 'Smart Protection',
    desc: 'We monitor for you and alert you before it hurts.',
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  },
  {
    title: 'One-Click Simplicity',
    desc: 'Deposit with a single asset. We handle the rest.',
    icon: 'M13 2L3 14 12 14 11 22 21 10 12 10 13 2',
  },
  {
    title: 'Real Yield Only',
    desc: 'Focus on sustainable fees, not temporary emissions.',
    icon: 'M18 20V10M12 20V4M6 20v-6',
  },
];

export function FeaturesStrip() {
  return (
    <div className="grid grid-cols-4 gap-0 border-[1.5px] border-[#ddd0b3] rounded-[10px] bg-white overflow-hidden mb-5">
      {features.map((feature, i) => (
        <div
          key={feature.title}
          className={`flex items-start gap-3 p-4 ${
            i < features.length - 1 ? 'border-r border-[#e5d9bf]' : ''
          }`}
        >
          <div className="flex-shrink-0 opacity-70 pt-0.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a2744" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={feature.icon} />
            </svg>
          </div>
          <div>
            <strong className="block text-[13px] font-bold text-[#0f1b2d] mb-0.5">
              {feature.title}
            </strong>
            <p className="text-[11px] text-[#6b7280] leading-[1.45]">
              {feature.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
