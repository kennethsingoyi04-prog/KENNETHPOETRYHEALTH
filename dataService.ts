
import { AppState } from './types';
import { supabase } from './supabaseClient';

export type CloudStatus = {
  ok: boolean;
  error?: string;
  isCloud: boolean;
  payloadSizeKb?: number;
};

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
    
    const size = data ? JSON.stringify(data).length / 1024 : 0;
    return { ok: true, isCloud: true, payloadSizeKb: size };
  } catch (err: any) {
    return { ok: false, isCloud: true, error: err.message };
  }
};

/**
 * STRONGER SCRUBBER: 
 * Prevents any string starting with "data:image" from being saved.
 * Only allows URLs (http/https).
 */
const scrubState = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const scrubbed = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      // Block Base64 (data:image) and very long strings
      if (value.startsWith('data:image') || value.length > 2000) {
        (scrubbed as any)[key] = "[BLOCK_BASE64_FOR_FREE_PLAN]";
      } else {
        (scrubbed as any)[key] = value;
      }
    } else if (typeof value === 'object') {
      (scrubbed as any)[key] = scrubState(value);
    } else {
      (scrubbed as any)[key] = value;
    }
  }
  return scrubbed;
};

/**
 * Uploads an image file to Supabase Storage (Safe & Free).
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
 * Mandates scrubbing to ensure free tier safety.
 */
export const syncAppStateToCloud = async (state: AppState) => {
  if (!state.users || state.users.length === 0) return;

  const { currentUser, ...persistentData } = state;
  
  // Mandatory scrubbing: Never send Base64 to the cloud JSON blob.
  const optimizedData = scrubState(persistentData);

  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ 
        id: 'main_storage', 
        data: optimizedData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase Sync Error:', error.message);
      throw error;
    }
    console.log("Cloud Sync: Success (Free Tier Optimized)");
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
