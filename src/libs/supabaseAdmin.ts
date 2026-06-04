import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
)

export default supabaseAdmin
