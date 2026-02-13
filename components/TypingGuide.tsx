
import React from 'react';

interface TypingGuideProps {
  nextChar: string;
  accentColor: string;
}

const fingerMapping: Record<string, { hand: 'L' | 'R'; finger: number }> = {
  // Left Hand: 1=Pinky, 2=Ring, 3=Middle, 4=Index
  'q': { hand: 'L', finger: 1 }, 'a': { hand: 'L', finger: 1 }, 'z': { hand: 'L', finger: 1 }, '1': { hand: 'L', finger: 1 }, '!': { hand: 'L', finger: 1 },
  'w': { hand: 'L', finger: 2 }, 's': { hand: 'L', finger: 2 }, 'x': { hand: 'L', finger: 2 }, '2': { hand: 'L', finger: 2 }, '@': { hand: 'L', finger: 2 },
  'e': { hand: 'L', finger: 3 }, 'd': { hand: 'L', finger: 3 }, 'c': { hand: 'L', finger: 3 }, '3': { hand: 'L', finger: 3 }, '#': { hand: 'L', finger: 3 },
  'r': { hand: 'L', finger: 4 }, 'f': { hand: 'L', finger: 4 }, 'v': { hand: 'L', finger: 4 }, '4': { hand: 'L', finger: 4 }, '$': { hand: 'L', finger: 4 },
  't': { hand: 'L', finger: 4 }, 'g': { hand: 'L', finger: 4 }, 'b': { hand: 'L', finger: 4 }, '5': { hand: 'L', finger: 4 }, '%': { hand: 'L', finger: 4 },
  
  // Right Hand: 1=Index, 2=Middle, 3=Ring, 4=Pinky
  'y': { hand: 'R', finger: 1 }, 'h': { hand: 'R', finger: 1 }, 'n': { hand: 'R', finger: 1 }, '6': { hand: 'R', finger: 1 }, '^': { hand: 'R', finger: 1 },
  'u': { hand: 'R', finger: 1 }, 'j': { hand: 'R', finger: 1 }, 'm': { hand: 'R', finger: 1 }, '7': { hand: 'R', finger: 1 }, '&': { hand: 'R', finger: 1 },
  'i': { hand: 'R', finger: 2 }, 'k': { hand: 'R', finger: 2 }, ',': { hand: 'R', finger: 2 }, '8': { hand: 'R', finger: 2 }, '*': { hand: 'R', finger: 2 }, '<': { hand: 'R', finger: 2 },
  'o': { hand: 'R', finger: 3 }, 'l': { hand: 'R', finger: 3 }, '.': { hand: 'R', finger: 3 }, '9': { hand: 'R', finger: 3 }, '(': { hand: 'R', finger: 3 }, '>': { hand: 'R', finger: 3 },
  'p': { hand: 'R', finger: 4 }, ';': { hand: 'R', finger: 4 }, '/': { hand: 'R', finger: 4 }, '0': { hand: 'R', finger: 4 }, ')': { hand: 'R', finger: 4 }, ':': { hand: 'R', finger: 4 }, '?': { hand: 'R', finger: 4 },
  '[': { hand: 'R', finger: 4 }, ']': { hand: 'R', finger: 4 }, '{': { hand: 'R', finger: 4 }, '}': { hand: 'R', finger: 4 },
  "'": { hand: 'R', finger: 4 }, '"': { hand: 'R', finger: 4 }, '-': { hand: 'R', finger: 4 }, '_': { hand: 'R', finger: 4 }, '+': { hand: 'R', finger: 4 }, '=': { hand: 'R', finger: 4 },

  ' ': { hand: 'R', finger: 0 }, // Thumb (Space)
};

const TypingGuide: React.FC<TypingGuideProps> = ({ nextChar, accentColor }) => {
  const char = nextChar?.toLowerCase() || '';
  const mapping = fingerMapping[char];

  const getFingerStyle = (hand: 'L' | 'R', finger: number) => {
    const isActive = mapping && mapping.hand === hand && mapping.finger === finger;
    if (isActive) {
      const colorClass = accentColor === 'emerald' ? 'bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)]' :
                         accentColor === 'rose' ? 'bg-rose-400 shadow-[0_0_20px_rgba(251,113,133,0.8)]' :
                         accentColor === 'amber' ? 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]' :
                         accentColor === 'purple' ? 'bg-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.8)]' :
                         'bg-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.8)]';
      return `${colorClass} scale-125 -translate-y-2 z-10`;
    }
    return 'bg-slate-800/50 opacity-20 border border-white/5';
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 glass rounded-[2rem] border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-center gap-16 md:gap-24">
        {/* Left Hand */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-end gap-2 h-20">
            <div className={`w-4 h-10 rounded-full transition-all duration-300 ${getFingerStyle('L', 1)}`} /> {/* Pinky */}
            <div className={`w-4.5 h-14 rounded-full transition-all duration-300 ${getFingerStyle('L', 2)}`} /> {/* Ring */}
            <div className={`w-4.5 h-17 rounded-full transition-all duration-300 ${getFingerStyle('L', 3)}`} /> {/* Middle */}
            <div className={`w-4.5 h-13 rounded-full transition-all duration-300 ${getFingerStyle('L', 4)}`} /> {/* Index */}
            <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/5 mt-4 self-center" /> {/* Thumb */}
          </div>
          <span className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase">Left Tactical</span>
        </div>

        {/* Right Hand */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-end gap-2 h-20">
            <div className={`w-8 h-8 rounded-full transition-all duration-300 mt-4 self-center ${getFingerStyle('R', 0)}`} /> {/* Thumb Space */}
            <div className={`w-4.5 h-13 rounded-full transition-all duration-300 ${getFingerStyle('R', 1)}`} /> {/* Index */}
            <div className={`w-4.5 h-17 rounded-full transition-all duration-300 ${getFingerStyle('R', 2)}`} /> {/* Middle */}
            <div className={`w-4.5 h-14 rounded-full transition-all duration-300 ${getFingerStyle('R', 3)}`} /> {/* Ring */}
            <div className={`w-4 h-10 rounded-full transition-all duration-300 ${getFingerStyle('R', 4)}`} /> {/* Pinky */}
          </div>
          <span className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase">Right Tactical</span>
        </div>
      </div>
      
      {mapping && (
        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-4 py-1.5 rounded-full border border-indigo-400/20 animate-pulse">
          Use {mapping.hand === 'L' ? 'Left' : 'Right'} {['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'][mapping.finger]} for "{nextChar === ' ' ? 'SPACE' : nextChar.toUpperCase()}"
        </div>
      )}
    </div>
  );
};

export default TypingGuide;
