import { TaskExecutionClient } from './TaskExecutionClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TaskPage({ params }: PageProps) {
  const { id } = await params

  return <TaskExecutionClient taskId={id} />
}
