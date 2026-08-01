# RCS Canteen — Linux Shared Hosting Deployment Guide

This document explains how to deploy **RCS Canteen — Stock & Cost Management** (Next.js 16 + Prisma + SQLite) onto a typical Linux shared hosting environment (cPanel / DirectAdmin / Plesk / raw Apache+Nginx VPS).

> **Tech stack recap:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Prisma ORM (SQLite) · NextAuth.js v4 · Recharts · Framer Motion.

---

## 1. Pre-Deployment Checklist

- [ ] Local build succeeds (`bun run build`)
- [ ] `.env` is configured with production values (NEXTAUTH_SECRET, NEXTAUTH_URL, DATABASE_URL)
- [ ] Database file `db/custom.db` exists with the latest schema (`bun run db:push`)
- [ ] Default users seeded via `POST /api/auth/seed`
- [ ] Backup data exported from Settings → Backup (JSON)
- [ ] Hosting account has **Node.js 20+** support (most cPanel hosts offer "Setup Node.js App")

---

## 2. Hosting Provider Requirements

### Minimum Requirements
| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 20.x | 22.x LTS |
| RAM | 512 MB | 1 GB+ |
| Disk | 250 MB | 1 GB+ (for SQLite + uploads) |
| Storage type | SSD | NVMe SSD |
| Process manager | PM2 / Phusion Passenger | PM2 with auto-restart |

### Compatible Hosts (tested patterns)
- **cPanel** with "Setup Node.js App" (CloudLinux)
- **DirectAdmin** with Node.js Selector
- **Plesk** with Node.js extension
- **VPS** (DigitalOcean / Hetzner / Vultr) — most flexible
- ❌ **Pure shared hosting** without Node.js support will NOT work — the app requires a persistent Node.js process

---

## 3. Build the Standalone Bundle

Next.js 16 supports **standalone output** which produces a minimal self-contained server.

### 3.1 Configure `next.config.ts`

```ts
// next.config.ts
const nextConfig = {
  output: 'standalone',
  // SQLite + uploads need a writable filesystem
  outputFileTracingRoot: __dirname,
};
export default nextConfig;
```

> The project's `package.json` build script already handles copying static files:
> ```json
> "build": "next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/"
> ```

### 3.2 Build Locally

```bash
# 1. Install dependencies
bun install

# 2. Push DB schema
bun run db:push

# 3. Seed default users
curl -X POST http://localhost:3000/api/auth/seed

# 4. Build standalone bundle
bun run build

# 5. Test the standalone server locally
NODE_ENV=production bun .next/standalone/server.js
# Visit http://localhost:3000 — verify login works
```

### 3.3 Package for Upload

```bash
# Create a deployment tarball
mkdir -p deploy-package
cp -r .next/standalone/* deploy-package/
cp -r prisma deploy-package/
mkdir -p deploy-package/db
cp db/custom.db deploy-package/db/  # If migrating existing data
cp .env.production deploy-package/.env
tar -czf rcs-canteen-$(date +%Y%m%d).tar.gz -C deploy-package .
```

The tarball will be ~50–80 MB.

---

## 4. Server-Side Deployment (cPanel Example)

### 4.1 Upload Files

1. Login to cPanel → **File Manager**
2. Navigate to your app directory (e.g., `/home/username/rcs-canteen/`)
3. Upload `rcs-canteen-YYYYMMDD.tar.gz`
4. Extract the archive

Your directory structure should look like:
```
/home/username/rcs-canteen/
├── server.js              ← Next.js standalone server
├── .next/
│   └── static/            ← Built assets
├── public/
├── prisma/
│   └── schema.prisma
├── db/
│   └── custom.db          ← SQLite database (writable!)
├── .env
└── package.json
```

### 4.2 Configure Environment Variables

Create or edit `.env` in the app root:

```bash
# Database (SQLite — absolute path required)
DATABASE_URL="file:/home/username/rcs-canteen/db/custom.db"

# NextAuth
NEXTAUTH_SECRET="generate-a-32-char-random-string-here"
NEXTAUTH_URL="https://canteen.yourdomain.com"

# App config
NODE_ENV="production"
PORT="3000"
```

Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 4.3 Set Permissions

The `db/` directory MUST be writable by the Node.js process:

```bash
# Via cPanel Terminal or SSH
chmod 755 /home/username/rcs-canteen/
chmod 755 /home/username/rcs-canteen/db/
chmod 644 /home/username/rcs-canteen/db/custom.db
chown -R username:username /home/username/rcs-canteen/
```

