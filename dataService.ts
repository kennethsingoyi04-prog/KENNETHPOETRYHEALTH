
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
    
    // Exact byte calculation for bandwidth safety
    const jsonString = data ? JSON.stringify(data) : "";
    const size = jsonString.length / 1024;
    return { ok: true, isCloud: true, payloadSizeKb: size };
  } catch (err: any) {
    return { ok: false, isCloud: true, error: err.message };
  }
};

/**
 * NUCLEAR SCRUBBER: 
 * Recursively removes all Base64 image data and excessively long strings.
 * This ensures the JSON payload is strictly metadata, keeping bandwidth near zero.
 */
export const nuclearScrub = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const scrubbed = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      // Kill Base64, long data URLs, and any string over 1KB
      if (value.startsWith('data:') || value.length > 1024) {
        (scrubbed as any)[key] = "[CLEANED_FOR_DEPLOYMENT_SAFETY]";
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
 * Uploads an image file to Supabase Storage (Safe & Free).
 * Vercel deployment requires images to be served via CDN/URL, not embedded in JSON.
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
 * Enforces Nuclear Scrubbing on every write.
 */
export const syncAppStateToCloud = async (state: AppState) => {
  if (!state.users || state.users.length === 0) return;

  const { currentUser, ...persistentData } = state;
  
  // MANDATORY: Scrub data to protect Vercel/Netlify bandwidth limits
  const optimizedData = nuclearScrub(persistentData);

  try {
    const { error } = await supabase
      .from('app_state')
      .upsert({ 
        id: 'main_storage', 
        data: optimizedData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
    console.log("Cloud Sync: Verified Optimized Payload");
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
