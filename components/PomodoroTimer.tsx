
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { PomodoroSettings } from '../types';

interface PomodoroTimerProps {
  settings: PomodoroSettings;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ settings }) => {
  const [secondsLeft, setSecondsLeft] = useState(settings.defaultMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setSecondsLeft(settings.defaultMinutes * 60);
    setIsActive(false);
  }, [settings.defaultMinutes]);

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      // Optional: Add notification sound
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, secondsLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(settings.defaultMinutes * 60);
  };

  const adjustTime = (amount: number) => {
    setSecondsLeft(prev => Math.max(60, prev + amount));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const sizeClasses = {
    small: 'p-3 text-xs w-32',
    medium: 'p-4 text-sm w-40',
    large: 'p-6 text-base w-52'
  };

  if (!settings.enabled) return null;

  return (
    <div className={`fixed bottom-6 right-6 glass border border-white/10 rounded-2xl shadow-2xl z-40 transition-all hover:scale-105 group ${sizeClasses[settings.size]}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
          <span className="font-black uppercase tracking-widest text-[8px]">Focus Session</span>
          <Clock size={12} />
        </div>
        
        <div className="flex items-center justify-center gap-2">
          <div className="flex flex-col">
            <button onClick={() => adjustTime(60)} className="hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronUp size={14} />
            </button>
            <span className="font-mono font-black text-2xl tracking-tighter tabular-nums">
              {formatTime(secondsLeft)}
            </span>
            <button onClick={() => adjustTime(-60)} className="hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={toggleTimer} 
            className={`p-2 rounded-lg transition-all ${isActive ? 'bg-amber-500/20 text-amber-500' : 'bg-indigo-600 text-white'}`}
          >
            {isActive ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
          <button 
            onClick={resetTimer} 
            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;
