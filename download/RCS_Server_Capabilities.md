# RCS Server Capabilities & Limitations

**Server:** ignite.herosite.pro | **IP:** 103.86.177.198  
**Hosting Type:** DirectAdmin Shared Hosting (NOT cPanel)  
**Date Audited:** 03 Aug 2026  

---

## 1. Hardware Overview

| Resource | Value | Rating |
|----------|-------|--------|
| OS | AlmaLinux 8.10 (RHEL-based) | ✅ Stable |
| Kernel | 4.18.0-553.el8_10.x86_64 | ✅ LTS |
| CPU | Intel Xeon E5-2680 v2 @ 2.80GHz | ✅ Server-grade |
| Cores | 40 | ✅✅ Powerful |
| RAM | 219 GB (185 GB available) | ✅✅ Excellent |
| Disk | 859 GB total, 734 GB free | ✅✅ Plenty |
| Home Usage | 22 GB used | ✅ Low |

---

## 2. Runtimes — What Can Run

| Runtime | Version | Status | Notes |
|---------|---------|--------|-------|
| **Node.js** | v24.15.0 (via NVM) | ✅ WORKS | Installed in ~/.nvm, survives reboots |
| **npm** | 11.17.0 | ✅ WORKS | Package manager for Node |
| **pnpm** | 10.10.0 | ✅ WORKS | Faster alternative to npm |
| **PHP** | 8.4.19 | ✅ WORKS | With ionCube + OPcache |
| **Python** | 3.6.8 | ⚠️ OLD | System Python, works but outdated |
| **Perl** | 5.26.3 | ✅ WORKS | System utility |
| Ruby | — | ❌ NOT AVAILABLE | Can install via rbenv if needed |
| Java | — | ❌ NOT AVAILABLE | Can install via SDKMAN if needed |
| Go | — | ❌ NOT AVAILABLE | Can install manually if needed |
| .NET | — | ❌ NOT AVAILABLE | Cannot install without sudo |

---

## 3. Databases — What's Available

| Database | Version | Status | Notes |
|----------|---------|--------|-------|
| **MariaDB (MySQL)** | 10.6.25 | ✅ WORKS | Available via DirectAdmin, create DBs from panel |
| **SQLite** | 3.26.0 | ✅ WORKS | File-based, no setup needed |
| **Redis** | 8.6.0 | ❌ NO ACCESS | Installed but not accessible from your account |
| PostgreSQL | — | ❌ NOT AVAILABLE | Can't install without sudo |
| MongoDB | — | ❌ NOT AVAILABLE | Can't install without sudo |

---

## 4. Node.js Capabilities

| Capability | Status | Notes |
|------------|--------|-------|
| **Next.js Build** | ✅ WORKS | Tested with Next.js 16.2.12, builds in 17s |
| **React** | ✅ WORKS | npm install works fine |
| **Prisma v5 + SQLite** | ✅ WORKS | Use v5 only, v7 generates TypeScript |
| **Prisma v7** | ⚠️ PARTIAL | CLI works but generates .ts, not .js |
| **better-sqlite3** | ❌ FAILS | Needs C++20 compiler, server has old g++ |
| **Crypto** | ✅ WORKS | Built-in Node module |
| **File System** | ✅ WORKS | Full read/write in home directory |
| **HTTP Server** | ✅ WORKS | Can create Node servers |
| **Child Process** | ✅ WORKS | Can spawn processes |
| **Worker Threads** | ✅ WORKS | Multi-threading available |
| **PM2** | ✅ WORKS | v7.0.1 installed globally, auto-start needs sudo (use cron) |

---

## 5. Web & Deployment

| Feature | Status | Notes |
|---------|--------|-------|
| **DirectAdmin Panel** | ✅ AVAILABLE | Your hosting control panel |
| **public_html** | ✅ EXISTS | PHP/HTML files served from here |
| **Node.js App** | ✅ TESTED | Successfully served page on port 3001 via PM2 |
| **Cron Jobs** | ✅ AVAILABLE | Already running backup-to-mega.sh hourly |
| **SSL/HTTPS** | ✅ CONFIRMED | TLS 1.3 working on ignite.herosite.pro:443 |
| **Custom Ports** | ✅ PORT 3001 WORKS | Tested — Node served HTML on port 3001 |
| **Apache/Nginx** | ⚠️ MANAGED | DirectAdmin manages web server, you don't control it |
| **cPanel** | ❌ NOT AVAILABLE | This is DirectAdmin, not cPanel |
| **WHM** | ❌ NOT AVAILABLE | No root panel access |
| **Docker** | ❌ NOT AVAILABLE | Can't install without sudo |

---

## 6. Network & Communication

| Feature | Status | Notes |
|---------|--------|-------|
| **Node HTTP Server** | ✅ TESTED | Served HTML on port 3001 successfully |
| **External API Calls** | ✅ TESTED | Can call external APIs (fetch works) |
| **SSL/TLS** | ✅ TLS 1.3 | Working on ignite.herosite.pro:443 |
| **Sendmail** | ✅ WORKS | /usr/sbin/sendmail available |
| **Mail Command** | ✅ WORKS | /usr/bin/mail available |
| **WebSocket** | ✅ AVAILABLE | Install `ws` package per project |
| **Redis** | ❌ NO ACCESS | Installed but not accessible from your account |
| **MariaDB** | ✅ WORKS | Needs password from DirectAdmin panel |

