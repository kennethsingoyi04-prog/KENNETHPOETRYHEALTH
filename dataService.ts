
import { AppState } from './types';
import { supabase } from './supabaseClient';

export type CloudStatus = {
  ok: boolean;
  error?: string;
  isCloud: boolean;
  payloadSizeKb?: number;
};

// Hard limit to stay in Vercel's Free Tier forever
const MAX_PAYLOAD_KB = 300; 

/**
 * Checks if the Supabase connection is working and returns payload size.
 */
export const checkCloudHealth = async (): Promise<CloudStatus> => {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 'main_storage')
      .maybeSingle();

    if (error) {
      return { ok: false, isCloud: true, error: error.message };
    }
    
    const jsonString = data ? JSON.stringify(data) : "";
    const size = jsonString.length / 1024;
    return { ok: true, isCloud: true, payloadSizeKb: size };
  } catch (err: any) {
    return { ok: false, isCloud: true, error: err.message };
  }
};

/**
 * AGGRESSIVE SCRUBBER: 
 * Ensures the JSON payload is strictly metadata. 
 * Any string over 500 chars is considered a potential threat to bandwidth.
 */
export const nuclearScrub = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const scrubbed = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      // If a string is suspiciously long (like Base64), strip it.
      if (value.startsWith('data:') || value.length > 500) {
        (scrubbed as any)[key] = "[BANDWIDTH_SAFETY_REMOVAL]";
      } else {
        (scrubbed as any)[key] = value;
      }
    } else if (typeof value === 'object') {
      (scrubbed as any)[key] = nuclearScrub(value);
    } else {
      (scrubbed as any)[key] = value;
    }
  }
  return scrubbed;
};

/**
 * Safe Image Upload:
 * Stores images in Supabase Storage (which doesn't count against Vercel bandwidth).
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
 * BANDWIDTH-GUARDED SYNC:
 * Refuses to sync if the data would exceed the free tier safety limit.
 */
export const syncAppStateToCloud = async (state: AppState) => {
  if (!state.users || state.users.length === 0) return;

  const { currentUser, ...persistentData } = state;
  const optimizedData = nuclearScrub(persistentData);
  const sizeKb = JSON.stringify(optimizedData).length / 1024;

  // PROTECTION: Prevent billing by blocking massive syncs
  if (sizeKb > MAX_PAYLOAD_KB) {
    console.error(`CRITICAL: Payload size (${sizeKb.toFixed(1)}KB) exceeds safety limit. Sync blocked to prevent billing.`);
    return;
  }

  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ 
        id: 'main_storage', 
        data: optimizedData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    console.log(`Cloud Sync Success: ${sizeKb.toFixed(1)}KB used.`);
  } catch (err) {
    console.warn('Supabase Sync Failed:', err);
  }
};

export const fetchAppStateFromCloud = async (): Promise<Partial<AppState> | null> => {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 'main_storage')
      .maybeSingle();

    if (error) return null;
    if (!data) return null;
    return data.data as Partial<AppState>;
  } catch (err) {
    return null;
  }
};
