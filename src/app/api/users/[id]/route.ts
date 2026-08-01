import { db } from '@/lib/db'
import { logAudit, getAuditContext } from '@/lib/audit'
import { hash } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

// ─── PUT /api/users/[id] — Update a user ─────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, email, role, password } = body as {
      name?: string
      email?: string
      role?: string
      password?: string
    }

    // Check user exists
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      )
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'store', 'kitchen', 'staff']
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: `Role must be one of: ${validRoles.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Check email uniqueness if changing email
    if (email && email !== existing.email) {
      const emailTaken = await db.user.findUnique({ where: { email } })
      if (emailTaken) {
        return NextResponse.json(
          { error: 'A user with this email already exists.' },
          { status: 409 }
        )
      }
    }

    // Build update data
    const updateData: {
      name?: string
      email?: string
      role?: string
      password?: string
    } = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role) updateData.role = role

    // Only update password if a new one is provided
    if (password && password.trim().length > 0) {
      updateData.password = await hash(password, 10)
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'UPDATE',
      entityType: 'User',
      entityId: user.id,
      entityName: `${user.name} (${user.email})`,
      description: `Updated user "${user.name}" (${user.email})${updateData.password ? ' (password changed)' : ''}`,
      metadata: {
        before: { name: existing.name, email: existing.email, role: existing.role },
        after: { name: user.name, email: user.email, role: user.role, passwordChanged: !!updateData.password },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/users/[id] — Delete a user ───────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      )
    }

    await db.user.delete({ where: { id } })

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'DELETE',
      entityType: 'User',
      entityId: existing.id,
      entityName: `${existing.name} (${existing.email})`,
      description: `Deleted user "${existing.name}" (${existing.email}, role: ${existing.role})`,
      metadata: {
        name: existing.name,
        email: existing.email,
        role: existing.role,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
