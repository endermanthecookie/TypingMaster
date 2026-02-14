
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Trophy, Zap, Target, RotateCcw, Play, Rocket, Settings as SettingsIcon,
  Gamepad2, LogOut, X, Volume2, VolumeX, Github, Globe, User, EyeOff, Eye, 
  Activity, Dna, Clock, Lock, ShieldAlert, AlertCircle, Timer, Download, Upload, FileJson,
  BookOpen, ChevronRight, Sparkles, ExternalLink, Info, HelpCircle, CheckCircle2, Search
} from 'lucide-react';
import { Difficulty, GameMode, TypingResult, PlayerState, PowerUp, PowerUpType, AppView, AIProvider, UserProfile, UserPreferences, PomodoroSettings } from './types';
import { fetchTypingText } from './services/geminiService';
import { fetchGithubTypingText } from './services/githubService';
import { getCoachReport } from './services/coachService';
import { supabase, saveUserPreferences, loadUserPreferences, checkIpSoloUsage, recordIpSoloUsage, getUserIdByIp } from './services/supabaseService';
import { saveZippyData, loadZippyData, ZippyStats } from './services/storageService';
import StatsCard from './components/StatsCard';
import HistoryChart from './components/HistoryChart';
import KeyboardTester from './components/KeyboardTester';
import TypingGuide from './components/TypingGuide';
import Auth from './components/Auth';
import PomodoroTimer from './components/PomodoroTimer';
import Tutorials from './components/Tutorials';

const RGB_MAP = {
  indigo: '99, 102, 241',
  emerald: '16, 185, 129',
  rose: '244, 63, 94',
  amber: '245, 158, 11',
  purple: '168, 85, 247'
};

const ACCENT_COLORS = {
  indigo: 'from-indigo-600 to-indigo-400',
  emerald: 'from-emerald-600 to-emerald-400',
  rose: 'from-rose-600 to-rose-400',
  amber: 'from-amber-600 to-amber-400',
  purple: 'from-purple-600 to-purple-400'
};

const AVATARS = ['😊', '😎', '🤖', '🦊', '🐱', '🐶', '🦄', '🌈', '⚡', '✨'];
const LOADING_MESSAGES = ["Fetching new text...", "AI is generating...", "Preparing your race...", "Syncing stats..."];

const DEFAULT_PROFILE: UserProfile = { username: 'Guest Player', avatar: '😊', accentColor: 'indigo' };
const DEFAULT_POMODORO: PomodoroSettings = { enabled: true, defaultMinutes: 25, size: 'medium' };

const POWER_UP_REFS = {
  [PowerUpType.SKIP_WORD]: { label: 'SKIP', icon: '⏩', description: 'Skip current word' },
  [PowerUpType.TIME_FREEZE]: { label: 'FREEZE', icon: '❄️', description: 'Stop clock for 3s' },
  [PowerUpType.SLOW_OPPONENTS]: { label: 'SLOW', icon: '🐢', description: 'Slow down AI for 5s' }
};

