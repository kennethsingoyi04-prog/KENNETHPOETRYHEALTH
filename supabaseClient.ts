
import { createClient } from '@supabase/supabase-js';

/**
 * Netlify & Supabase Environment Variables.
 * These are configured in the Netlify Dashboard under Site Configuration.
 */
const supabaseUrl = 
  process.env.SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  'https://rmxplyiatiiiziefhgnv.supabase.co';

const supabaseKey = 
  process.env.SUPABASE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteHBseWlhdGlpaXppZWZoZ252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzkyMTMsImV4cCI6MjA4NDY1NTIxM30.sPc64u2y6t9g01gxJgXNatGd16uesoVHdN0CYj5KfJg';

export const supabase = createClient(supabaseUrl, supabaseKey);
