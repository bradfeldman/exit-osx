import { DealDetailView } from '@/components/deals'

export const metadata = {
  title: 'Deal | ExitOSx',
  description: 'View and manage deal details',
}

interface PageProps {
  params: Promise<{ dealId: string }>
}

export default async function DealDetailPage({ params }: PageProps) {
  const { dealId } = await params
  return <DealDetailView dealId={dealId} />
}
