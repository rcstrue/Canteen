import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'recipes')
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch {
    // ignore – likely already exists
  }
}

// POST /api/recipes/[id]/upload – Upload an image for a recipe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recipe = await db.recipe.findUnique({ where: { id } })
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Use a "file" field in multipart/form-data.' },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'The uploaded file is empty.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum allowed size is 2MB (received ${(file.size / 1024 / 1024).toFixed(2)}MB).`,
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP, GIF.`,
        },
        { status: 400 }
      )
    }

    await ensureUploadDir()

    // Delete previous image if it exists (keep filesystem tidy)
    if (recipe.imageUrl) {
      const previousPath = path.join(process.cwd(), 'public', recipe.imageUrl)
      try {
        await fs.unlink(previousPath)
      } catch {
        // ignore – file might already be gone
      }
    }

    const ext = EXT_BY_MIME[file.type]
    const timestamp = Date.now()
    const fileName = `${id}-${timestamp}.${ext}`
    const filePath = path.join(UPLOAD_DIR, fileName)

    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(filePath, Buffer.from(arrayBuffer))

    const imageUrl = `/uploads/recipes/${fileName}`

    await db.recipe.update({
      where: { id },
      data: { imageUrl },
    })

    return NextResponse.json({ success: true, imageUrl })
  } catch (error) {
    console.error('Error uploading recipe image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}

// DELETE /api/recipes/[id]/upload – Remove the recipe image
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const recipe = await db.recipe.findUnique({ where: { id } })
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      )
    }

    if (recipe.imageUrl) {
      const filePath = path.join(process.cwd(), 'public', recipe.imageUrl)
      try {
        await fs.unlink(filePath)
      } catch {
        // ignore – file might already be gone
      }

      await db.recipe.update({
        where: { id },
        data: { imageUrl: null },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing recipe image:', error)
    return NextResponse.json(
      { error: 'Failed to remove image' },
      { status: 500 }
    )
  }
}