### 4.4 Register the Node.js App (cPanel)

1. cPanel → **Software** → **Setup Node.js App**
2. Click **Create Application**
3. Configure:
   - **Node.js version**: 20.x or 22.x
   - **Application mode**: Production
   - **Application root**: `rcs-canteen`
   - **Application URL**: `canteen.yourdomain.com` (or subdomain)
   - **Application startup file**: `server.js`
   - **Run the script**: `npm start` (or just point to `server.js`)
4. In **Environment variables**, add all variables from `.env`
5. Click **Create** → wait for the app to start

### 4.5 Restart & Verify

1. Click **Run NPM Install** (if it doesn't auto-run)
2. Click **Restart App**
3. Visit `https://canteen.yourdomain.com`
4. Login with `admin@rcs.com` / `admin123` — **CHANGE PASSWORD IMMEDIATELY**

---

## 5. Reverse Proxy with Apache (Required on Shared Hosting)

Most shared hosts run Apache in front of Node.js. Create an `.htaccess` file in your `public_html/` (or subdomain root) to proxy requests:

```apache
# public_html/.htaccess
RewriteEngine On

# Proxy all requests to the Node.js app on port 3000
RewriteRule ^$ http://127.0.0.1:3000/ [P,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]

# WebSocket support (if you add real-time features later)
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:3000/$1" [P,L]

# Pass through headers
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"
RequestHeader set X-Forwarded-Host "%{HTTP_HOST}s"
```

> If your host uses **Nginx** instead, request a custom nginx config or use their Node.js selector.

---

## 6. SSL / HTTPS Setup

1. cPanel → **SSL/TLS** → **Manage SSL sites**
2. Select your subdomain (`canteen.yourdomain.com`)
3. Click **AutoSSL** (free Let's Encrypt) or install a purchased cert
4. Force HTTPS redirect in `.htaccess`:
   ```apache
   RewriteCond %{HTTPS} off
   RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

---

## 7. Persistent Process with PM2 (VPS / SSH Access)

If you have SSH access, use PM2 to keep the app alive across reboots:

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
cd /home/username/rcs-canteen
PORT=3000 pm2 start server.js --name rcs-canteen

# Save process list & enable auto-restart on boot
pm2 save
pm2 startup systemd
# Follow the on-screen instructions to enable PM2 at boot

# Useful commands
pm2 status              # Check status
pm2 logs rcs-canteen    # Tail logs
pm2 restart rcs-canteen # Restart
pm2 stop rcs-canteen    # Stop
```

### Nginx Reverse Proxy Config (VPS)

```nginx
# /etc/nginx/sites-available/canteen.yourdomain.com
server {
    listen 80;
    server_name canteen.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name canteen.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/canteen.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/canteen.yourdomain.com/privkey.pem;

    # Next.js standalone server on port 3000
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        # Next.js needs longer timeouts for heavy API routes
        proxy_read_timeout 60s;
    }

    # Cache static assets aggressively
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Activate:
```bash
sudo ln -s /etc/nginx/sites-available/canteen.yourdomain.com /etc/nginx/sites-enabled/
sudo certbot --nginx -d canteen.yourdomain.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. Post-Deployment Tasks

### 8.1 Change Default Passwords

Login as each default user and change passwords via **Settings → User Management**:
- `admin@rcs.com` / `admin123` → strong password
- `store@rcs.com` / `store123` → strong password
- `kitchen@rcs.com` / `kitchen123` → strong password

### 8.2 Import Production Data

1. Login as admin
2. Settings → **Data Management** → **Restore Data**
3. Upload the JSON backup exported from your dev environment
4. Verify data appears in Dashboard / Stock / Purchases

### 8.3 Configure Monthly Budget

Settings → **Budget & Alerts**:
- Set Food Budget (e.g., ₹90,000/month)
- Set Operating Budget (e.g., ₹70,000/month)
- Set Alert Threshold (e.g., 80%)

### 8.4 Add Real Suppliers & Ingredients

Suppliers → Add Supplier → fill in real vendor details.
Stock → Add Ingredient → import your actual inventory.

---

## 9. Backup Strategy

### Automatic Daily Backups (cron)

```bash
# Edit crontab
crontab -e

# Daily 2 AM: backup DB + uploads to a backup folder
0 2 * * * cd /home/username/rcs-canteen && tar -czf /home/username/backups/canteen-$(date +\%Y\%m\%d).tar.gz db/ public/uploads/ 2>/dev/null

# Weekly 3 AM: cleanup old backups (keep last 30 days)
0 3 * * 0 find /home/username/backups/ -name "canteen-*.tar.gz" -mtime +30 -delete
```

### Manual Backup via UI

Settings → Data Management → **Export Data** — downloads a JSON file with all ingredients, recipes, purchases, expenses, suppliers, users.

---

## 10. Updating the App

```bash
# 1. Backup current database
cp /home/username/rcs-canteen/db/custom.db /home/username/backups/custom.db.bak

# 2. Upload new build tarball and extract (overwrites app files)
cd /home/username/rcs-canteen
tar -xzf ~/rcs-canteen-new.tar.gz

# 3. Run Prisma migrations if schema changed
bunx prisma db push --accept-data-loss

# 4. Restart the Node.js process
pm2 restart rcs-canteen   # VPS
# OR via cPanel → Setup Node.js App → Restart
```

---

## 11. Troubleshooting

### "Cannot find module" errors
→ Run `npm install --production` in the app directory, then restart.

### "SQLITE_CANTOPEN" or database read-only
→ Fix permissions: `chmod 644 db/custom.db && chmod 755 db/`
→ Ensure the directory containing `custom.db` is writable by the Node user.

### "NEXTAUTH_SECRET is missing"
→ Add it to `.env` AND to the cPanel Node.js app's environment variables, then restart.

### Login redirects loop / 401 errors
→ Verify `NEXTAUTH_URL` matches your domain exactly (including `https://`).
→ Clear browser cookies for the domain.

### App shows but CSS/JS missing (404 on /_next/static/)
→ The standalone build's static assets weren't copied. Run:
```bash
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
```

### Slow API responses
→ SQLite is fine for ≤50 concurrent users. For more, consider migrating to PostgreSQL:
1. Update `DATABASE_URL` to `postgresql://...`
2. Update `prisma/schema.prisma` provider to `"postgresql"`
3. Run `bunx prisma db push`
4. Restart app

### Port 3000 already in use
→ Change `PORT` env var (e.g., `PORT=3100`) and update `.htaccess` / Nginx proxy accordingly.

---

## 12. Security Hardening

1. **Firewall**: Allow only ports 80/443. Block direct access to port 3000.
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw deny 3000/tcp
   sudo ufw enable
   ```
2. **Fail2ban**: Protect against SSH brute force.
3. **Rate limiting**: Add `express-rate-limit` if you add custom Express endpoints.
4. **CSP headers**: Add a Content-Security-Policy header in `next.config.ts`:
   ```ts
   const nextConfig = {
     async headers() {
       return [{
         source: '/(.*)',
         headers: [
           { key: 'X-Frame-Options', value: 'DENY' },
           { key: 'X-Content-Type-Options', value: 'nosniff' },
           { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
         ],
       }];
     },
   };
   ```
5. **Rotate NEXTAUTH_SECRET** quarterly.
6. **Backup encryption**: GPG-encrypt database backups before offsite transfer.

---

## 13. Migration to PostgreSQL (Optional — for >50 Concurrent Users)

1. Provision a PostgreSQL database (most hosts offer it alongside MySQL).
2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:pass@localhost:5432/rcs_canteen"
   ```
4. Push schema: `bunx prisma db push`
5. Use the JSON backup/restore feature in Settings to migrate data.

---

## 14. Quick Reference

| Action | Command / URL |
|--------|---------------|
| Build locally | `bun run build` |
| Test standalone | `bun .next/standalone/server.js` |
| Push DB schema | `bun run db:push` |
| Seed users | `POST /api/auth/seed` |
| Login (default) | `admin@rcs.com` / `admin123` |
| Export data | Settings → Data Management → Export |
| Restart app (cPanel) | Setup Node.js App → Restart |
| Restart app (VPS) | `pm2 restart rcs-canteen` |
| View logs (VPS) | `pm2 logs rcs-canteen` |
| Backup DB (cron) | `tar -czf backup.tar.gz db/` |

---

## 15. Support

For app-specific issues, check:
1. `/home/z/my-project/worklog.md` — full development history & known issues
2. Browser DevTools console for client errors
3. `pm2 logs` or cPanel Node.js app logs for server errors
4. The `/api/health` endpoint (returns 200 if server is healthy)

**RCS Canteen · v1.1.0 · Dahej Industrial Contract · © 2026**