---

## 7. Dev Tools

| Tool | Version | Status |
|------|---------|--------|
| **Git** | 2.43.7 | ✅ WORKS |
| **Composer** | 2.9.5 | ✅ WORKS (PHP package manager) |
| **PM2** | 7.0.1 | ✅ WORKS (Node process manager) |
| **SSH** | OpenSSH 8.0p1 | ✅ WORKS |
| **Curl** | Available | ✅ WORKS |
| **npm** | 11.17.0 | ✅ WORKS |
| **pnpm** | 10.10.0 | ✅ WORKS |

---

## 8. Permissions & Limits

| Limit | Value | Notes |
|-------|-------|-------|
| **Sudo** | ❌ NO | Cannot install system packages |
| **Home Dir** | /home/rcsfaxhz | Full read/write access |
| **Process Limit** | 900,328 | Very generous |
| **Open File Limit** | 524,288 | Very generous |
| **Cron Access** | ✅ YES | Already configured, `@reboot` supported |
| **Shell** | ✅ Bash | Full SSH shell access |

---

## 9. What CAN Run (Green Light ✅)

| App Type | Technology | How to Deploy |
|----------|-----------|---------------|
| **Next.js Web App** | Node.js + Prisma + SQLite | PM2 on port 3001, Apache proxy |
| **PHP Website** | PHP 8.4 + MariaDB | Directly in public_html |
| **PHP Laravel** | PHP 8.4 + Composer + MariaDB | In public_html, artisan serve |
| **Static Website** | HTML/CSS/JS | Directly in public_html |
| **WordPress** | PHP + MariaDB | DirectAdmin installer or manual |
| **REST API (Node)** | Express/Fastify + SQLite | PM2 on custom port |
| **REST API (PHP)** | Laravel/CodeIgniter + MariaDB | In public_html |
| **Background Jobs** | Node.js + Cron | PM2 or crontab |
| **Scheduled Tasks** | Cron | crontab -e |
| **Chat Bot** | Node.js + WebSocket | PM2 on custom port |
| **Email Notifications** | Node.js + Sendmail | Built-in server mail |
| **External API Integration** | Node.js fetch | Tested, works for any API |

---

## 10. What CANNOT Run (Red Light ❌)

| App Type | Why Not | Alternative |
|----------|---------|-------------|
| **Docker Containers** | No sudo, no Docker | Run apps directly via PM2 |
| **Java/Spring Boot** | No Java installed | Use Node.js or PHP instead |
| **PostgreSQL Apps** | No PostgreSQL | Use MariaDB or SQLite |
| **MongoDB Apps** | No MongoDB | Use MariaDB or SQLite |
| **.NET Apps** | No .NET runtime | Use Node.js or PHP instead |
| **Ruby on Rails** | No Ruby | Use Node.js or PHP instead |
| **System Services** | No sudo | Use PM2 + cron |
| **Custom Nginx/Apache** | No root access | Use DirectAdmin config |

---

## 11. Known Issues & Workarounds

| Issue | Details | Workaround |
|-------|---------|-----------|
| **Prisma v7 generates .ts** | v7 outputs TypeScript, not JS | Use **Prisma v5** (`npm install prisma@5 @prisma/client@5`) |
| **better-sqlite3 fails** | Needs C++20, server g++ is old | Use **Prisma + SQLite** instead |
| **Port 3000 in use** | Something else is using it | Use **port 3001** (tested & working) |
| **No sudo** | Can't install system packages | Use **NVM, rbenv, etc.** for user-level installs |
| **Python 3.6 is old** | System Python is outdated | Install via **pyenv** if needed |
| **Node version switches** | NVM may load different versions | Run `nvm use 20` or `nvm alias default 20` |
| **Redis not accessible** | CLI exists but no access from user | Use **SQLite** or **MariaDB** for caching/data |
| **PM2 startup needs sudo** | Can't run `pm2 startup` without sudo | Use **cron `@reboot`** instead |

---

## 12. Recommended Stack for RCS Canteen App

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16 | Tested, works perfectly |
| **Backend** | Next.js API Routes | Same app, no separate server |
| **Database** | SQLite via Prisma v5 | Zero config, file-based, fast |
| **ORM** | Prisma v5 | Type-safe, generates JS, tested |
| **Process Manager** | PM2 | Auto-restart, logs, monitoring |
| **Deployment** | PM2 + Apache proxy | Via DirectAdmin |

---

## 13. Quick Reference Commands

```bash
# Start Node app with PM2
pm2 start npm --name "canteen" -- start
pm2 save
pm2 startup  # May not work without sudo, use cron instead

# Cron alternative for auto-start (add to crontab -e)
@reboot source /home/rcsfaxhz/.nvm/nvm.sh && cd /home/rcsfaxhz/canteen-app && npm start

# Send email from Node.js
# npm install nodemailer  (uses sendmail, no SMTP needed)

# Test MariaDB connection (get password from DirectAdmin)
mysql -u rcsfaxhz_dbuser -p -e 'SHOW DATABASES;'

# Switch Node version
nvm use 20
nvm alias default 20

# Install Prisma v5 (always use v5)
npm install prisma@5 @prisma/client@5

# Check what's running
pm2 list
pm2 logs
pm2 monit
```

---

*Generated by Z.ai — RCS Server Audit — Updated with live test results*
