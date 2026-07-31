import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

// ─── GET /api/users — List all users (excluding passwords) ────────────────────

export async function GET() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// ─── POST /api/users — Create a new user ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, role, password } = body as {
      name?: string
      email?: string
      role?: string
      password?: string
    }

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Name, email, role, and password are required.' },
        { status: 400 }
      )
    }

    const validRoles = ['admin', 'store', 'kitchen', 'staff']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for existing email
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists.' },
        { status: 409 }
      )
    }

    const hashedPassword = await hash(password, 10)

    const user = await db.user.create({
      data: {
        name,
        email,
        role,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
