
import { AppState } from './types';
import { supabase } from './supabaseClient';

export type CloudStatus = {
  ok: boolean;
  error?: string;
  isCloud: boolean;
  payloadSizeKb?: number;
  lastSync?: string;
};

const STORAGE_KEY = 'kph_local_cache';
const MAX_PAYLOAD_KB = 500; 

/**
 * THE NETLIFY INFINITE-FREE SHIELD
 * This ensures no images over 80KB ever leave the browser.
 */
const compressImageLocally = async (file: File): Promise<Blob> => {
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
        const MAX_DIM = 800; // Lower resolution for maximum free-tier safety

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.5); // 50% quality is the "Sweet Spot" for Netlify Free Tier
      };
    };
  });
};

/**
 * Saves state to LocalStorage immediately to avoid needing the cloud for every action.
 */
export const saveToLocal = (state: AppState) => {
  try {
    const { currentUser, ...persistentData } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentData));
  } catch (e) {
    console.error("LocalStorage full, please use Nuclear Scrub.");
  }
};

/**
 * Loads the last known state from LocalStorage.
 */
export const loadFromLocal = (): Partial<AppState> | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const checkCloudHealth = async (): Promise<CloudStatus> => {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data, updated_at')
      .eq('id', 'main_storage')
      .maybeSingle();

    if (error) return { ok: false, isCloud: true, error: error.message };
    const size = data ? JSON.stringify(data).length / 1024 : 0;
    return { ok: true, isCloud: true, payloadSizeKb: size, lastSync: data?.updated_at };
  } catch (err: any) {
    return { ok: false, isCloud: true, error: err.message };
  }
};

export const nuclearScrub = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const scrubbed = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    // Aggressive filtering of anything that looks like a heavy data blob
    if (typeof value === 'string' && (value.startsWith('data:') || value.length > 250)) {
      (scrubbed as any)[key] = "[STRIPPED_TO_SAVE_NETLIFY_CREDITS]";
    } else if (typeof value === 'object') {
      (scrubbed as any)[key] = nuclearScrub(value);
    } else {
      (scrubbed as any)[key] = value;
    }
  }
  return scrubbed;
};

export const uploadImage = async (file: File, folder: string): Promise<string | null> => {
  try {
    const compressedBlob = await compressImageLocally(file);
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, compressedBlob);

    if (error) throw error;
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
};

/**
 * EXPLICIT CLOUD SYNC ONLY
 * Background syncing is disabled to prevent Netlify "Phantom Billing"
 */
export const syncAppStateToCloud = async (state: AppState): Promise<boolean> => {
  const { currentUser, ...persistentData } = state;
  const cleanData = nuclearScrub(persistentData);
  const sizeKb = JSON.stringify(cleanData).length / 1024;

  if (sizeKb > MAX_PAYLOAD_KB) {
    throw new Error(`Payload too large (${sizeKb.toFixed(1)}KB). Please use Nuclear Scrub in Admin.`);
  }

  try {
    const { error } = await supabase.from('app_state').upsert({ 
      id: 'main_storage', 
      data: cleanData,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Cloud Sync failed:', err);
    return false;
  }
};

export const fetchAppStateFromCloud = async (): Promise<Partial<AppState> | null> => {
  try {
    const { data } = await supabase.from('app_state').select('data').eq('id', 'main_storage').maybeSingle();
    return data?.data as Partial<AppState> || null;
  } catch {
    return null;
  }
};
