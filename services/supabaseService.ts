
import { createClient } from '@supabase/supabase-js';
import { UserPreferences, AIProvider, Difficulty } from '../types';

const supabaseUrl = 'https://ewdrrhdsxjrhxyzgjokg.supabase.co';
const supabaseAnonKey = 'sb_publishable_VOd9I9_yUqlHFPBfkoCtfA_FtttMyKc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const saveUserPreferences = async (userId: string, prefs: UserPreferences) => {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ 
      user_id: userId, 
      ai_provider: prefs.ai_provider,
      github_token: prefs.github_token,
      pilot_profile: prefs.user_profile, // Keeping DB column name for simplicity or mapping if needed
      pomodoro_settings: prefs.pomodoro_settings,
      ai_opponent_count: prefs.ai_opponent_count,
      ai_opponent_difficulty: prefs.ai_opponent_difficulty,
      calibrated_keys: prefs.calibrated_keys,
      key_mappings: prefs.key_mappings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  
  if (error) console.error('Error saving preferences:', error);
  return !error;
};

export const loadUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return null;
    if (!data) return null;

    return {
      ai_provider: data.ai_provider as AIProvider,
      github_token: data.github_token || '',
      user_profile: data.pilot_profile,
      pomodoro_settings: data.pomodoro_settings || { enabled: true, defaultMinutes: 25, size: 'medium' },
      ai_opponent_count: data.ai_opponent_count || 1,
      ai_opponent_difficulty: (data.ai_opponent_difficulty as Difficulty) || Difficulty.MEDIUM,
      calibrated_keys: data.calibrated_keys || [],
      key_mappings: data.key_mappings || {}
    };
  } catch (e) {
    return null;
  }
};

export const linkUserToIp = async (userId: string) => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const { ip } = await res.json();
    await supabase.from('ip_sessions').upsert({ ip_address: ip, user_id: userId });
  } catch (e) {
    console.error('Failed to link IP to user', e);
  }
};

export const getUserIdByIp = async (): Promise<string | null> => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const { ip } = await res.json();
    const { data } = await supabase.from('ip_sessions').select('user_id').eq('ip_address', ip).maybeSingle();
    return data?.user_id || null;
  } catch {
    return null;
  }
};

export const checkIpSoloUsage = async (): Promise<boolean> => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const { ip } = await res.json();
    const { data } = await supabase.from('anonymous_runs').select('ip_address').eq('ip_address', ip).maybeSingle();
    return !!data;
  } catch {
    return false;
  }
};

export const recordIpSoloUsage = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const { ip } = await res.json();
    await supabase.from('anonymous_runs').upsert({ ip_address: ip });
  } catch (e) {
    console.error('Failed to record IP usage', e);
  }
};
