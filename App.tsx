
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trophy, Zap, Target, RotateCcw, Play, Rocket, Settings as SettingsIcon,
  Gamepad2, LogOut, X, Volume2, VolumeX, Github, Globe, User, EyeOff, Eye, 
  Activity, Dna, Clock, Lock, ShieldAlert, AlertCircle, Timer, Download, Upload, FileJson
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
  const [user, setUser] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isZen, setIsZen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [hasUsedSolo, setHasUsedSolo] = useState<boolean | null>(null); // null means checking
  
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Profile recovery failed, resetting to default.", e);
    }
    return { username: 'Guest Player', avatar: '😊', accentColor: 'indigo' };
  });

  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('pomodoro_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Pomodoro settings corrupted, resetting.", e);
    }
    return { enabled: true, defaultMinutes: 25, size: 'medium' };
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
    if (user) {
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
      saveUserPreferences(user.id, prefs).catch(err => console.error("Cloud save failed:", err));
    }
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
              setPomodoroSettings(prefs.pomodoro_settings || { enabled: true, defaultMinutes: 25, size: 'medium' });
              setAiOpponentCount(prefs.ai_opponent_count);
              setAiOpponentDifficulty(prefs.ai_opponent_difficulty);
              setCalibratedKeys(new Set(prefs.calibrated_keys));
              setKeyMappings(prefs.key_mappings || {});
            }
            fetchHistory(newUser.id);
            setHasUsedSolo(null); 
          } else {
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
      } catch (err) {
        console.error("Auth initialization failed:", err);
      }
    };
    initializeAuth();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isActive && !loading && !isTypingOut) {
        if (e.key === '1' && powerUps[0]) { e.preventDefault(); usePowerUp(powerUps[0].type); return; }
        if (e.key === '2' && powerUps[1]) { e.preventDefault(); usePowerUp(powerUps[1].type); return; }
        if (e.key === '3' && powerUps[2]) { e.preventDefault(); usePowerUp(powerUps[2].type); return; }
      }
      const physicalKey = e.key.toLowerCase();
      const logicalKey = keyMappings[physicalKey];
      if (logicalKey && isActive && document.activeElement === inputRef.current) {
        e.preventDefault();
        if (logicalKey === 'backspace') {
          handleInputChange({ target: { value: userInput.slice(0, -1) } } as any);
        } else if (logicalKey.length === 1) {
          handleInputChange({ target: { value: userInput + logicalKey } } as any);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isActive, powerUps, keyMappings, userInput, loading, isTypingOut]);

  const currentWpm = useMemo(() => {
    if (elapsedTime <= 0) return 0;
    const typedLength = gameMode === GameMode.TIME_ATTACK ? correctKeys : userInput.length;
    return Math.round((typedLength / 5) / (elapsedTime / 60));
  }, [elapsedTime, userInput.length, correctKeys, gameMode]);

  const currentAccuracy = totalKeys > 0 ? Math.round(((totalKeys - errors) / totalKeys) * 100) : 100;
  const isOverdrive = streak >= 20 || currentWpm >= 90;

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

  useEffect(() => {
    if (isActive && startTime && !loading && !isTypingOut) {
      timerRef.current = window.setInterval(() => {
        if (!isFrozen) {
          if (gameMode === GameMode.TIME_ATTACK) { setTimeLeft(prev => { if (prev <= 0.1) { completeRace(); return 0; } return prev - 0.1; }); }
          setElapsedTime(prev => prev + 0.1);
          setPlayers(prev => prev.map(p => {
            if (!p.isBot && !p.isGhost) return p;
            let moveChance = 0;
            if (p.isGhost) { const pbWpm = parseInt(localStorage.getItem(`pb_${difficulty}_${gameMode}`) || '0'); moveChance = (pbWpm / 60) * 0.1 * 4.8; }
            else { 
              let speedMult = isSlowed ? 0.35 : 1.0; 
              let baseSpeed = 0.32;
              switch (aiOpponentDifficulty) {
                case Difficulty.EASY: baseSpeed = 0.12; break;
                case Difficulty.MEDIUM: baseSpeed = 0.32; break;
                case Difficulty.HARD: baseSpeed = 0.65; break;
                case Difficulty.PRO: baseSpeed = 0.85; break;
                case Difficulty.INSANE: baseSpeed = 1.10; break;
              }
              moveChance = baseSpeed * speedMult * (p.id.includes('bot') ? (1 + (parseInt(p.id.slice(-1)) * 0.03)) : 1); 
            }
            return { ...p, index: Math.min(p.index + (Math.random() < moveChance ? 1 : 0), currentText.length) };
          }));
        }
      }, 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, startTime, isFrozen, isSlowed, gameMode, loading, isTypingOut, aiOpponentDifficulty, currentText.length]);

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
      const seed = gameMode === GameMode.DAILY ? new Date().toISOString().split('T')[0] : undefined;
      if (provider === AIProvider.GEMINI) text = await fetchTypingText(customDiff || difficulty, "General", seed);
      else text = await fetchGithubTypingText(customDiff || difficulty, "General", githubToken);
      if (rid !== requestCounter.current) return;
      const cleaned = normalizeText(text.trim());
      setCurrentText(cleaned); setLoading(false); runTypewriter(cleaned);
    } catch (e: any) {
      console.error("AI text generation failed.", e);
      if (rid !== requestCounter.current) return;
      setLoading(false); setCurrentText("Failed to load AI text. Please check your connection.");
    }
  };

  const resetGameStats = () => {
    setUserInput(""); setElapsedTime(0); setTimeLeft(60); setErrors(0); setTotalKeys(0);
    setCorrectKeys(0); setStreak(0); setStartTime(null);
    setPowerUps([]); setIsFrozen(false); setIsSlowed(false); setErrorMap({});
    const pb = localStorage.getItem(`pb_${difficulty}_${gameMode}`);
    const initialPlayers: PlayerState[] = [{ id: 'me', name: profile.username, index: 0, errors: 0, isBot: false, avatar: profile.avatar }];
    if (pb) initialPlayers.push({ id: 'ghost', name: 'Personal Best', index: 0, errors: 0, isBot: false, isGhost: true, avatar: '👻' });
    
    if (gameMode === GameMode.COMPETITIVE) {
      const bots = [
        { name: 'Alex', avatar: '🤖' }, 
        { name: 'Jordan', avatar: '😎' }, 
        { name: 'Riley', avatar: '🦊' },
        { name: 'Sam', avatar: '🤖' },
        { name: 'Casey', avatar: '🤖' }
      ];
      for (let i = 0; i < aiOpponentCount; i++) {
        initialPlayers.push({ id: `bot${i+1}`, name: bots[i % bots.length].name, avatar: bots[i % bots.length].avatar, index: 0, errors: 0, isBot: true });
      }
    } else if (gameMode !== GameMode.SOLO) {
      initialPlayers.push({ id: 'bot1', name: 'Bot One', avatar: '🤖', isBot: true, index: 0, errors: 0 });
    }
    setPlayers(initialPlayers);
  };

  useEffect(() => { resetGameStats(); }, []);

  const startGame = async () => {
    if (!user) {
      const used = await checkIpSoloUsage();
      if (used) {
        setHasUsedSolo(true);
        setShowRestrictedModal(true);
        return;
      }
      if (gameMode !== GameMode.SOLO) {
        setShowRestrictedModal(true);
        return;
      }
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
    const wpm = currentWpm; const accuracy = currentAccuracy;
    if (user) {
      const pbKey = `pb_${difficulty}_${gameMode}`;
      const currentPb = parseInt(localStorage.getItem(pbKey) || '0');
      if (wpm > currentPb) localStorage.setItem(pbKey, wpm.toString());
      const note = await getCoachReport(provider, githubToken, wpm, accuracy, errors, Object.keys(errorMap));
      const result: TypingResult = { id: Date.now().toString(), date: new Date().toISOString(), wpm, accuracy, time: duration, errors, difficulty, mode: gameMode, textLength: currentText.length, errorMap, coachNote: note };
      await supabase.from('history').insert([{ ...result, user_id: user.id }]);
      setHistory(prev => [result, ...prev].slice(0, 50));
    } else if (gameMode === GameMode.SOLO) {
      try {
        await recordIpSoloUsage();
        setHasUsedSolo(true);
      } catch (err) {
        console.error("Failed to log anonymous run.", err);
      }
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
    const totalKeys = history.reduce((acc, curr) => acc + (curr.textLength || 0), 0);
    
    const stats: ZippyStats = {
      level: Math.floor(totalKeys / 1000) + 1,
      topWPM: maxWpm,
      accuracy: avgAcc,
      totalKeystrokes: totalKeys,
      problemKeys: Object.keys(errorMap).slice(0, 10)
    };
    
    const blob = saveZippyData(stats);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zippy_save_${new Date().toISOString().split('T')[0]}.ztx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const stats = await loadZippyData(file);
      alert(`Import Successful!\nLevel: ${stats.level}\nTop WPM: ${stats.topWPM.toFixed(1)}\nAccuracy: ${stats.accuracy.toFixed(1)}%`);
    } catch (err: any) {
      alert(`Import Failed: ${err.message}`);
    }
  };

  const formattedTime = (time: number) => { const mins = Math.floor(time / 60); const secs = (time % 60).toFixed(1); return `${mins}:${secs.padStart(4, '0')}`; };

  const checkRestricted = (targetView: AppView) => {
    if (!user && (targetView === AppView.PROFILE || targetView === AppView.SETTINGS)) {
      setShowRestrictedModal(true); return;
    }
    setCurrentView(targetView);
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 flex flex-col items-center transition-all duration-700`}>
      {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      {user && pomodoroSettings.enabled && <PomodoroTimer settings={pomodoroSettings} />}
      
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
            <div className="glass rounded-[2rem] p-10 border border-white/10 shadow-2xl"><KeyboardTester testedKeys={calibratedKeys} onTestedKeysChange={setCalibratedKeys} mappings={keyMappings} onMappingChange={setKeyMappings} /></div>
            
            <div className="glass rounded-[2rem] p-10 space-y-10 border border-white/10 shadow-2xl">
               <div className="flex items-center gap-3"><div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20"><FileJson size={22} /></div><h2 className="text-base font-black text-white uppercase tracking-tighter">Data Management</h2></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                      Securely backup your progress using the high-performance ZippyType Protocol (.ztx).
                    </p>
                    <button 
                      onClick={handleExport}
                      className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all shadow-xl active:scale-95"
                    >
                      <Download size={16} /> Export Protocol (.ztx)
                    </button>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                      Restore mission data from a local .ztx file. Integrity checks are applied automatically.
                    </p>
                    <label className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-xl text-[9px] uppercase tracking-widest transition-all cursor-pointer border border-white/10 shadow-xl active:scale-95">
                      <Upload size={16} /> Import Protocol (.ztx)
                      <input type="file" accept=".ztx" onChange={handleImport} className="hidden" />
                    </label>
                  </div>
               </div>
            </div>

            <div className="glass rounded-[2rem] p-10 space-y-10 border border-white/10 shadow-2xl">
               <div className="flex items-center gap-3"><div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20"><Timer size={22} /></div><h2 className="text-base font-black text-white uppercase tracking-tighter">Timer Settings</h2></div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                 <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Pomodoro Timer</label>
                   <button onClick={() => setPomodoroSettings({...pomodoroSettings, enabled: !pomodoroSettings.enabled})} className={`w-full py-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${pomodoroSettings.enabled ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-black/50 text-slate-500 border border-white/5'}`}>{pomodoroSettings.enabled ? 'Enabled' : 'Disabled'}</button>
                 </div>
                 <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Default Focus (Min)</label>
                   <input type="number" value={pomodoroSettings.defaultMinutes} onChange={e => setPomodoroSettings({...pomodoroSettings, defaultMinutes: Math.max(1, parseInt(e.target.value) || 1)})} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-bold text-sm outline-none focus:border-purple-500 transition-all" />
                 </div>
                 <div className="space-y-3">
                   <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Widget Size</label>
                   <div className="flex gap-2">
                     {(['small', 'medium', 'large'] as const).map(s => (
                       <button key={s} onClick={() => setPomodoroSettings({...pomodoroSettings, size: s})} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${pomodoroSettings.size === s ? 'bg-purple-600 text-white' : 'bg-black/50 text-slate-500 border border-white/5'}`}>{s}</button>
                     ))}
                   </div>
                 </div>
               </div>
            </div>

            <div className="glass rounded-[2rem] p-10 space-y-10 border border-white/10 shadow-2xl">
               <div className="flex items-center gap-3"><div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20"><Globe size={22} /></div><h2 className="text-base font-black text-white uppercase tracking-tighter">Advanced AI Config</h2></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Text Generator</label><div className="flex bg-black/50 p-1.5 rounded-xl border border-white/5 shadow-inner"><button onClick={() => setProvider(AIProvider.GEMINI)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.GEMINI ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Globe size={12}/> Gemini</button><button onClick={() => setProvider(AIProvider.GITHUB)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${provider === AIProvider.GITHUB ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Github size={12}/> GPT-4o</button></div></div>
                  {provider === AIProvider.GITHUB && (<div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Access Token</label><input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} placeholder="ghp_..." className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-mono text-xs outline-none focus:border-purple-500 transition-all shadow-inner" /></div>)}
                </div>
                <div className="space-y-8"><div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">AI Competitors (1-5)</label><div className="flex items-center px-1"><input type="range" min="1" max="5" value={aiOpponentCount} onChange={e => setAiOpponentCount(parseInt(e.target.value))} className="flex-1 accent-indigo-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer" /></div></div><div className="space-y-3"><label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Bot Difficulty</label><div className="flex flex-wrap bg-black/50 p-1.5 rounded-xl border border-white/5 gap-2 shadow-inner">{[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, Difficulty.PRO, Difficulty.INSANE].map(d => (<button key={d} onClick={() => setAiOpponentDifficulty(d)} className={`flex-1 py-3 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${aiOpponentDifficulty === d ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{d}</button>))}</div></div></div>
              </div>
            </div>
          </div>
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
                <div className="mb-8 space-y-2">
                  {players.map(p => (
                    <div key={p.id} className="progress-lane relative h-12 rounded-xl overflow-hidden group shadow-inner border border-white/5">
                      <div className={`absolute inset-y-0 left-0 transition-all duration-300 ${p.isGhost ? 'bg-white/5 border-r border-white/10' : p.id === 'me' ? `bg-gradient-to-r ${ACCENT_COLORS[profile.accentColor as keyof typeof ACCENT_COLORS]} opacity-25 border-r border-white/20` : 'bg-slate-500/5 border-r border-slate-500/10'}`} style={{ width: `${(p.index / Math.max(currentText.length, 1)) * 100}%` }} />
                      <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-300 flex items-center gap-4 px-8 whitespace-nowrap" style={{ left: `${Math.min((p.index / Math.max(currentText.length, 1)) * 100, 95)}%` }}><span className="text-2xl drop-shadow-lg">{p.avatar}</span><span className={`text-[8px] font-black uppercase tracking-[0.3em] ${p.id === 'me' ? 'text-white' : 'text-slate-600'}`}>{p.name}</span></div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col justify-center relative shadow-md"><p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mb-1 leading-none">Timer</p><div className="flex items-center gap-2"><Clock size={16} style={{ color: isFrozen ? '#60a5fa' : 'rgb(var(--accent-primary))' }} className={isFrozen ? 'animate-pulse' : ''} /><p className={`text-base font-black text-white font-mono tracking-tighter leading-none ${isFrozen ? 'text-blue-400' : ''}`}>{gameMode === GameMode.TIME_ATTACK ? formattedTime(timeLeft) : formattedTime(elapsedTime)}</p></div></div>
                <StatsCard label="Speed" value={`${currentWpm} WPM`} icon={<Zap />} color={profile.accentColor} />
                <StatsCard label="Precision" value={`${currentAccuracy}%`} icon={<Target />} color="emerald" />
                <div className="glass p-4 rounded-2xl border border-white/10 flex flex-col justify-center shadow-md"><p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.3em] mb-1 leading-none">Abilities</p><div className="flex gap-3 min-h-[32px]">{powerUps.map((p, i) => (<button key={p.id} onClick={() => usePowerUp(p.type)} className="w-8 h-8 group relative flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-lg transition-all border border-white/10 shadow-lg active:scale-90">{p.icon}<div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-[7px] font-black text-white shadow-lg ring-1 ring-slate-900">{i + 1}</div></button>))}{powerUps.length === 0 && <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest leading-[32px]">None</span>}</div></div>
              </div>

              <div className="relative group">
                <div className={`glass rounded-[2rem] p-10 min-h-[220px] flex items-center justify-center text-base md:text-xl font-mono leading-relaxed select-none transition-all duration-700 shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)] ${isOverdrive ? 'ring-2 ring-indigo-500/30' : 'border border-white/10'}`}>
                  {loading ? (
                    <div className="flex flex-col items-center gap-6 py-4">
                      <img 
                        src="https://ewdrrhdsxjrhxyzgjokg.supabase.co/storage/v1/object/public/assets/loading.gif" 
                        alt="Loading..." 
                        className="w-[100px] h-[100px] object-contain" 
                        onLoad={() => console.log("Success: Asset loaded successfully from Supabase.")}
                        onError={(e) => {
                          console.error("Critical Asset Missing: Supabase loading.gif not found.");
                          (e.target as HTMLImageElement).src = "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJocmd0Z3o1bHpxeDN4ZHR4ZHR4ZHR4ZHR4ZHR4ZHR4ZHR4ZHR4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7bu3XilJ5BOiSGic/giphy.gif"; 
                        }}
                      />
                      <p className="text-[11px] font-black uppercase tracking-[0.6em] animate-pulse text-indigo-400">{loadingMsg}</p>
                    </div>
                  ) : !isActive ? (
                    <div className="flex flex-col items-center justify-center gap-5 py-8">
                      {!user && hasUsedSolo && gameMode === GameMode.SOLO ? (
                         <p className="text-rose-500 uppercase text-[10px] font-black tracking-[0.5em] animate-pulse text-center leading-relaxed">Solo limit reached.<br/>Please log in to continue.</p>
                      ) : (
                        <p className="text-slate-600 italic uppercase text-[10px] tracking-[0.4em]">Press Execute to Start Race</p>
                      )}
                    </div>
                  ) : isTypingOut ? (
                    <div className="w-full text-left opacity-20 text-slate-400">{displayedText}</div>
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

              <div className="mt-10 flex flex-col items-center">
                <button 
                  onClick={isActive ? () => setIsActive(false) : startGame} 
                  className={`group relative px-10 py-4 rounded-[1.25rem] font-black uppercase tracking-[0.3em] text-[10px] transition-all shadow-2xl overflow-hidden hover:scale-105 active:scale-95 ${isActive ? 'bg-white/5 text-slate-500 border border-white/10' : `text-white bg-gradient-to-r ${ACCENT_COLORS[profile.accentColor as keyof typeof ACCENT_COLORS]}`}`}>
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-30 transition-opacity" />
                  <div className="relative flex items-center gap-3">
                    {isActive ? <RotateCcw size={18} /> : <Play size={18} />} 
                    {isActive ? 'Reset Race' : 'Execute Mission'}
                  </div>
                </button>
              </div>
            </main>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass p-8 rounded-[2rem] border border-white/10 relative overflow-hidden group shadow-xl">
                {!user && (
                   <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in">
                      <Lock size={32} className="text-indigo-400/30 mb-4" />
                      <p className="text-[9px] font-black uppercase text-white/30 tracking-[0.5em]">Stats Protected</p>
                   </div>
                )}
                <h3 className="text-[11px] font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tighter"><Activity style={{ color: 'rgb(var(--accent-primary))' }} size={18}/> Performance Chart</h3>
                <HistoryChart history={history} />
              </div>

              <div className="glass p-8 rounded-[2rem] border border-white/10 relative overflow-hidden group shadow-xl">
                {!user && (
                   <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in">
                      <Lock size={32} className="text-indigo-400/30 mb-4" />
                      <p className="text-[9px] font-black uppercase text-white/30 tracking-[0.5em]">History Hidden</p>
                   </div>
                )}
                <h3 className="text-[11px] font-black text-white mb-6 flex items-center gap-3 uppercase tracking-tighter"><Trophy className="text-amber-400" size={18}/> Recent Races</h3>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {history.slice(0, 10).map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-black/50 p-5 rounded-2xl border border-white/5 transition-all hover:bg-white/10 shadow-lg">
                      <div className="flex items-center gap-5">
                        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center font-black text-base shadow-inner" style={{ color: 'rgb(var(--accent-primary))' }}>{item.wpm}</div>
                        <div>
                          <div className="text-white text-[9px] font-black uppercase tracking-[0.15em]">{item.difficulty} • {item.mode}</div>
                          <div className="text-slate-600 text-[8px] font-bold mt-1 uppercase tracking-widest">{new Date(item.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-black text-base leading-none">{item.accuracy}%</div>
                        <div className="text-slate-700 text-[8px] font-black uppercase tracking-widest mt-1.5">Accuracy</div>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && <p className="text-center text-[10px] font-black text-slate-700 uppercase tracking-widest py-14">No race records found</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <footer className="mt-16 text-slate-800 text-[9px] font-black uppercase tracking-[0.6em] opacity-40 pb-12 text-center">ZippyType v3.7 • Professional Edition</footer>
    </div>
  );
};

export default App;
