
import { AppState } from './types';
import { supabase } from './supabaseClient';

export type CloudStatus = {
  ok: boolean;
  error?: string;
  isCloud: boolean;
};

/**
 * Checks if the Supabase connection is working and the required table exists.
 */
export const checkCloudHealth = async (): Promise<CloudStatus> => {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('id')
      .limit(1);

    if (error) {
      return { ok: false, isCloud: true, error: error.message };
    }
    return { ok: true, isCloud: true };
  } catch (err: any) {
    return { ok: false, isCloud: true, error: err.message };
  }
};

/**
 * Syncs the local state to Supabase.
 * We store the entire state in a single row for simplicity in this architecture,
 * though in a massive app you'd use individual tables.
 */
export const syncAppStateToCloud = async (state: AppState) => {
  if (!state.users || state.users.length === 0) return;

  const { currentUser, ...persistentData } = state;

  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ 
        id: 'main_storage', 
        data: persistentData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
  } catch (err) {
    console.warn('Supabase Sync Failed:', err);
  }
};

/**
 * Fetches state from Supabase.
 */
export const fetchAppStateFromCloud = async (): Promise<Partial<AppState> | null> => {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 'main_storage')
      .single();

    if (error || !data) return null;
    return data.data as Partial<AppState>;
  } catch (err) {
    console.error('Fetch error:', err);
    return null;
  }
};
