import { prisma } from '@/lib/prisma'
import type { TasksSection } from '../types'

export async function buildTasksSection(companyId: string): Promise<TasksSection> {
  const tasks = await prisma.task.findMany({
    where: { companyId },
    select: {
      id: true,
      title: true,
      status: true,
      briCategory: true,
      normalizedValue: true,
      rawImpact: true,
      effortLevel: true,
      completedAt: true,
      completedValue: true,
      inActionPlan: true,
      priorityRank: true,
    },
    orderBy: [{ priorityRank: 'asc' }, { rawImpact: 'desc' }],
  })

  const pendingTasks = tasks.filter(t => t.status === 'PENDING')
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS')
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED')

  // Value by category
  const valueByCategory: Record<string, number> = {}
  for (const task of pendingTasks) {
    const cat = task.briCategory
    valueByCategory[cat] = (valueByCategory[cat] || 0) + Number(task.normalizedValue)
  }

  // Top 10 pending tasks
  const topPendingTasks = pendingTasks.slice(0, 10).map(t => ({
    id: t.id,
    title: t.title,
    briCategory: t.briCategory,
    normalizedValue: Number(t.normalizedValue),
    effortLevel: t.effortLevel,
  }))

  // Recent completions (last 10)
  const recentCompletions = completedTasks
    .filter(t => t.completedAt)
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
    .slice(0, 10)
    .map(t => ({
      id: t.id,
      title: t.title,
      completedAt: t.completedAt!.toISOString(),
      completedValue: Number(t.completedValue ?? t.normalizedValue),
    }))

  // Weekly velocity: completions in last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weeklyVelocity = completedTasks.filter(
    t => t.completedAt && t.completedAt >= weekAgo
  ).length

  return {
    totalTasks: tasks.length,
    pendingCount: pendingTasks.length,
    inProgressCount: inProgressTasks.length,
    completedCount: completedTasks.length,
    totalPendingValue: pendingTasks.reduce((sum, t) => sum + Number(t.normalizedValue), 0),
    totalCompletedValue: completedTasks.reduce(
      (sum, t) => sum + Number(t.completedValue ?? t.normalizedValue),
      0
    ),
    valueByCategory,
    topPendingTasks,
    recentCompletions,
    weeklyVelocity,
  }
}
