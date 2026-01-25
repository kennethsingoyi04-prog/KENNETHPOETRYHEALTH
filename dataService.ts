
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

// Netlify Request Guard: Prevents rapid-fire API calls
let syncTimeout: any = null;

/**
 * CLIENT-SIDE COMPRESSION TRICK (Netlify Bandwidth Shield)
 * Resizes images to max 1200px and 0.7 quality before they ever leave the browser.
 */
const compressImage = async (file: File): Promise<Blob> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 1200;

        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.7);
      };
    };
  });
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
 * Images are compressed locally FIRST to save Netlify Bandwidth.
 */
export const uploadImage = async (file: File, folder: string): Promise<string | null> => {
  try {
    // Perform local compression to save bandwidth
    const compressedBlob = await compressImage(file);
    const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, '_')}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, compressedBlob, { cacheControl: '3600', upsert: false });

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
 * REQUEST BATCHING TRICK (Netlify Function Shield)
 * Prevents multiple rapid requests to the server.
 */
export const syncAppStateToCloud = async (state: AppState) => {
  if (!state.users || state.users.length === 0) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
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
      console.log(`[NETLIFY SHIELD] Cloud Sync Optimized: ${sizeKb.toFixed(1)}KB`);
    } catch (err) {
      console.warn('Sync failed:', err);
    }
  }, 3000); // 3-second debounce to batch changes
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
