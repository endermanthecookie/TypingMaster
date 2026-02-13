
import React from 'react';

interface TypingGuideProps {
  nextChar: string;
  accentColor: string;
}

const fingerMapping: Record<string, { hand: 'L' | 'R'; finger: number }> = {
  // Left Hand: 1=Pinky, 2=Ring, 3=Middle, 4=Index
  'q': { hand: 'L', finger: 1 }, 'a': { hand: 'L', finger: 1 }, 'z': { hand: 'L', finger: 1 }, '1': { hand: 'L', finger: 1 },
  'w': { hand: 'L', finger: 2 }, 's': { hand: 'L', finger: 2 }, 'x': { hand: 'L', finger: 2 }, '2': { hand: 'L', finger: 2 },
  'e': { hand: 'L', finger: 3 }, 'd': { hand: 'L', finger: 3 }, 'c': { hand: 'L', finger: 3 }, '3': { hand: 'L', finger: 3 },
  'r': { hand: 'L', finger: 4 }, 'f': { hand: 'L', finger: 4 }, 'v': { hand: 'L', finger: 4 }, '4': { hand: 'L', finger: 4 },
  't': { hand: 'L', finger: 4 }, 'g': { hand: 'L', finger: 4 }, 'b': { hand: 'L', finger: 4 }, '5': { hand: 'L', finger: 4 },
  
  // Right Hand: 1=Index, 2=Middle, 3=Ring, 4=Pinky
  'y': { hand: 'R', finger: 1 }, 'h': { hand: 'R', finger: 1 }, 'n': { hand: 'R', finger: 1 }, '6': { hand: 'R', finger: 1 },
  'u': { hand: 'R', finger: 1 }, 'j': { hand: 'R', finger: 1 }, 'm': { hand: 'R', finger: 1 }, '7': { hand: 'R', finger: 1 },
  'i': { hand: 'R', finger: 2 }, 'k': { hand: 'R', finger: 2 }, ',': { hand: 'R', finger: 2 }, '8': { hand: 'R', finger: 2 },
  'o': { hand: 'R', finger: 3 }, 'l': { hand: 'R', finger: 3 }, '.': { hand: 'R', finger: 3 }, '9': { hand: 'R', finger: 3 },
  'p': { hand: 'R', finger: 4 }, ';': { hand: 'R', finger: 4 }, '/': { hand: 'R', finger: 4 }, '0': { hand: 'R', finger: 4 },
  '[': { hand: 'R', finger: 4 }, ']': { hand: 'R', finger: 4 }, "'": { hand: 'R', finger: 4 }, '-': { hand: 'R', finger: 4 }, '=': { hand: 'R', finger: 4 },

  ' ': { hand: 'R', finger: 0 }, // Thumb (Space)
};

const TypingGuide: React.FC<TypingGuideProps> = ({ nextChar, accentColor }) => {
  const char = nextChar?.toLowerCase() || '';
  const mapping = fingerMapping[char];

  const getFingerStyle = (hand: 'L' | 'R', finger: number) => {
    const isActive = mapping && mapping.hand === hand && mapping.finger === finger;
    if (isActive) {
      const colorClass = accentColor === 'emerald' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' :
                         accentColor === 'rose' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.8)]' :
                         accentColor === 'amber' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)]' :
                         accentColor === 'purple' ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]' :
                         'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]';
      return `${colorClass} scale-110 translate-y-[-2px]`;
    }
    return 'bg-slate-800 opacity-40';
  };

  return (
    <div className="flex justify-center gap-12 p-4">
      {/* Left Hand */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-black text-slate-600 mb-4 tracking-widest uppercase">Left Tactical</span>
        <div className="flex items-end gap-1.5 h-16">
          <div className={`w-3 h-8 rounded-full transition-all duration-200 ${getFingerStyle('L', 1)}`} /> {/* Pinky */}
          <div className={`w-3.5 h-12 rounded-full transition-all duration-200 ${getFingerStyle('L', 2)}`} /> {/* Ring */}
          <div className={`w-3.5 h-14 rounded-full transition-all duration-200 ${getFingerStyle('L', 3)}`} /> {/* Middle */}
          <div className={`w-3.5 h-11 rounded-full transition-all duration-200 ${getFingerStyle('L', 4)}`} /> {/* Index */}
          <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 mt-2" /> {/* Thumb */}
        </div>
      </div>

      {/* Right Hand */}
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-black text-slate-600 mb-4 tracking-widest uppercase">Right Tactical</span>
        <div className="flex items-end gap-1.5 h-16">
          <div className={`w-6 h-6 rounded-full bg-slate-900 border border-slate-800 mt-2 ${getFingerStyle('R', 0)}`} /> {/* Thumb Space */}
          <div className={`w-3.5 h-11 rounded-full transition-all duration-200 ${getFingerStyle('R', 1)}`} /> {/* Index */}
          <div className={`w-3.5 h-14 rounded-full transition-all duration-200 ${getFingerStyle('R', 2)}`} /> {/* Middle */}
          <div className={`w-3.5 h-12 rounded-full transition-all duration-200 ${getFingerStyle('R', 3)}`} /> {/* Ring */}
          <div className={`w-3 h-8 rounded-full transition-all duration-200 ${getFingerStyle('R', 4)}`} /> {/* Pinky */}
        </div>
      </div>
    </div>
  );
};

export default TypingGuide;
