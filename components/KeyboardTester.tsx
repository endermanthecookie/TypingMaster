
import React, { useState, useEffect, useRef } from 'react';
import { Keyboard as KeyboardIcon, ChevronDown, Monitor, Laptop, Apple, Search, X, Settings2 } from 'lucide-react';

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
}

const KeyboardTester: React.FC<KeyboardTesterProps> = ({ testedKeys, onTestedKeysChange, mappings, onMappingChange }) => {
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

  const getMacLayout = () => [
    ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'backspace'],
    ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift'],
    ['control', 'option', 'command', ' ', 'command', 'option']
  ];

  const getWinLayout = () => [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'backspace'],
    ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift'],
    ['ctrl', 'win', 'alt', ' ', 'alt', 'win', 'ctrl']
  ];

  const getChromebookLayout = () => [
    ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'backspace'],
    ['tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['search', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'enter'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'shift'],
    ['ctrl', 'alt', ' ', 'alt', 'ctrl']
  ];

  const getRows = () => {
    if (platform === 'mac') return getMacLayout();
    if (platform === 'chromebook') return getChromebookLayout();
    return getWinLayout();
  };

  const getLabel = (key: string) => {
    if (key === ' ') return 'SPACE';
    if (key === 'command') return '⌘ CMD';
    if (key === 'option') return '⌥ OPT';
    if (key === 'win') return '⊞ WIN';
    if (key === 'backspace') return 'BACK';
    if (key === 'enter') return 'ENTER';
    if (key === 'shift') return 'SHIFT';
    if (key === 'caps') return 'CAPS';
    if (key === 'tab') return 'TAB';
    if (key === 'search') return 'SEARCH';
    if (key === 'ctrl') return 'CTRL';
    if (key === 'control') return 'CTRL';
    if (key === 'alt') return 'ALT';
    return key.toUpperCase();
  };

  const currentPlatformInfo = PLATFORMS.find(p => p.id === platform);

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-white/5"><KeyboardIcon size={20} /></div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none mb-1.5">Keyboard Hardware Check</h2>
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowPlatformMenu(!showPlatformMenu)} className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-indigo-400 transition-colors">
                System: <span className="text-indigo-400">{currentPlatformInfo?.label}</span>
                <ChevronDown size={12} />
              </button>
              {showPlatformMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-1">
                  {PLATFORMS.map((p) => (
                    <button key={p.id} onClick={() => { setPlatform(p.id); setShowPlatformMenu(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${platform === p.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center">
        <div className="w-full max-w-[1000px] p-4 md:p-8 bg-slate-950/80 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/10 shadow-3xl overflow-hidden ring-1 ring-white/5">
          <div className="flex flex-col gap-2 md:gap-3 items-center">
            {getRows().map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1 md:gap-2 w-full">
                {row.map((key, kIdx) => {
                  const keyId = key.toLowerCase();
                  const isActive = activeKeys.has(keyId);
                  const isTested = testedKeys.has(keyId);
                  const isJustTyped = lastTypedKey === keyId;
                  const customMapping = mappings[keyId];
                  
                  // Percentage-based or dynamic widths for responsiveness
                  let keyWidthClass = 'flex-1 min-w-0 max-w-[60px]';
                  if (key === ' ') keyWidthClass = 'flex-[6] min-w-[200px]';
                  else if (['backspace', 'tab', 'caps', 'search', 'shift', 'enter'].includes(keyId)) keyWidthClass = 'flex-[1.8] min-w-[60px]';
                  else if (['command', 'win', 'ctrl', 'control', 'option', 'alt'].includes(keyId)) keyWidthClass = 'flex-[1.2] min-w-[50px]';
                  
                  return (
                    <button key={`${key}-${kIdx}`}
                      onClick={() => setSelectedKey(keyId)}
                      className={`h-10 md:h-14 flex flex-col items-center justify-center rounded-lg md:rounded-xl font-black transition-all duration-150 border-b-[3px] md:border-b-[5px] shadow-lg relative group overflow-hidden
                        ${keyWidthClass}
                        ${isActive ? 'bg-indigo-500 text-white border-indigo-800 translate-y-1 border-b-0 mb-[3px] md:mb-[5px] z-20' : isJustTyped ? 'bg-emerald-500 text-white border-emerald-800 scale-105 z-10' : isTested ? 'bg-indigo-950/60 text-indigo-300 border-indigo-900/80' : 'bg-slate-900 text-slate-500 border-slate-950'}`}
                    >
                      <span className="truncate w-full px-1 md:px-2 text-[6px] md:text-[9px] uppercase tracking-tighter">{getLabel(key)}</span>
                      {customMapping && <span className="text-[5px] md:text-[7px] text-emerald-400 mt-0.5 opacity-90 truncate font-mono">→ {customMapping.toUpperCase()}</span>}
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedKey && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-400">
          <div className="glass border border-white/10 w-full max-w-md rounded-[2rem] p-10 shadow-3xl">
             <div className="flex justify-between items-center mb-10">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl"><Settings2 size={24} /></div>
                 <div>
                   <h3 className="text-base font-black text-white uppercase tracking-tighter">Key Remapping</h3>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Configure {getLabel(selectedKey)}</p>
                 </div>
               </div>
               <button onClick={() => setSelectedKey(null)} className="p-2 text-slate-500 hover:text-white transition-all"><X size={24}/></button>
             </div>

             <div className="space-y-8">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    placeholder="Search characters..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-black/50 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar p-1">
                   <button 
                     onClick={() => {
                       const newMap = { ...mappings };
                       delete newMap[selectedKey];
                       onMappingChange(newMap);
                       setSelectedKey(null);
                     }}
                     className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${!mappings[selectedKey] ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-500 hover:text-white hover:border-white/10'}`}
                   >
                     RESET
                   </button>
                   {REBINDABLE_ACTIONS.filter(a => a.toLowerCase().includes(searchTerm.toLowerCase())).map(action => (
                     <button 
                       key={action}
                       onClick={() => {
                         onMappingChange({ ...mappings, [selectedKey]: action.toLowerCase() });
                         setSelectedKey(null);
                       }}
                       className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${mappings[selectedKey] === action.toLowerCase() ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-black/40 border-white/5 text-slate-500 hover:text-white hover:border-white/10'}`}
                     >
                       {action}
                     </button>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyboardTester;
