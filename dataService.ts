
import { supabase } from './supabaseClient';
import { AppState } from './types';

/**
 * Robust check to see if the cloud is accessible.
 */
export const checkCloudHealth = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('system_data').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};

/**
 * Syncs the local state to Supabase securely.
 * This function now fails silently if the table doesn't exist.
 */
export const syncAppStateToCloud = async (state: AppState) => {
  // 1. NEVER sync the 'currentUser' to the global state. 
  // Session is private to the device.
  const { currentUser, ...persistentData } = state;
  
  // 2. Prevent syncing empty data over existing cloud data
  if (state.users.length <= 1 && !state.users.some(u => !u.isOwner)) {
    return;
  }

  try {
    const { error } = await supabase
      .from('system_data')
      .upsert({ 
        id: 'kph_global_state', 
        payload: persistentData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Sync failed (Table may be missing or RLS is ON):', error.message);
    }
  } catch (err) {
    // Background sync failure should not interrupt the user
  }
};

/**
 * Fetches cloud data without breaking the local session.
 */
export const fetchAppStateFromCloud = async (): Promise<Partial<AppState> | null> => {
  try {
    const { data, error } = await supabase
      .from('system_data')
      .select('payload')
      .eq('id', 'kph_global_state')
      .maybeSingle();

    if (error) throw error;
    return data?.payload as Partial<AppState> || null;
  } catch (err: any) {
    console.warn("Cloud fetch skipped:", err.message);
    return null;
  }
};
