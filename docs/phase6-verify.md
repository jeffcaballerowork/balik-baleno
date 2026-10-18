# Phase 6 - idiot-proof verification steps

Local server must be running (`pnpm dev` at localhost:4321).

## 1. Approved-only endpoint block (3 quick checks)

A. Signed out:
```
curl -s http://localhost:4321/api/auth/approved | head -c 200
```
Expected: `{"error":{"code":"sign_in_required"...`

B. Pending (use the "Test Alum" UUID in your local DB):
- Make test user pending: `UPDATE users SET status='pending' WHERE id='...';`
- Sign in with that account (use browser incognito if needed)
- `curl -s -H "Cookie: balik_session=..." http://localhost:4321/api/auth/approved`
Expected: 403 `approval_required`

C. Declined: same but `status='declined'` → 403.

## 2. Admin endpoint blocked for normal alum

Sign in with approved `alum` role (not super_admin/admin).
```
curl -v -H "Cookie: balik_session=..." -H "X-CSRF-Token: ..." \
  -H "Origin: http://localhost:4321" \
  http://localhost:4321/api/admin/approvals
```
Expected: 403 `admin_required`. Not 401, not 200.

## 3. Production first-admin bootstrap (owner only, ONE TIME)

In your own terminal, never chat:
```bash
# Replace with YOUR Google subject id from the OAuth callback / Google account
wrangler d1 execute balik-baleno-db --remote --command \
  "UPDATE users SET role='super_admin' WHERE google_subject='<YOUR_SUB>';"
```
Confirm:
```bash
wrangler d1 execute balik-baleno-db --remote --command \
  "SELECT id, display_name, role FROM users WHERE role='super_admin';"
```

## 4. Gate close
- Update PLAN.md STATUS: Phase 6 → verified.
- Commit.
- Do NOT deploy Phase 7 until owner approves.
