
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
 * Uploads an image file to Supabase Storage and returns the public URL.
 * Helps prevent "Bandwidth Overlimit" issues by storing heavy files outside the JSON state.
 */
export const uploadImage = async (file: File, folder: string): Promise<string | null> => {
  try {
    const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (err) {
    console.error('Storage Upload Error:', err);
    return null;
  }
};

/**
 * Syncs the local state to Supabase.
 * Stores system-wide data (users, referrals, withdrawals) in a single master row.
 */
export const syncAppStateToCloud = async (state: AppState) => {
  if (!state.users || state.users.length === 0) return;

  // We exclude 'currentUser' from the cloud because it's a transient session variable
  const { currentUser, ...persistentData } = state;

  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ 
        id: 'main_storage', 
        data: persistentData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase Sync Error:', error.message);
      throw error;
    }
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
      .maybeSingle();

    if (error) {
      console.error('Fetch error:', error.message);
      return null;
    }
    
    if (!data) return null;
    return data.data as Partial<AppState>;
  } catch (err) {
    console.error('Fetch error:', err);
    return null;
  }
};
