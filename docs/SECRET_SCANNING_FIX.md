# Fix GitHub “Push cannot contain secrets” (Stripe)

## Why it still fails after you “fixed” the files

GitHub scans **every commit** you push, not only the latest one. If an old commit (e.g. `b952d931`) still contains a Stripe key in `.env.example` or `payment-service/.env`, the push is **rejected** until that history is **removed or rewritten**.

**Deleting the secret in the latest commit is not enough** — you must use **Option A or B** below.

## What we changed in the repo

- `.env.example` — Stripe keys replaced with **placeholders** only.
- `services/payment-service/.env` — **removed from Git tracking** (use `services/payment-service/.env.example` as a template).
- Root `.gitignore` — ignores `**/.env` while keeping `*.env.example` committable.

## You still must fix **Git history**

Your **old commits** still contain the real keys until you rewrite history or start a clean branch.

### Option A — `git filter-repo` (keeps history, rewrites blobs)

1. Install: `pip install git-filter-repo` (or see [install docs](https://github.com/newren/git-filter-repo/blob/main/INSTALL.md)).
2. In the repo root, create a **temporary** file (do **not** commit it), e.g. `replacements.txt`, one line per replacement:

   ```text
   sk_test_YOUR_OLD_SECRET_FROM_HISTORY==>sk_test_replace_with_your_secret_key
   pk_test_YOUR_OLD_PUBLISHABLE_FROM_HISTORY==>pk_test_replace_with_your_publishable_key
   ```

   Use the **exact** strings that appear in `git log` / old files (same as what GitHub flagged).

3. Run:

   ```powershell
   git filter-repo --replace-text replacements.txt --force
   ```

4. Delete `replacements.txt`. **Rotate your Stripe keys** in the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) — the old ones are compromised.

5. Push:

   ```powershell
   git push --force-with-lease origin main
   ```

### Option B — New orphan branch (recommended for most students)

This creates **one new commit** with your current files and **drops all old commits** (so the leaked key disappears from history). Use this if you don’t need to preserve commit history.

Run from the repo root (`D:\CTSE-ASSIGNMENT\Feedo`):

```powershell
# 1) Save a new branch name with NO history (orphan)
git checkout --orphan clean-main

# 2) Stage everything that should be in the repo (respects .gitignore)
git add -A

# 3) First commit on the new history
git commit -m "Initial commit: Feedo (no leaked secrets in history)"

# 4) Remove the old main branch that still contains bad commits
git branch -D main

# 5) Rename this branch to main
git branch -m main

# 6) Push and replace remote main (required — old history is gone)
git push --force-with-lease origin main
```

**Notes:**

- **`--force-with-lease`** overwrites `main` on GitHub. If teammates use this repo, coordinate first.
- If step 6 asks for credentials, use your GitHub login / PAT as usual.
- After this, **rotate** your Stripe test keys in the dashboard (old ones were exposed).

If `git branch -D main` errors (e.g. wrong branch), run `git branch` and ensure you completed the commit on `clean-main` first.

## After pushing

1. Copy `services/payment-service/.env.example` → `services/payment-service/.env` and paste **your** keys locally.
2. Set root `.env` from `.env.example` for Docker Compose if needed.
