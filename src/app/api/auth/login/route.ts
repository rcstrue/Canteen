import { authenticateUser, createToken } from '@/lib/auth-jwt'
import { logAudit, getAuditContext } from '@/lib/audit'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const user = await authenticateUser(email, password)
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await createToken(user)

    await logAudit({
      ...(await getAuditContext(request)),
      action: 'LOGIN',
      entityType: 'Auth',
      entityId: user.id,
      entityName: user.name,
      description: `User "${user.name}" (${user.role}) logged in`,
    })

    return NextResponse.json({ token, user })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
