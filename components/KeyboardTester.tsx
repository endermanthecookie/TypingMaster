
import React, { useState, useEffect, useRef } from 'react';
import { Keyboard as KeyboardIcon, ChevronDown, Monitor, Laptop, Apple, Search, X, Settings2, Zap, RotateCcw } from 'lucide-react';

type Platform = 'mac' | 'windows' | 'chromebook';

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode }[] = [
  { id: 'mac', label: 'macOS', icon: <Apple size={14} /> },
  { id: 'windows', label: 'Windows', icon: <Monitor size={14} /> },
  { id: 'chromebook', label: 'ChromeOS', icon: <Laptop size={14} /> },
];

const REBINDABLE_ACTIONS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'Backspace', 'Enter', 'Space', 'Shift', 'Control', 'Alt', 'Meta', 'Escape', 'Tab',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
  '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/'
];

interface KeyboardTesterProps {
  testedKeys: Set<string>;
  onTestedKeysChange: (keys: Set<string>) => void;
  mappings: Record<string, string>;
  onMappingChange: (mappings: Record<string, string>) => void;
  problemKeys?: string[];
  onResetProblemKeys?: () => void;
}

const KeyboardTester: React.FC<KeyboardTesterProps> = ({ 
  testedKeys, 
  onTestedKeysChange, 
  mappings, 
  onMappingChange,
  problemKeys = [],
  onResetProblemKeys
}) => {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [lastTypedKey, setLastTypedKey] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>('mac');
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => new Set(prev).add(key));
      setLastTypedKey(key);
      setTimeout(() => setLastTypedKey(null), 250);
      const nextTested = new Set(testedKeys);
      if (!nextTested.has(key)) {
        nextTested.add(key);
        onTestedKeysChange(nextTested);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [testedKeys, onTestedKeysChange]);

  const getRows = () => {
    const mac = [
      ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'backspace'],
      ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
      ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'enter'],
      ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift'],
      ['control', 'option', 'command', ' ', 'command', 'option']
    ];
    if (platform === 'mac') return mac;
    return mac; // Simplified for this update
  };

  const getLabel = (key: string) => {
    if (key === ' ') return 'SPACE';
    return key.toUpperCase();
  };

  const currentPlatformInfo = PLATFORMS.find(p => p.id === platform);

  return (
    <div className="space-y-8 w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-white/5"><KeyboardIcon size={20} /></div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1.5">Hardware Tactical Lab</h2>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowPlatformMenu(!showPlatformMenu)} className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-indigo-400 transition-colors">
                System: <span className="text-indigo-400">{currentPlatformInfo?.label}</span>
                <ChevronDown size={12} />
              </button>
            </div>
          </div>
        </div>

        {problemKeys.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1 flex items-center gap-1"><Zap size={10} /> Neuro-Adaptive Targets</span>
              <div className="flex gap-1.5">
                {problemKeys.map(k => (
                  <span key={k} className="px-2 py-0.5 bg-rose-500/20 rounded text-rose-400 font-mono text-[10px] font-bold uppercase">{k}</span>
                ))}
              </div>
            </div>
            <button 
              onClick={onResetProblemKeys}
              className="p-2 bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-all"
              title="Reset Adaptive History"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="w-full flex justify-center">
        <div className="w-full max-w-[1000px] p-4 md:p-8 bg-slate-950/80 rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden ring-1 ring-white/5 relative">
          <div className="scanline" />
          <div className="flex flex-col gap-2 md:gap-3 items-center relative z-10">
            {getRows().map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1 md:gap-2 w-full">
                {row.map((key, kIdx) => {
                  const keyId = key.toLowerCase();
                  const isActive = activeKeys.has(keyId);
                  const isTested = testedKeys.has(keyId);
                  const isProblem = problemKeys.includes(keyId);
                  
                  let keyWidthClass = 'flex-1 min-w-0 max-w-[60px]';
                  if (key === ' ') keyWidthClass = 'flex-[6] min-w-[200px]';
                  else if (['backspace', 'tab', 'caps', 'search', 'shift', 'enter'].includes(keyId)) keyWidthClass = 'flex-[1.8] min-w-[60px]';
                  
                  return (
                    <button key={`${key}-${kIdx}`}
                      onClick={() => setSelectedKey(keyId)}
                      className={`h-10 md:h-14 flex flex-col items-center justify-center rounded-lg md:rounded-xl font-black transition-all duration-150 border-b-[3px] md:border-b-[5px] shadow-lg relative group
                        ${keyWidthClass}
                        ${isActive ? 'bg-indigo-500 text-white border-indigo-800 translate-y-1 border-b-0 mb-[3px] md:mb-[5px] z-20' : 
                          isProblem ? 'bg-rose-950/40 text-rose-400 border-rose-900 animate-pulse' :
                          isTested ? 'bg-indigo-950/60 text-indigo-300 border-indigo-900/80' : 
                          'bg-slate-900 text-slate-500 border-slate-950'}`}
                    >
                      <span className="truncate w-full px-1 md:px-2 text-[6px] md:text-[9px] uppercase tracking-tighter">{getLabel(key)}</span>
                      {mappings[keyId] && <span className="text-[5px] md:text-[7px] text-emerald-400 mt-0.5 font-mono">→ {mappings[keyId].toUpperCase()}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardTester;
