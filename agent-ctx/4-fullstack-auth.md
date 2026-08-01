# Task 4 - Authentication/Login System

## Summary
Added complete authentication system to RCS Canteen app using NextAuth.js v4 with Credentials provider.

## Files Created
- `/src/app/api/auth/[...nextauth]/route.ts` - NextAuth v4 API route with CredentialsProvider
- `/src/app/api/auth/seed/route.ts` - Auto-seed default users (admin, store, kitchen)
- `/src/components/auth/auth-provider.tsx` - AuthProvider + useAuth hook
- `/src/components/auth/login-view.tsx` - Beautiful login page with orange/amber theme
- `/src/types/next-auth.d.ts` - TypeScript type declarations for NextAuth

## Files Modified
- `/src/app/page.tsx` - Added auth gating (login view vs app view), UserMenu, loading screen
- `/src/components/providers.tsx` - Added AuthProvider wrapper
- `/.env` - Added NEXTAUTH_SECRET and NEXTAUTH_URL

## Default Credentials
- admin@rcs.com / admin123 (admin role)
- store@rcs.com / store123 (store role)
- kitchen@rcs.com / kitchen123 (kitchen role)

## Key Technical Decisions
- Used JWT strategy (not database sessions) for simplicity
- bcrypt password hashing with plaintext fallback for legacy seed data
- Client-side auth gating in page.tsx (not middleware) since single-page architecture
- Auto-seeds auth users on first page load via useEffect
- Role included in JWT token and session for role-based features
