
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rmxplyiatiiiziefhgnv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteHBseWlhdGlpaXppZWZoZ252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzkyMTMsImV4cCI6MjA4NDY1NTIxM30.sPc64u2y6t9g01gxJgXNatGd16uesoVHdN0CYj5KfJg';

export const supabase = createClient(supabaseUrl, supabaseKey);
