/**
 * Input Validation Module
 * Provides Zod schemas and validation utilities for API routes
 *
 * SECURITY: Prevents mass assignment, injection, and type confusion attacks
 */

import { z } from 'zod'
import { NextResponse } from 'next/server'
import { DataRoomAccessLevel, DataRoomStage } from '@prisma/client'

// =============================================================================
// Common Validation Schemas
// =============================================================================

/** UUID v4 format validation */
export const uuidSchema = z.string().uuid('Invalid ID format')

/** Email validation with normalization */
export const emailSchema = z.string().email('Invalid email').transform(val => val.toLowerCase().trim())

/** Safe string that prevents injection */
export const safeStringSchema = z.string()
  .min(1, 'Required')
  .max(1000, 'Too long')
  .refine(val => !val.includes('<script'), 'Invalid characters')

/** Pagination parameters with security limits */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // SECURITY: Cap at 100 to prevent DoS via large queries
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Apply pagination limits to raw query params
 * Use this when you can't use Zod validation
 */
export function sanitizePagination(params: {
  page?: string | number | null
  limit?: string | number | null
}): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(params.page || '1'), 10) || 1)
  // SECURITY: Hard cap at 100 items per page
  const limit = Math.min(100, Math.max(1, parseInt(String(params.limit || '20'), 10) || 20))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

// =============================================================================
// Data Room Schemas
// =============================================================================

/** Valid access levels for data room */
export const dataRoomAccessLevelSchema = z.enum([
  'VIEWER',
  'DOWNLOADER',
  'CONTRIBUTOR',
  'ADMIN',
] as const satisfies readonly DataRoomAccessLevel[])

/** Valid stages for data room access */
export const dataRoomStageSchema = z.enum([
  'PREPARATION',
  'TEASER',
  'POST_NDA',
  'DUE_DILIGENCE',
  'CLOSED',
] as const satisfies readonly DataRoomStage[])

/** Data room access grant request */
export const dataRoomAccessGrantSchema = z.object({
  email: emailSchema,
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  accessLevel: dataRoomAccessLevelSchema.default('VIEWER'),
  maxStage: dataRoomStageSchema.default('TEASER'),
  expiresAt: z.string().datetime().optional().nullable(),
  folderIds: z.array(uuidSchema).optional(),
  notes: z.string().max(2000).optional(),
})

/** Data room access update request */
export const dataRoomAccessUpdateSchema = z.object({
  accessId: uuidSchema,
  accessLevel: dataRoomAccessLevelSchema.optional(),
  maxStage: dataRoomStageSchema.optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  folderIds: z.array(uuidSchema).optional(),
  notes: z.string().max(2000).optional(),
})

// =============================================================================
// File Upload Validation
// =============================================================================

/** Allowed MIME types for data room uploads */
export const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Archives (use with caution)
  'application/zip',
])

/** Blocked file extensions (even if MIME type is spoofed) */
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'bash', 'ps1', 'psm1',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'php', 'php3', 'php4', 'php5', 'phtml',
  'py', 'pyc', 'pyo',
  'rb', 'erb',
  'pl', 'pm', 'cgi',
  'asp', 'aspx', 'ascx', 'ashx',
  'jsp', 'jspx',
  'dll', 'so', 'dylib',
  'htaccess', 'htpasswd',
  'svg', // SVG can contain scripts
  'html', 'htm', 'xhtml', 'shtml',
  'xml', 'xsl', 'xslt',
])

/** Magic bytes for file type verification */
export const FILE_SIGNATURES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a, GIF89a
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
  // Office documents (OOXML) are ZIP files
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [[0x50, 0x4B, 0x03, 0x04]],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [[0x50, 0x4B, 0x03, 0x04]],
}

export interface FileValidationResult {
  valid: boolean
  error?: string
  sanitizedName?: string
}

/**
 * Validate uploaded file for security
 */
export async function validateUploadedFile(file: File): Promise<FileValidationResult> {
  // Check file name
  const fileName = file.name
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  // Block dangerous extensions
  if (BLOCKED_EXTENSIONS.has(extension)) {
    return { valid: false, error: `File type .${extension} is not allowed` }
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` }
  }

  // Verify magic bytes match claimed MIME type
  const signatures = FILE_SIGNATURES[file.type]
  if (signatures) {
    const buffer = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(buffer)

    const matchesSignature = signatures.some(signature =>
      signature.every((byte, i) => bytes[i] === byte)
    )

    if (!matchesSignature) {
      return { valid: false, error: 'File content does not match declared type' }
    }
  }

  // Sanitize filename (remove path traversal attempts)
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars
    .replace(/\.{2,}/g, '.') // Remove consecutive dots
    .replace(/^\./, '_') // Don't start with dot
    .slice(0, 255) // Limit length

  return { valid: true, sanitizedName }
}

// =============================================================================
// Validation Helpers
// =============================================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: NextResponse }

/**
 * Validate request body against a Zod schema
 * Returns sanitized data or error response
 */
export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json()
    const result = schema.safeParse(body)

    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))

      return {
        success: false,
        error: NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: 400 }
        ),
      }
    }

    return { success: true, data: result.data }
  } catch {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQueryParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T
): ValidationResult<z.infer<T>> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)

  if (!result.success) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      ),
    }
  }

  return { success: true, data: result.data }
}
