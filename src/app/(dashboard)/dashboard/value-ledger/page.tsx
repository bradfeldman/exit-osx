import { createClient } from '@/lib/supabase/server'
import { ValueLedgerPage } from '@/components/value-ledger/ValueLedgerPage'

export default async function ValueLedgerRoute() {
  const supabase = await createClient()
  await supabase.auth.getUser()

  return <ValueLedgerPage />
}
