import { createClient } from '@supabase/supabase-js';

// Valores fijos para desarrollo
const supabaseUrl = 'https://gdognpnktcnfsitqinuw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkb2ducG5rdGNuZnNpdHFpbnV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5Njg4MjIsImV4cCI6MjA1NzU0NDgyMn0.Y5BbcHUPS5aUX26dUgIufWSOAWSs-DBhVulgSRPRQdw';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;