
export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  PRO = 'pro',
  INSANE = 'insane'
}

export enum GameMode {
  SOLO = 'solo',
  TIME_ATTACK = 'timed',
  COMPETITIVE = 'competitive',
  DAILY = 'daily'
}

export enum AIProvider {
  GEMINI = 'gemini',
  GITHUB = 'github'
}

export enum PowerUpType {
  SKIP_WORD = 'SKIP_WORD',
  TIME_FREEZE = 'TIME_FREEZE',
  SLOW_OPPONENTS = 'SLOW_OPPONENTS'
}

export enum AppView {
  GAME = 'game',
  SETTINGS = 'settings',
  PROFILE = 'profile',
  TUTORIALS = 'tutorials'
}

export interface UserProfile {
  username: string;
  avatar: string;
  accentColor: string;
}

export interface PomodoroSettings {
  enabled: boolean;
  defaultMinutes: number;
  size: 'small' | 'medium' | 'large';
}

export interface UserPreferences {
  ai_provider: AIProvider;
  github_token: string;
  user_profile: UserProfile;
  pomodoro_settings: PomodoroSettings;
  ai_opponent_count: number;
  ai_opponent_difficulty: Difficulty;
  calibrated_keys: string[];
  key_mappings: Record<string, string>;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  label: string;
  icon: string;
  description: string;
}

export interface TypingResult {
  id: string;
  date: string;
  wpm: number;
  accuracy: number;
  time: number;
  errors: number;
  difficulty: Difficulty;
  mode: GameMode;
  textLength: number;
  errorMap?: Record<string, number>;
  coachNote?: string;
}

export interface PlayerState {
  id: string;
  name: string;
  index: number;
  errors: number;
  isBot: boolean;
  isGhost?: boolean;
  avatar: string;
}

export interface GameConfig {
  difficulty: Difficulty;
  mode: GameMode;
  category: string;
  provider: AIProvider;
}
