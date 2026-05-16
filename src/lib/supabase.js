import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hafjurzuvfglrtjmbbdu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhZmp1cnp1dmZnbHJ0am1iYmR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDUyOTQsImV4cCI6MjA5MzM4MTI5NH0.tpfYxomADth4lgzyGHZrdyWdRQ8bsO8q7X-xIJR3PVA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
