
import React from 'react';
import { BookOpen, Target, Zap, ShieldCheck, Keyboard, MousePointer2, Info } from 'lucide-react';

const TUTORIALS = [
  {
    id: 'posture',
    title: 'Posture & Ergonomics',
    icon: <ShieldCheck className="text-emerald-400" />,
    description: 'The foundation of speed is health. Keep your back straight and wrists slightly elevated.',
    tips: [
      'Elbows at a 90-degree angle.',
      'Feet flat on the floor.',
      'Top of screen at eye level.'
    ]
  },
  {
    id: 'touch-typing',
    title: 'Master Touch Typing',
    icon: <Keyboard className="text-indigo-400" />,
    description: 'Type without looking at the keys. Use the tactical guide to learn finger placement.',
    tips: [
      'Index fingers on F and J (the bumps).',
      'Each finger has a specific "lane".',
      'Keep your eyes on the screen, not your hands.'
    ]
  },
  {
    id: 'accuracy',
    title: 'Slow is Fast',
    icon: <Target className="text-rose-400" />,
    description: 'Accuracy builds muscle memory. Speed is a byproduct of perfect precision.',
    tips: [
      'Aim for 98%+ accuracy always.',
      'Slow down for difficult words.',
      'Correct errors immediately.'
    ]
  },
  {
    id: 'rhythm',
    title: 'Consistent Rhythm',
    icon: <Zap className="text-amber-400" />,
    description: 'Speed is about the flow, not individual bursts. Avoid hesitation.',
    tips: [
      'Type to a steady beat.',
      'Read ahead by 2-3 words.',
      'Minimize finger movements.'
    ]
  }
];

const Tutorials: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Tactical Academy</h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">Learn the secrets of triple-digit typing speed</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TUTORIALS.map((t) => (
          <div key={t.id} className="glass p-8 rounded-[2.5rem] border border-white/10 hover:border-indigo-500/30 transition-all group">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform shadow-inner border border-white/5">
                {t.icon}
              </div>
              <div className="space-y-4">
                <h3 className="text-base font-black text-white uppercase tracking-tighter">{t.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">{t.description}</p>
                <ul className="space-y-2">
                  {t.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      <div className="w-1 h-1 rounded-full bg-indigo-500" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-8 rounded-[2rem] border border-white/10 bg-indigo-500/5">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Info size={20} /></div>
          <h4 className="text-xs font-black text-white uppercase tracking-widest">Pro Tip</h4>
        </div>
        <p className="text-slate-400 text-xs italic leading-relaxed">
          "Don't just practice often, practice correctly. Muscle memory is indiscriminate—it will learn bad habits just as easily as good ones. Use the 'Keyboard Hardware Check' in settings to ensure your inputs are clean."
        </p>
      </div>
    </div>
  );
};

export default Tutorials;
