
import { supabase } from './supabaseClient';
import { AppState } from './types';

/**
 * Inserts a single record into a Supabase table.
 * Example: await insertRecord('users', { name: 'John' });
 */
export const insertRecord = async (table: string, data: any) => {
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select();
  
  if (error) {
    console.error(`Supabase Insert Error [${table}]:`, error.message);
    return { success: false, error };
  }
  return { success: true, data: result };
};

/**
 * Reads records from a Supabase table.
 * Example: await readRecords('withdrawals');
 */
export const readRecords = async (table: string, query = '*') => {
  const { data, error } = await supabase
    .from(table)
    .select(query);
  
  if (error) {
    console.error(`Supabase Read Error [${table}]:`, error.message);
    return { success: false, error };
  }
  return { success: true, data };
};

/**
 * Syncs the entire application state (excluding currentUser) to a global storage table.
 * This ensures the affiliate system persists across different browsers/devices.
 * 
 * REQUIRED TABLE SETUP:
 * Create a table 'system_data' with:
 * - id: text (primary key)
 * - payload: jsonb
 */
export const syncAppStateToCloud = async (state: AppState) => {
  const { currentUser, ...persistentData } = state;
  
  const { error } = await supabase
    .from('system_data')
    .upsert({ id: 'kph_global_state', payload: persistentData });

  if (error) {
    console.warn('Sync to Supabase failed. Ensure a table "system_data" exists with columns "id" (text) and "payload" (jsonb).', error.message);
  }
};

/**
 * Fetches the global application state from Supabase.
 */
export const fetchAppStateFromCloud = async (): Promise<Partial<AppState> | null> => {
  const { data, error } = await supabase
    .from('system_data')
    .select('payload')
    .eq('id', 'kph_global_state')
    .single();

  if (error) {
    return null;
  }
  return data.payload as Partial<AppState>;
};
