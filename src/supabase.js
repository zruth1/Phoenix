import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dnigofxknmlnctjcuqnr.supabase.co'
const supabaseAnonKey = 'sb_publishable_irRm5A20uKHQe4z-zcTeSw_D3WKD4nm'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
