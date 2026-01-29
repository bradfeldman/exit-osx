import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, ListTodo, Code, Terminal, Database, Bug, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const tools = [
  {
    title: 'Snapshot Tool',
    description: 'Create and manage valuation snapshots for debugging and analysis',
    icon: Camera,
    href: '/admin/tools/snapshot',
  },
  {
    title: 'Task Viewer',
    description: 'View and debug background tasks and jobs',
    icon: ListTodo,
    href: '/admin/tools/task-viewer',
  },
]

const comingSoon = [
  {
    title: 'API Playground',
    description: 'Test API endpoints with interactive documentation',
    icon: Terminal,
  },
  {
    title: 'Database Explorer',
    description: 'Browse and query database records safely',
    icon: Database,
  },
  {
    title: 'Error Tracker',
    description: 'Monitor and debug application errors',
    icon: Bug,
  },
  {
    title: 'Feature Flags',
    description: 'Toggle features for testing and rollout',
    icon: Code,
  },
]

export default function RDPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">R&D</h1>
        <p className="text-muted-foreground">
          Developer tools, debugging utilities, and system diagnostics
        </p>
      </div>

      {/* Warning Banner */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <Code className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Developer Tools</CardTitle>
              <CardDescription>
                These tools are intended for development and debugging purposes. Use with caution in production.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Active Tools */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Tools</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <Link key={tool.title} href={tool.href}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <tool.icon className="h-8 w-8 text-red-500" />
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-4">{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Coming Soon</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {comingSoon.map((tool) => (
            <Card key={tool.title} className="opacity-60">
              <CardHeader>
                <tool.icon className="h-8 w-8 text-gray-400 mb-2" />
                <CardTitle className="text-base">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