const normalizeText = (text: string) => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, "-").replace(/…/g, "...");

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.GAME);
  const [showAuth, setShowAuth] = useState(false);
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [showGeminiError, setShowGeminiError] = useState(false);
  const [showGithubHelp, setShowGithubHelp] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [user, setUser] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isZen, setIsZen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [hasUsedSolo, setHasUsedSolo] = useState<boolean | null>(null);
  
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { ...DEFAULT_PROFILE };
  });

  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('pomodoro_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { ...DEFAULT_POMODORO };
  });

  const [provider, setProvider] = useState<AIProvider>(() => {
    const saved = localStorage.getItem('ai_provider');
    return (saved as AIProvider) || AIProvider.GEMINI;
  });

  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github_token') || '');
  const [aiOpponentCount, setAiOpponentCount] = useState(1);
  const [aiOpponentDifficulty, setAiOpponentDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [calibratedKeys, setCalibratedKeys] = useState<Set<string>>(new Set());
  const [keyMappings, setKeyMappings] = useState<Record<string, string>>({});

  // Neuro-Adaptive State (Problem Keys)
  const [problemKeys, setProblemKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('zippy_problem_keys');
    return saved ? JSON.parse(saved) : [];
  });

  const [customTopic, setCustomTopic] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.SOLO);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTypingOut, setIsTypingOut] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [errors, setErrors] = useState(0);
  const [errorMap, setErrorMap] = useState<Record<string, number>>({});
  const [totalKeys, setTotalKeys] = useState(0);
  const [correctKeys, setCorrectKeys] = useState(0);
  const [history, setHistory] = useState<TypingResult[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isSlowed, setIsSlowed] = useState(false);
  const [streak, setStreak] = useState(0);
  const [players, setPlayers] = useState<PlayerState[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | null>(null);
  const typewriterRef = useRef<number | null>(null);
  const requestCounter = useRef(0);
  const audioCtx = useRef<AudioContext | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem('zippy_problem_keys', JSON.stringify(problemKeys));
  }, [problemKeys]);

  useEffect(() => {
    const root = document.documentElement;
    const rgb = RGB_MAP[profile.accentColor as keyof typeof RGB_MAP] || RGB_MAP.indigo;
    root.style.setProperty('--accent-primary', rgb);
    root.style.setProperty('--accent-glow', `rgba(${rgb}, 0.4)`);
    localStorage.setItem('user_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('pomodoro_settings', JSON.stringify(pomodoroSettings));
  }, [pomodoroSettings]);

  useEffect(() => {
    if (user && !user.is_ip_persistent) {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      
      setSaveStatus('saving');
      saveTimeoutRef.current = window.setTimeout(async () => {
        try {
          const prefs: UserPreferences = { 
            ai_provider: provider, 
            github_token: githubToken, 
            user_profile: profile,
            pomodoro_settings: pomodoroSettings,
            ai_opponent_count: aiOpponentCount,
            ai_opponent_difficulty: aiOpponentDifficulty,
            calibrated_keys: Array.from(calibratedKeys),
            key_mappings: keyMappings
          };
          await saveUserPreferences(user.id, prefs);
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
          console.error("Cloud save failed:", err);
          setSaveStatus('error');
        }
      }, 1000);
    }
    
    localStorage.setItem('ai_provider', provider);
    localStorage.setItem('github_token', githubToken);
  }, [profile, pomodoroSettings, provider, githubToken, user, aiOpponentCount, aiOpponentDifficulty, calibratedKeys, keyMappings]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let currentUser = session?.user ?? null;

        if (!currentUser) {
          const ipUserId = await getUserIdByIp();
          if (ipUserId) {
            currentUser = { id: ipUserId, is_ip_persistent: true } as any;
          }
        }

        const handleAuthUpdate = async (newUser: any) => {
          setUser(newUser);
          if (newUser) {
            const prefs = await loadUserPreferences(newUser.id);
            if (prefs) {
              setProvider(prefs.ai_provider);
              setGithubToken(prefs.github_token);
              setProfile(prefs.user_profile);
              setPomodoroSettings(prefs.pomodoro_settings);
              setAiOpponentCount(prefs.ai_opponent_count);
              setAiOpponentDifficulty(prefs.ai_opponent_difficulty);
              setCalibratedKeys(new Set(prefs.calibrated_keys));
              setKeyMappings(prefs.key_mappings);
            }
            fetchHistory(newUser.id);
            setHasUsedSolo(null); 
          } else {
            setProfile({ ...DEFAULT_PROFILE });
            setPomodoroSettings({ ...DEFAULT_POMODORO });
            setProvider(AIProvider.GEMINI);
            setGithubToken('');
            setAiOpponentCount(1);
            setAiOpponentDifficulty(Difficulty.MEDIUM);
            setCalibratedKeys(new Set());
            setKeyMappings({});
            
            localStorage.removeItem('user_profile');
            localStorage.removeItem('github_token');
            localStorage.removeItem('ai_provider');

            const used = await checkIpSoloUsage();
            setHasUsedSolo(used);
            setHistory([]);
            setCurrentView(AppView.GAME);
          }
        };

        await handleAuthUpdate(currentUser);
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
          handleAuthUpdate(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
      } catch (err) {}
    };
    initializeAuth();
  }, []);

  const resetGameStats = useCallback(() => {
    setUserInput(""); setElapsedTime(0); setTimeLeft(60); setErrors(0); setTotalKeys(0);
    setCorrectKeys(0); setStreak(0); setStartTime(null);
    setPowerUps([]); setIsFrozen(false); setIsSlowed(false); setErrorMap({});
    const pb = localStorage.getItem(`pb_${difficulty}_${gameMode}`);
    
    const initialPlayers: PlayerState[] = [{ id: 'me', name: profile.username, index: 0, errors: 0, isBot: false, avatar: profile.avatar }];
    if (pb) initialPlayers.push({ id: 'ghost', name: 'Personal Best', index: 0, errors: 0, isBot: false, isGhost: true, avatar: '👻' });
    
    if (gameMode === GameMode.COMPETITIVE) {
      const bots = [{ name: 'Alex', avatar: '🤖' }, { name: 'Jordan', avatar: '😎' }, { name: 'Riley', avatar: '🦊' }, { name: 'Skyler', avatar: '🐱' }, { name: 'Morgan', avatar: '🐶' }];
      bots.slice(0, aiOpponentCount).forEach((bot, i) => {
        initialPlayers.push({ id: `bot-${i}`, name: bot.name, index: 0, errors: 0, isBot: true, avatar: bot.avatar });
      });
    }
    setPlayers(initialPlayers);
  }, [difficulty, gameMode, profile, aiOpponentCount]);

  useEffect(() => {
    setPlayers(prev => prev.map(p => {
      if (p.id === 'me') {
        return { ...p, name: profile.username, avatar: profile.avatar };
      }
      return p;
    }));
  }, [profile.username, profile.avatar]);

  const currentWpmDisplay = useMemo(() => {
    if (elapsedTime <= 0) return 0;
    const typedLength = gameMode === GameMode.TIME_ATTACK ? correctKeys : userInput.length;
    return Math.round((typedLength / 5) / (elapsedTime / 60));
  }, [elapsedTime, userInput.length, correctKeys, gameMode]);

  const currentAccuracyDisplay = totalKeys > 0 ? Math.round(((totalKeys - errors) / totalKeys) * 100) : 100;
  const isOverdrive = streak >= 10;

  useEffect(() => {
    if (isActive && startTime && !loading && !isTypingOut) {
      timerRef.current = window.setInterval(() => {
        if (!isFrozen) {
          if (gameMode === GameMode.TIME_ATTACK) { 
            setTimeLeft(prev => { 
              if (prev <= 0.1) { completeRace(); return 0; } 
              return prev - 0.1; 
            }); 
          }
          setElapsedTime(prev => prev + 0.1);
          setPlayers(prev => prev.map(p => {
            if (!p.isBot && !p.isGhost) return p;
            let moveChance = 0;
            if (p.isGhost) { 
              const pbWpm = parseInt(localStorage.getItem(`pb_${difficulty}_${gameMode}`) || '0'); 
              moveChance = (pbWpm / 60) * 0.1 * 4.8; 
            }
            else { 
              let speedMult = isSlowed ? 0.35 : 1.0; 
              let baseSpeed = 0.32;
              switch (aiOpponentDifficulty) {
                case Difficulty.EASY: baseSpeed = 0.08; break;
                case Difficulty.MEDIUM: baseSpeed = 0.28; break;
                case Difficulty.HARD: baseSpeed = 0.55; break;
                case Difficulty.PRO: baseSpeed = 0.75; break;
                case Difficulty.INSANE: baseSpeed = 1.05; break;
              }
              const botIdNum = p.id.startsWith('bot-') ? parseInt(p.id.split('-')[1]) : 0;
              moveChance = baseSpeed * speedMult * (1 + (botIdNum * 0.05)); 
            }
            return { ...p, index: Math.min(p.index + (Math.random() < moveChance ? 1 : 0), currentText.length) };
          }));
        }
      }, 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, startTime, isFrozen, isSlowed, gameMode, loading, isTypingOut, aiOpponentDifficulty, currentText.length, difficulty]);

  const runTypewriter = (text: string) => {
    setIsTypingOut(true); setDisplayedText(""); let i = 0;
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    typewriterRef.current = window.setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++; if (i >= text.length) { clearInterval(typewriterRef.current!); setIsTypingOut(false); }
    }, 12);
  };

  const loadNewText = async (customDiff?: Difficulty) => {
    setLoading(true); const rid = ++requestCounter.current;
    try {
      let text = "";
      const seed = gameMode === GameMode.DAILY ? new Date().toISOString().split('T')[0] : customTopic;
      if (provider === AIProvider.GEMINI) {
        try {
          text = await fetchTypingText(customDiff || difficulty, "General", seed, problemKeys);
        } catch (e) {
          if (rid === requestCounter.current) {
             setShowGeminiError(true);
             setIsActive(false);
             setLoading(false);
          }
          throw e;
        }
      } else {
        text = await fetchGithubTypingText(customDiff || difficulty, "General", githubToken);
      }
      
      if (rid !== requestCounter.current) return;
      const cleaned = normalizeText(text.trim());
      setCurrentText(cleaned); setLoading(false); runTypewriter(cleaned);
    } catch (e: any) {
      console.error("AI text generation failed.", e);
      if (rid !== requestCounter.current) return;
      setLoading(false); 
      if (!showGeminiError) setCurrentText("Failed to load AI text. Check connection or token.");
    }
  };

  const startGame = async () => {
    if (!user) {
      const used = await checkIpSoloUsage();
      if (used) { setHasUsedSolo(true); setShowRestrictedModal(true); return; }
      if (gameMode !== GameMode.SOLO) { setShowRestrictedModal(true); return; }
    }
    playSound('click'); resetGameStats(); setIsActive(true); loadNewText(); 
    setTimeout(() => inputRef.current?.focus(), 50); 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isActive || loading || isTypingOut) return;
    if (!startTime) setStartTime(Date.now());
    const val = normalizeText(e.target.value);
    if (val.length < userInput.length) {
      setTotalKeys(prev => prev + 1); setUserInput(val);
      setPlayers(prev => prev.map(p => { if (p.id === 'me') return { ...p, index: val.length }; return p; }));
      return;
    }
    if (val === userInput) return;
    setTotalKeys(prev => prev + 1);
    if (val === currentText.substring(0, val.length)) {
      if (val.length > userInput.length) {
        playSound('correct'); setCorrectKeys(prev => prev + 1);
        if (val[val.length - 1] === ' ') setStreak(s => { const ns = s + 1; if (ns % 8 === 0) awardPowerUp(); return ns; });
      }
      setUserInput(val);
      setPlayers(prev => prev.map(p => { if (p.id === 'me') return { ...p, index: val.length }; return p; }));
      if (val.length === currentText.length) { if (gameMode === GameMode.TIME_ATTACK) { loadNewText(); setUserInput(""); setPlayers(ps => ps.map(p => { if (p.id === 'me') return {...p, index: 0}; return p; })); } else completeRace(); }
    } else {
      playSound('error'); setErrors(prev => prev + 1); setStreak(0);
      const lastChar = val[val.length - 1].toLowerCase();
      setErrorMap(prev => ({ ...prev, [lastChar]: (prev[lastChar] || 0) + 1 }));
    }
  };

  const completeRace = async () => {
    setIsActive(false); playSound('finish');
    const duration = gameMode === GameMode.TIME_ATTACK ? 60 : elapsedTime;
    const wpm = currentWpmDisplay; const accuracy = currentAccuracyDisplay;

    // Dynamic Difficulty analysis: Update problem keys based on match performance
    const matchProblemKeys = Object.entries(errorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    if (matchProblemKeys.length > 0) {
      setProblemKeys(prev => {
        const next = new Set([...prev, ...matchProblemKeys]);
        return Array.from(next).slice(-10); // Keep top 10 targeted keys
      });
    }

    if (user) {
      const pbKey = `pb_${difficulty}_${gameMode}`;
      const currentPb = parseInt(localStorage.getItem(pbKey) || '0');
      if (wpm > currentPb) localStorage.setItem(pbKey, wpm.toString());
      const note = await getCoachReport(provider, githubToken, wpm, accuracy, errors, Object.keys(errorMap));
      const result: TypingResult = { id: Date.now().toString(), date: new Date().toISOString(), wpm, accuracy, time: duration, errors, difficulty, mode: gameMode, textLength: currentText.length, errorMap, coachNote: note };
      await supabase.from('history').insert([{ ...result, user_id: user.id }]);
      setHistory(prev => [result, ...prev].slice(0, 50));
    } else if (gameMode === GameMode.SOLO) {
      try { await recordIpSoloUsage(); setHasUsedSolo(true); } catch (err) {}
    }
    setCurrentText(""); setDisplayedText(""); setUserInput("");
  };

  const awardPowerUp = () => {
    const types = Object.keys(POWER_UP_REFS) as PowerUpType[];
    const type = types[Math.floor(Math.random() * types.length)];
    setPowerUps(prev => [...prev.slice(-2), { id: Math.random().toString(), ...POWER_UP_REFS[type] } as PowerUp]);
  };

  const usePowerUp = (type: PowerUpType) => {
    const idx = powerUps.findIndex(p => p.type === type); if (idx === -1) return;
    setPowerUps(p => p.filter((_, i) => i !== idx)); playSound('click');
    if (type === PowerUpType.SKIP_WORD) {
      const rem = currentText.substring(userInput.length); const nextSpace = rem.indexOf(' '); const skip = nextSpace === -1 ? rem.length : nextSpace + 1;
      const nt = currentText.substring(0, Math.min(userInput.length + skip, currentText.length)); setUserInput(nt); setPlayers(ps => ps.map(p => { if (p.id === 'me') return {...p, index: nt.length}; return p; }));
    } else if (type === PowerUpType.TIME_FREEZE) { setIsFrozen(true); setTimeout(() => setIsFrozen(false), 3000); }
    else if (type === PowerUpType.SLOW_OPPONENTS) { setIsSlowed(true); setTimeout(() => setIsSlowed(false), 5000); }
  };

  const handleExport = () => {
    const maxWpm = history.length > 0 ? Math.max(...history.map(h => h.wpm)) : 0;
    const avgAcc = history.length > 0 ? history.reduce((acc, curr) => acc + curr.accuracy, 0) / history.length : 100;
    // Fix: Renamed local totalKeys to allKeys to avoid shadowing the state variable and resolve potential type errors in arithmetic operations on line 396.
    const allKeys = history.reduce((acc, curr) => acc + (curr.textLength || 0), 0);
    const stats: ZippyStats = { level: Math.floor(allKeys / 1000) + 1, topWPM: maxWpm, accuracy: avgAcc, totalKeystrokes: allKeys, problemKeys: problemKeys };
    const blob = saveZippyData(stats);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zippy_save_${new Date().toISOString().split('T')[0]}.ztx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const stats = await loadZippyData(file);
      alert(`Import Successful!\nLevel: ${stats.level}\nTop WPM: ${stats.topWPM.toFixed(1)}\nAccuracy: ${stats.accuracy.toFixed(1)}%`);
    } catch (err: any) { alert(`Import Failed: ${err.message}`); }
  };

  const formattedTime = (time: number) => { const mins = Math.floor(time / 60); const secs = (time % 60).toFixed(1); return `${mins}:${secs.padStart(4, '0')}`; };

  const checkRestricted = (targetView: AppView) => {
    if (!user && (targetView === AppView.PROFILE || targetView === AppView.SETTINGS)) { setShowRestrictedModal(true); return; }
    setCurrentView(targetView);
  };

  const playSound = (type: 'correct' | 'error' | 'finish' | 'click') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtx.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      if (type === 'click') { osc.frequency.setValueAtTime(150, now); gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05); osc.start(now); osc.stop(now + 0.05); }
      else if (type === 'correct') { osc.frequency.setValueAtTime(800, now); gain.gain.setValueAtTime(0.03, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05); osc.start(now); osc.stop(now + 0.05); }
      else if (type === 'error') { osc.type = 'square'; osc.frequency.setValueAtTime(100, now); gain.gain.setValueAtTime(0.08, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
      else if (type === 'finish') { osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.3); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
    } catch {}
  };

  const fetchHistory = async (uid: string) => {
    const { data } = await supabase.from('history').select('*').eq('user_id', uid).order('date', { ascending: false });
    if (data) setHistory(data);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 flex flex-col items-center transition-all duration-700`}>
      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      {user && pomodoroSettings.enabled && <PomodoroTimer settings={pomodoroSettings} />}
      
      {showGeminiError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
           <div className="glass border border-white/10 w-full max-w-sm rounded-[2rem] p-8 shadow-3xl text-center space-y-6">
             <div className="flex justify-center"><div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl"><AlertCircle size={32} /></div></div>
             <div className="space-y-2">
               <h3 className="text-sm font-black text-white uppercase tracking-tighter">Gemini is not available.</h3>
               <p className="text-[11px] font-medium text-slate-400">The primary AI core is offline. Would you like to switch to ChatGPT (GitHub Models)?</p>
             </div>
             <div className="flex flex-col gap-3">
               <button onClick={() => { setProvider(AIProvider.GITHUB); setShowGeminiError(false); checkRestricted(AppView.SETTINGS); }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-xl uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"><Github size={14}/> Switch to ChatGPT</button>
               <button onClick={() => setShowGeminiError(false)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-400 font-bold rounded-xl transition-all uppercase tracking-widest text-[8px]">Try Again Later</button>
             </div>
           </div>
        </div>
      )}

      {showRestrictedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass border border-white/10 w-full max-w-sm rounded-[1.5rem] p-8 shadow-2xl text-center space-y-6">
            <div className="flex justify-center"><div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><AlertCircle size={32} /></div></div>
            <div className="space-y-2"><h3 className="text-sm font-black text-white uppercase tracking-tighter">Login Required</h3><p className="text-[11px] font-medium text-slate-400">Please sign in to access this feature.</p></div>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setShowRestrictedModal(false); setShowAuth(true); }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-lg transition-all shadow-xl uppercase tracking-widest text-[9px]">Log in / Sign up</button>
              <button onClick={() => setShowRestrictedModal(false)} className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-400 font-bold rounded-lg transition-all uppercase tracking-widest text-[8px]">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl w-full space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center gap-6 glass rounded-[1.75rem] p-6 shadow-2xl relative overflow-hidden border border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-white/10 shadow-inner"><Rocket style={{ color: 'rgb(var(--accent-primary))' }} size={24} /></div>
            <div>
              <h1 className="text-base font-black text-white uppercase tracking-tighter leading-none mb-1">ZippyType</h1>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">USER:</span>
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">{profile.username}</span>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <div className="flex bg-black/50 p-1.5 rounded-2xl border border-white/5 shadow-lg">
              <button onClick={() => setCurrentView(AppView.GAME)} className={`p-3 rounded-xl transition-all ${currentView === AppView.GAME ? `bg-indigo-600 text-white shadow-lg` : 'text-slate-500 hover:text-white'}`} title="Game Home"><Gamepad2 size={20} /></button>
              <button onClick={() => setCurrentView(AppView.TUTORIALS)} className={`p-3 rounded-xl transition-all ${currentView === AppView.TUTORIALS ? `bg-amber-600 text-white shadow-lg` : 'text-slate-500 hover:text-white'}`} title="Tactical Academy"><BookOpen size={20} /></button>
              <button onClick={() => checkRestricted(AppView.PROFILE)} className={`p-3 rounded-xl transition-all relative ${currentView === AppView.PROFILE ? `bg-emerald-600 text-white shadow-lg` : 'text-slate-500 hover:text-white'}`} title="Profile">
                <User size={20} />
                {!user && <div className="absolute top-1 right-1 bg-slate-900/80 rounded-full p-0.5"><Lock size={10} className="text-slate-400" /></div>}
              </button>
              <button onClick={() => checkRestricted(AppView.SETTINGS)} className={`p-3 rounded-xl transition-all relative ${currentView === AppView.SETTINGS ? `bg-purple-600 text-white shadow-lg` : 'text-slate-500 hover:text-white'}`} title="Settings">
                <SettingsIcon size={20} />
                {!user && <div className="absolute top-1 right-1 bg-slate-900/80 rounded-full p-0.5"><Lock size={10} className="text-slate-400" /></div>}
              </button>
            </div>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-3 bg-black/50 border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all shadow-md">{soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
            {user ? (<button onClick={() => supabase.auth.signOut()} className="p-3 bg-black/50 border border-white/5 rounded-xl text-slate-500 hover:text-rose-400 transition-all shadow-md"><LogOut size={20} /></button>) : (<button onClick={() => setShowAuth(true)} className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95">Login</button>)}
          </nav>
        </header>

        {currentView === AppView.PROFILE ? (
          <div className="glass rounded-[2rem] p-10 space-y-10 animate-in zoom-in-95 duration-300 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3"><div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl"><User size={22} /></div><h2 className="text-base font-black text-white uppercase tracking-tighter">Profile Details</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">User Name</label><input value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold text-sm focus:border-emerald-500 transition-all outline-none shadow-inner" /></div>
                <div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Accent Color</label><div className="flex gap-4">{Object.keys(RGB_MAP).map(c => (<button key={c} onClick={() => setProfile({...profile, accentColor: c as any})} className={`w-10 h-10 rounded-xl border-2 transition-all ${profile.accentColor === c ? 'border-white scale-110 shadow-xl shadow-white/10' : 'border-transparent opacity-40 hover:opacity-100'} bg-${c}-500`} />))}</div></div>
              </div>
              <div className="space-y-5"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Avatar</label><div className="grid grid-cols-5 gap-4">{AVATARS.map(v => (<button key={v} onClick={() => setProfile({...profile, avatar: v})} className={`text-2xl p-4 rounded-xl border-2 transition-all hover:scale-110 ${profile.avatar === v ? 'border-emerald-500 bg-emerald-500/10 shadow-xl shadow-emerald-500/10' : 'border-white/5 bg-black/50 opacity-30 hover:opacity-100'}`}>{v}</button>))}</div></div>
            </div>
          </div>
        ) : currentView === AppView.SETTINGS ? (
          <div className="space-y-8 animate-in zoom-in-95 duration-300">
            <div className="glass rounded-[2rem] p-10 border border-white/10 shadow-2xl">
              <KeyboardTester 
                testedKeys={calibratedKeys} 
                onTestedKeysChange={setCalibratedKeys} 
                mappings={keyMappings} 
                onMappingChange={setKeyMappings}
                problemKeys={problemKeys}
                onResetProblemKeys={() => setProblemKeys([])}
              />
            </div>
            
            <div className="glass rounded-[2rem] p-10 space-y-10 border border-white/10 shadow-2xl relative">
               {saveStatus !== 'idle' && (
                  <div className={`absolute top-10 right-10 flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-2
                    ${saveStatus === 'saving' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                      saveStatus === 'saved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {saveStatus === 'saving' ? <Activity size={12} className="animate-spin" /> : saveStatus === 'saved' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {saveStatus === 'saving' ? 'Syncing...' : saveStatus === 'saved' ? 'Synced' : 'Sync Error'}
                  </div>
               )}

               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3"><div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20"><Globe size={22} /></div><h2 className="text-base font-black text-white uppercase tracking-tighter">Advanced AI Config</h2></div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Text Generator</label><div className="flex bg-black/50 p-1.5 rounded-xl border border-white/5 shadow-inner"><button onClick={() => setProvider(AIProvider.GEMINI)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.GEMINI ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Globe size={12}/> Gemini</button><button onClick={() => setProvider(AIProvider.GITHUB)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.GITHUB ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Github size={12}/> GPT-4o (GitHub)</button></div></div>
                </div>
                <div className="space-y-8"><div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">AI Competitors (1-5)</label><div className="flex items-center px-1"><input type="range" min="1" max="5" value={aiOpponentCount} onChange={e => setAiOpponentCount(parseInt(e.target.value))} className="flex-1 accent-indigo-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer" /></div></div><div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Bot Difficulty</label><div className="flex flex-wrap bg-black/50 p-1.5 rounded-xl border border-white/5 gap-2 shadow-inner">{[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, Difficulty.PRO, Difficulty.INSANE].map(d => (<button key={d} onClick={() => setAiOpponentDifficulty(d)} className={`flex-1 py-3 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${aiOpponentDifficulty === d ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{d}</button>))}</div></div></div>
              </div>
            </div>
          </div>
        ) : currentView === AppView.TUTORIALS ? (
          <Tutorials />
        ) : (
          <>
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="glass p-1.5 rounded-[1.5rem] flex gap-2 border border-white/10 shadow-2xl">
                {[GameMode.SOLO, GameMode.TIME_ATTACK, GameMode.COMPETITIVE, GameMode.DAILY].map(m => {
                  const isLocked = !user && (m !== GameMode.SOLO || hasUsedSolo);
                  return (<button key={m} disabled={isLocked && isActive} onClick={() => { if (isLocked) { setShowRestrictedModal(true); } else { setGameMode(m); resetGameStats(); } }} className={`px-5 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${gameMode === m ? 'bg-white text-black shadow-lg scale-105' : 'text-slate-500 hover:text-white'}`}>{isLocked && <Lock size={10} />}{m === 'timed' ? '60s Blitz' : m}</button>);
                })}
              </div>
              <button onClick={() => setIsZen(!isZen)} className={`p-4 rounded-2xl border transition-all glass shadow-2xl hover:scale-105 active:scale-95 ${isZen ? 'text-emerald-400 border-emerald-500/30' : 'text-slate-500 border-white/10'}`} title="Focus Mode">{isZen ? <Eye size={20} /> : <EyeOff size={20} />}</button>
              <button onClick={() => setShowGuide(!showGuide)} className={`p-4 rounded-2xl border transition-all glass shadow-2xl hover:scale-105 active:scale-95 ${showGuide ? 'text-indigo-400 border-indigo-500/30' : 'text-slate-500 border-white/10'}`} title="Finger Guide"><Dna size={20} /></button>
            </div>

            <main className={`relative transition-all duration-700 glass rounded-[2.5rem] p-10 md:p-12 border overflow-hidden shadow-2xl ${isOverdrive ? 'overdrive-glow border-indigo-500/40 scale-[1.004]' : 'border-white/10'}`}>
              <div className="scanline" />
              {!isZen && (
                <div className="mb-10 space-y-6 relative p-4 bg-black/40 rounded-[2rem] border border-white/5">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none" />
                  {players.map(p => {
                    const progress = (p.index / Math.max(currentText.length, 1)) * 100;
                    return (
                      <div key={p.id} className="relative h-16 bg-slate-900/60 rounded-2xl border border-white/5 overflow-hidden group shadow-[inset_0_4px_12px_rgba(0,0,0,0.6)]">
                        <div 
                          className={`absolute inset-y-0 left-0 transition-all duration-700 cubic-bezier(0.23, 1, 0.32, 1) flex items-center justify-end
                            ${p.isGhost ? 'bg-indigo-300/10 border-r border-white/30' : 
                              p.id === 'me' ? `bg-gradient-to-r ${ACCENT_COLORS[profile.accentColor as keyof typeof ACCENT_COLORS]} opacity-30 border-r-[3px] border-white shadow-[0_0_30px_var(--accent-glow)]` : 
                              'bg-indigo-500/10 border-r border-indigo-500/30'}`} 
                          style={{ width: `${progress}%` }}
                        >
                          {p.id === 'me' && isOverdrive && (
                             <div className="h-full w-full bg-gradient-to-l from-white/30 via-indigo-400/10 to-transparent animate-pulse" />
                          )}
                        </div>

                        <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 cubic-bezier(0.23, 1, 0.32, 1) flex items-center gap-5 px-6" style={{ left: `${Math.min(progress, 88)}%` }}>
                          <div className={`relative flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-950 border-2 transition-all duration-300 shadow-2xl ${p.id === 'me' ? 'scale-110 border-white ring-4 ring-indigo-500/20' : 'border-white/10'}`}>
                            <span className="text-2xl drop-shadow-glow">{p.avatar}</span>
                          </div>
                          <div className="flex flex-col drop-shadow-md">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${p.id === 'me' ? 'text-white' : 'text-slate-500'}`}>{p.name}</span>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div className={`h-full transition-all duration-500 ${p.id === 'me' ? 'bg-indigo-400' : 'bg-slate-700'}`} style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-[8px] font-black text-indigo-400 tracking-tighter">{Math.floor(progress)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col justify-center relative shadow-md"><p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mb-1 leading-none">Timer</p><div className="flex items-center gap-2"><Clock size={16} style={{ color: isFrozen ? '#60a5fa' : 'rgb(var(--accent-primary))' }} className={isFrozen ? 'animate-pulse' : ''} /><p className={`text-base font-black text-white font-mono tracking-tighter leading-none ${isFrozen ? 'text-blue-400' : ''}`}>{gameMode === GameMode.TIME_ATTACK ? formattedTime(timeLeft) : formattedTime(elapsedTime)}</p></div></div>
                <StatsCard label="Speed" value={`${currentWpmDisplay} WPM`} icon={<Zap />} color={profile.accentColor} />
                <StatsCard label="Precision" value={`${currentAccuracyDisplay}%`} icon={<Target />} color="emerald" />
                <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col justify-center shadow-md"><p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mb-1 leading-none">Adaptive Mode</p><div className="flex gap-2 min-h-[32px] items-center">{problemKeys.slice(0, 3).map(k => (<span key={k} className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded text-[9px] font-black uppercase border border-rose-500/20">{k}</span>))}{problemKeys.length === 0 && <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Normal</span>}</div></div>
              </div>

              <div className="relative group mb-10">
                <div className={`glass rounded-[2rem] p-10 min-h-[220px] flex items-center justify-center text-base md:text-xl font-mono leading-relaxed select-none transition-all duration-700 shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)] ${isOverdrive ? 'ring-2 ring-indigo-500/30' : 'border border-white/10'}`}>
                  {loading ? (
                    <div className="flex flex-col items-center gap-6 py-4">
                      <img src="https://ewdrrhdsxjrhxyzgjokg.supabase.co/storage/v1/object/public/assets/loading.gif" alt="Loading..." className="w-[100px] h-[100px] object-contain" />
                      <p className="text-[11px] font-black uppercase tracking-[0.6em] animate-pulse text-indigo-400">{loadingMsg}</p>
                    </div>
                  ) : !isActive ? (
                    <div className="flex flex-col items-center justify-center gap-8 py-8 w-full max-w-lg">
                      <div className="space-y-4 w-full text-center">
                        <p className="text-slate-600 italic uppercase text-[10px] tracking-[0.4em]">Initialize Mission Parameters</p>
                        
                        <div className="flex gap-2 justify-center">
                           {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
                             <button key={d} 
                               onClick={() => { setDifficulty(d); loadNewText(d); }} 
                               className={`px-6 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 ${difficulty === d ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' : 'border-white/5 bg-black/50 text-slate-700 hover:text-white'}`}
                             >
                               {d}
                             </button>
                           ))}
                        </div>

                        <div className="relative group/input max-w-sm mx-auto">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover/input:text-indigo-400 transition-colors" size={14} />
                          <input 
                            type="text" 
                            placeholder="INJECT TOPIC (E.G. NEON NIGHTS)" 
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value.toUpperCase())}
                            className="w-full bg-black/50 border border-white/5 rounded-xl py-4 pl-12 pr-6 text-[9px] font-black uppercase tracking-widest text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full text-left font-medium drop-shadow-glow">
                      {currentText.split('').map((c, i) => (
                        <span key={i} className={`transition-all duration-75 ${i < userInput.length ? (userInput[i] === c ? 'text-white/90 brightness-150 font-bold' : 'bg-rose-500/20 text-rose-500 rounded px-1.5') : i === userInput.length ? `text-white border-b-2 animate-pulse` : 'text-white/10'}`} 
                              style={{ borderBottomColor: i === userInput.length ? 'rgb(var(--accent-primary))' : 'transparent' }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
                <input ref={inputRef} value={userInput} onChange={handleInputChange} disabled={!isActive || loading || isTypingOut} className="absolute inset-0 opacity-0 cursor-default" autoFocus />
              </div>

              {showGuide && isActive && !loading && !isTypingOut && <div className="mb-10 animate-in slide-in-from-top-4 duration-500"><TypingGuide nextChar={currentText[userInput.length]} accentColor={profile.accentColor} /></div>}

              <div className="mt-4 flex flex-col items-center">
                <button onClick={isActive ? () => { setIsActive(false); setCurrentText(""); } : startGame} className={`group relative px-12 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.4em] text-[11px] transition-all shadow-3xl overflow-hidden hover:scale-105 active:scale-95 ${isActive ? 'bg-white/5 text-slate-500 border border-white/10' : `text-white bg-gradient-to-r ${ACCENT_COLORS[profile.accentColor as keyof typeof ACCENT_COLORS]} ring-4 ring-indigo-500/20 shadow-[0_10px_40px_-10px_rgba(var(--accent-primary),0.5)]`}`}>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-30 transition-opacity" />
                  <div className="relative flex items-center gap-3">{isActive ? <RotateCcw size={20} /> : <Play size={20} />} {isActive ? 'Abort Race' : 'Execute Mission'}</div>
                </button>
              </div>
            </main>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
