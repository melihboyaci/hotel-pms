import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const isValidUrl = (url?: string) => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = rawKey || 'placeholder-key'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

