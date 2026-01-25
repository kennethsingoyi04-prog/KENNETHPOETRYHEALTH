
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
const MAX_PAYLOAD_KB = 450; 

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
        const MAX_DIM = 700;

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
        }, 'image/jpeg', 0.45);
      };
    };
  });
};

export const saveToLocal = (state: AppState) => {
  try {
    const { currentUser, ...persistentData } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentData));
  } catch (e) {
    console.warn("LocalStorage storage spike detected.");
  }
};

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

/**
 * DATABASE SCRUBBER
 * Relaxed limit to ensure user addresses and long emails aren't lost.
 */
export const nuclearScrub = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const scrubbed = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    const value = obj[key];
    // Limit increased from 200 to 10,000 to protect data integrity
    if (typeof value === 'string' && (value.startsWith('data:') || value.length > 10000)) {
      (scrubbed as any)[key] = "[PROTECTED_FROM_BILLING]";
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
    console.error('Safe Upload Failed:', err);
    return null;
  }
};

export const syncAppStateToCloud = async (state: AppState): Promise<boolean> => {
  const { currentUser, ...persistentData } = state;
  const cleanData = nuclearScrub(persistentData);
  const sizeKb = JSON.stringify(cleanData).length / 1024;

  if (sizeKb > MAX_PAYLOAD_KB) {
    console.error(`Data size (${sizeKb.toFixed(1)}KB) too large.`);
    return false;
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
    console.error('Netlify Guard Sync Error:', err);
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
