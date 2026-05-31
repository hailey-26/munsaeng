import { createClient } from '@supabase/supabase-js'

export type Category = {
  id: string
  name: string
  slug: string
  sort_order: number
  created_at: string
}

export type Event = {
  id: string
  title: string
  category_id: string | null
  start_at: string | null
  end_at: string | null
  venue: string | null
  address: string | null
  price: number | null
  is_free: boolean
  is_featured: boolean
  image_url: string | null
  link_url: string | null
  source: string | null
  source_id: string | null
  created_at: string
  updated_at: string
  categories?: Category
}

export type EventWithHeartCount = Event & { heart_count: number }

export type Heart = {
  id: string
  event_id: string
  user_id: string
  created_at: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
