
import { AppState } from './types';
import { supabase } from './supabaseClient';

export type CloudStatus = {
  ok: boolean;
  error?: string;
  isCloud: boolean;
  payloadSizeKb?: number;
  rowCount?: number;
};

// Hard limit to stay in Vercel/Netlify Free Tier forever (300KB is very safe)
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
 * FREE FOREVER PROTECTOR: 
 * Strips all "heavy" data like Base64 images and massive strings.
 * This ensures your Supabase Database stays under 500MB and Bandwidth under 5GB.
 */
export const nuclearScrub = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const scrubbed = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      // If a string is Base64 or over 300 chars, it's a billing risk. Replace it.
      if (value.startsWith('data:') || value.length > 300) {
        (scrubbed as any)[key] = "[PROTECTED_FOR_FREE_TIER]";
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
 * Storage Upload:
 * Images go to 'Storage' (1GB free), NOT 'Database' (500MB free).
 * This keeps the main data sync lightning fast and free.
 */
export const uploadImage = async (file: File, folder: string): Promise<string | null> => {
  try {
    // Compression check: Reject if file is over 2MB to save storage space
    if (file.size > 2 * 1024 * 1024) {
      alert("File too large (Max 2MB). Please compress your image to save space.");
      return null;
    }

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

export const syncAppStateToCloud = async (state: AppState) => {
  if (!state.users || state.users.length === 0) return;

  const { currentUser, ...persistentData } = state;
  const optimizedData = nuclearScrub(persistentData);
  const sizeKb = JSON.stringify(optimizedData).length / 1024;

  if (sizeKb > MAX_PAYLOAD_KB) {
    console.error(`Sync Blocked: Payload ${sizeKb.toFixed(1)}KB is too large for the safety limit.`);
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
  } catch (err) {
    console.warn('Sync failed:', err);
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
    return data?.data as Partial<AppState> || null;
  } catch (err) {
    return null;
  }
};
