import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity, checkDataRoomAccess } from '@/lib/dataroom'
import { createClient } from '@/lib/supabase/server'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import { DataRoomStage } from '@prisma/client'
import { SIGNED_URL_EXPIRY_SECONDS } from '@/lib/security'

// SECURITY: Stage hierarchy for access control
const STAGE_ORDER: DataRoomStage[] = ['PREPARATION', 'TEASER', 'POST_NDA', 'DUE_DILIGENCE', 'CLOSED']

/**
 * Check if user has access to a specific stage
 */
function hasStageAccess(userMaxStage: DataRoomStage, requiredStage: DataRoomStage): boolean {
  const userStageIndex = STAGE_ORDER.indexOf(userMaxStage)
  const requiredStageIndex = STAGE_ORDER.indexOf(requiredStage)
  return userStageIndex >= requiredStageIndex
}

/**
 * Add watermark to PDF with user email and timestamp
 * SECURITY: Uses UTC to avoid leaking server timezone information
 */
async function addWatermarkToPdf(
  pdfBytes: ArrayBuffer,
  userEmail: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pages = pdfDoc.getPages()
  // SECURITY: Use UTC to avoid leaking server timezone information
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC'

  const watermarkText = `Downloaded by ${userEmail} on ${timestamp}`

  for (const page of pages) {
    const { width, height } = page.getSize()
    const fontSize = 10

    // Add diagonal watermark in center of page
    const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize)

    // Draw watermark diagonally across the page
    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0.7, 0.7, 0.7), // Light gray
      rotate: degrees(45),
      opacity: 0.3,
    })

    // Also add smaller watermark at bottom of each page
    const footerText = `${userEmail} | ${timestamp}`
    const footerWidth = helveticaFont.widthOfTextAtSize(footerText, 8)

    page.drawText(footerText, {
      x: width / 2 - footerWidth / 2,
      y: 15,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.5,
    })
  }

  return await pdfDoc.save()
}

/**
 * GET /api/companies/[id]/dataroom/documents/[docId]/download
 * Download a document (with watermark for PDFs)
 *
 * SECURITY: This endpoint enforces multiple layers of access control:
 * 1. User must have COMPANY_VIEW permission for the company
 * 2. Document must belong to the specified company
 * 3. User must have data room access at the required stage level
 * 4. If folder-specific access is configured, user must have access to that folder
 * 5. Access must not be expired
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: companyId, docId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Fetch document with folder and data room info for access validation
    const document = await prisma.dataRoomDocument.findUnique({
      where: { id: docId },
      include: {
        folder: {
          select: {
            id: true,
            dataRoomId: true,
            minStage: true,
            dataRoom: {
              select: {
                id: true,
                companyId: true,
              },
            },
          },
        },
      },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // SECURITY: Check data room access for external users
    // Organization members with COMPANY_VIEW always have access
    // External users need explicit DataRoomAccess grant
    const dataRoomId = document.folder?.dataRoomId
    if (dataRoomId) {
      const accessResult = await checkDataRoomAccess(dataRoomId, result.auth.user.email)

      // If user has explicit access grant, validate it thoroughly
      if (accessResult.hasAccess) {
        // Check stage access
        const folderMinStage = document.folder?.minStage || 'PREPARATION'
        if (accessResult.maxStage && !hasStageAccess(accessResult.maxStage, folderMinStage)) {
          return NextResponse.json(
            { error: 'Access denied', message: 'You do not have access to documents at this stage' },
            { status: 403 }
          )
        }

        // Check folder-specific access if configured
        const access = await prisma.dataRoomAccess.findUnique({
          where: {
            dataRoomId_email: {
              dataRoomId,
              email: result.auth.user.email.toLowerCase(),
            },
          },
        })

        if (access && access.folderIds && access.folderIds.length > 0) {
          // User has folder-specific access - verify this folder is allowed
          if (document.folderId && !access.folderIds.includes(document.folderId)) {
            return NextResponse.json(
              { error: 'Access denied', message: 'You do not have access to this folder' },
              { status: 403 }
            )
          }
        }

        // Check if access has expired
        if (access?.expiresAt && access.expiresAt < new Date()) {
          return NextResponse.json(
            { error: 'Access expired', message: 'Your data room access has expired' },
            { status: 403 }
          )
        }
      }
      // Note: If accessResult.hasAccess is false but user has COMPANY_VIEW,
      // they're an org member and should have access. We only deny if they
      // have a revoked/expired explicit grant.
    }

    if (!document.filePath) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 404 })
    }

    const supabase = await createClient()
    const isPdf = document.mimeType === 'application/pdf' ||
                  document.fileName?.toLowerCase().endsWith('.pdf')

    // Log the download activity
    if (document.folder) {
      await logActivity({
        dataRoomId: document.folder.dataRoomId,
        userId: result.auth.user.id,
        userEmail: result.auth.user.email,
        action: 'DOWNLOADED_DOCUMENT',
        documentId: docId,
        folderId: document.folderId || undefined,
        metadata: {
          fileName: document.fileName,
          watermarked: isPdf,
        },
      })
    }

    // For PDFs, add watermark and return the file directly
    if (isPdf) {
      // Download the file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('data-room')
        .download(document.filePath)

      if (downloadError || !fileData) {
        console.error('Error downloading file for watermarking:', downloadError)
        return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
      }

      try {
        // Add watermark
        const pdfBytes = await fileData.arrayBuffer()
        const watermarkedPdf = await addWatermarkToPdf(pdfBytes, result.auth.user.email)

        // Return watermarked PDF
        return new NextResponse(Buffer.from(watermarkedPdf), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${document.fileName || 'document.pdf'}"`,
            'Content-Length': watermarkedPdf.length.toString(),
          },
        })
      } catch (watermarkError) {
        console.error('Error adding watermark to PDF:', watermarkError)
        // SECURITY: Do NOT fall back to unwatermarked download for confidential documents
        // This prevents attackers from crafting malformed PDFs to bypass watermarking
        if (document.isConfidential) {
          return NextResponse.json(
            { error: 'Unable to process document', message: 'This document cannot be downloaded at this time. Please contact support.' },
            { status: 500 }
          )
        }

        // For non-confidential documents, allow fallback with a shorter expiry
        // and log this as a potential security event
        console.warn(`SECURITY: Watermark bypass for document ${docId} by user ${result.auth.user.email}`)
        const { data, error } = await supabase.storage
          .from('data-room')
          .createSignedUrl(document.filePath, 300) // Reduced to 5 minutes

        if (error) {
          return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
        }

        return NextResponse.json({
          url: data.signedUrl,
          fileName: document.fileName,
          expiresIn: 300,
          warning: 'Document downloaded without watermark',
        })
      }
    }

    // For non-PDF files, generate signed URL
    // SECURITY: Reduced expiry from 1 hour to 5 minutes
    const { data, error } = await supabase.storage
      .from('data-room')
      .createSignedUrl(document.filePath, SIGNED_URL_EXPIRY_SECONDS)

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.json({
      url: data.signedUrl,
      fileName: document.fileName,
      expiresIn: SIGNED_URL_EXPIRY_SECONDS,
    })
  } catch (error) {
    console.error('Error generating download URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
