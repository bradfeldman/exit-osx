// GET /api/role-templates - Get available role templates
// Returns all built-in role templates for team member assignment

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { PERMISSION_CATEGORIES } from '@/lib/auth/permissions'

export async function GET() {
  try {
    // Check basic auth
    const result = await checkPermission('ORG_VIEW')
    if (isAuthError(result)) return result.error

    // Get all role templates from database
    const templates = await prisma.roleTemplate.findMany({
      orderBy: [
        { isBuiltIn: 'desc' },
        { name: 'asc' },
      ],
    })

    // Format templates for UI
    const formattedTemplates = templates.map((template) => ({
      id: template.id,
      slug: template.slug,
      name: template.name,
      description: template.description,
      icon: template.icon,
      isBuiltIn: template.isBuiltIn,
      defaultPermissions: template.defaultPermissions as Record<string, boolean>,
      // Summarize permissions for quick display
      summary: summarizePermissions(template.defaultPermissions as Record<string, boolean>),
    }))

    // Also return permission categories for UI grouping
    const categories = Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => ({
      key,
      label: category.label,
      icon: category.icon,
      sensitive: 'sensitive' in category ? category.sensitive : false,
      permissions: category.permissions,
    }))

    return NextResponse.json({
      templates: formattedTemplates,
      categories,
    })
  } catch (error) {
    console.error('Failed to get role templates:', error)
    return NextResponse.json(
      { error: 'Failed to get role templates' },
      { status: 500 }
    )
  }
}

// Summarize which modules a template has access to
function summarizePermissions(permissions: Record<string, boolean>): {
  fullAccess: string[]
  viewOnly: string[]
  noAccess: string[]
} {
  const modules: Record<string, { view: boolean; edit: boolean }> = {}

  for (const [key, granted] of Object.entries(permissions)) {
    if (!granted) continue

    const [moduleResource, action] = key.split(':')
    const moduleName = moduleResource.split('.')[0]

    if (!modules[moduleName]) {
      modules[moduleName] = { view: false, edit: false }
    }

    if (action === 'view') modules[moduleName].view = true
    if (action === 'edit' || action === 'upload' || action === 'create' || action === 'complete') {
      modules[moduleName].edit = true
    }
  }

  const allModules = ['assessments', 'financials', 'personal', 'valuation', 'dataroom', 'playbook', 'team']

  const fullAccess: string[] = []
  const viewOnly: string[] = []
  const noAccess: string[] = []

  for (const moduleName of allModules) {
    const access = modules[moduleName]
    if (!access || (!access.view && !access.edit)) {
      noAccess.push(moduleName)
    } else if (access.edit) {
      fullAccess.push(moduleName)
    } else {
      viewOnly.push(moduleName)
    }
  }

  return { fullAccess, viewOnly, noAccess }
}
