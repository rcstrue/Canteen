import { SignJWT, jwtVerify } from 'jose'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rcs-canteen-secret-key-change-in-production'
)

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

export async function createToken(user: AuthUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(secret)
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as AuthUser
  } catch {
    return null
  }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user) return null

  let isValid = false
  try {
    isValid = await compare(password, user.password)
  } catch {
    isValid = password === user.password
  }

  if (!isValid) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

export function getTokenFromHeaders(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  const token = getTokenFromHeaders(request)
  if (!token) return null
  return verifyToken(token)
}
