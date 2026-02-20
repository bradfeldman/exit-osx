import { notFound } from 'next/navigation'
import { getPlaybookDefinition } from '@/lib/playbook/playbook-registry'
import { PlaybookDetailPage } from '@/components/playbook/PlaybookDetailPage'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Playbook Detail Page — the "airlock" before Focus Mode.
 * Shows overview, phases, stats, and Start/Continue CTA.
 * URL: /playbook/pb-01
 */
export default async function PlaybookDetailRoute({ params }: Props) {
  const { id } = await params
  const definition = getPlaybookDefinition(id)

  if (!definition) {
    notFound()
  }

  return <PlaybookDetailPage definition={definition} />
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const definition = getPlaybookDefinition(id)
  return {
    title: definition ? `${definition.title} — Exit OSx` : 'Playbook — Exit OSx',
  }
}
