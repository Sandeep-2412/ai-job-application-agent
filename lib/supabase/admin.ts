import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

/**
 * Creates a Supabase client with service-role privileges for server-side administrative operations.
 *
 * @returns A Supabase client configured with the service-role key and session persistence disabled
 * @throws An error if the Supabase URL or service-role key is missing
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase URL and service role key are required to create admin client")
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
