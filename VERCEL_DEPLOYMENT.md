# Vercel Deployment Guide for SaloneFix

## Quick Start Checklist

- [x] Git repository initialized
- [x] Code pushed to GitHub (https://github.com/bobdavies/SaloneFix)
- [ ] Vercel account created/connected
- [ ] Project imported from GitHub
- [ ] Environment variables configured
- [ ] Deployment successful

---

## Step-by-Step Deployment Instructions

### Step 1: Sign in to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended for easy integration)
4. Authorize Vercel to access your GitHub account

### Step 2: Import Your Project

1. After signing in, you'll see the Vercel dashboard
2. Click the **"Add New..."** button (top right)
3. Select **"Project"**
4. You'll see a list of your GitHub repositories
5. Find **"SaloneFix"** (or search for it)
6. Click **"Import"** next to your repository

### Step 3: Configure Project Settings

Vercel will auto-detect Next.js, but verify these settings:

- **Framework Preset:** Next.js (should be auto-detected)
- **Root Directory:** `./` (leave as default)
- **Build Command:** `next build` (auto-filled)
- **Output Directory:** `.next` (auto-filled)
- **Install Command:** `npm install` (auto-filled)

**Leave these as default** - Vercel knows Next.js projects!

### Step 4: Add Environment Variables ⚠️ CRITICAL

This is the most important step! Click **"Environment Variables"** and add:

#### Required Variables:

1. **NEXT_PUBLIC_SUPABASE_URL**
   - **Value:** Your Supabase project URL
   - **Example:** `https://xxxxxxxxxxxxx.supabase.co`
   - **Where to find:** Supabase Dashboard → Project Settings → API → Project URL

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - **Value:** Your Supabase anonymous/public key
   - **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Where to find:** Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`

3. **NEXT_PUBLIC_GEMINI_API_KEY**
   - **Value:** Your Google Gemini API key
   - **Example:** `AIzaSy...`
   - **Where to get:** [Google AI Studio](https://makersuite.google.com/app/apikey)

#### Optional Variables:

4. **NEXT_PUBLIC_GEMINI_MODEL** (Optional)
   - **Value:** Model name (defaults to `gemini-pro` if not set)
   - **Options:** `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash-latest`
   - **Recommended:** Leave empty to use default, or set to `gemini-1.5-pro` for better results

### Step 5: Deploy!

1. After adding all environment variables, scroll down
2. Click the big **"Deploy"** button
3. Wait for the build to complete (usually 2-5 minutes)
4. 🎉 Your app will be live!

### Step 6: Get Your Live URL

After deployment:
- Vercel will provide a production URL like: `https://salonefix.vercel.app`
- You can also set a custom domain later in project settings
- Each commit to `main` branch will trigger automatic deployments

---

## Post-Deployment

### Verify Deployment

1. Visit your production URL
2. Test the main features:
   - Report submission
   - Image upload
   - Admin dashboard (if applicable)

### Monitor Deployments

- Go to your project dashboard on Vercel
- Click on "Deployments" tab to see build logs
- Each deployment shows build status, logs, and timing

### Automatic Deployments

- **Production:** Every push to `main` branch
- **Preview:** Every push to other branches (creates preview URLs)
- **Pull Requests:** Creates preview deployments automatically

---

## Troubleshooting

### Build Fails

**Error: Missing environment variables**
- Solution: Go to Project Settings → Environment Variables and add all required variables
- Redeploy after adding variables

**Error: Module not found**
- Solution: Check that `package.json` has all dependencies
- Vercel runs `npm install` automatically

**Error: Build timeout**
- Solution: Check build logs for specific errors
- Ensure `next build` completes successfully locally first

### App Works Locally But Not on Vercel

**Environment Variables Not Working**
- Ensure all variables start with `NEXT_PUBLIC_` for client-side access
- Variables are case-sensitive
- Redeploy after adding/updating variables

**API Errors**
- Check that Supabase URL and keys are correct
- Verify Gemini API key is valid
- Check Vercel function logs in the dashboard

### Check Build Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Click on the failed deployment
4. Click "View Function Logs" or "Build Logs"
5. Look for error messages

---

## Environment Variables Reference

| Variable Name | Required | Description | Example |
|--------------|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase anonymous key | `eyJhbGciOi...` |
| `NEXT_PUBLIC_GEMINI_API_KEY` | ✅ Yes | Google Gemini API key | `AIzaSy...` |
| `NEXT_PUBLIC_GEMINI_MODEL` | ❌ No | Gemini model name | `gemini-1.5-pro` |

---

## Next Steps After Deployment

1. **Set up custom domain** (optional)
   - Project Settings → Domains → Add your domain

2. **Enable Analytics** (optional)
   - Already included via `@vercel/analytics` package
   - View analytics in Vercel dashboard

3. **Set up monitoring** (optional)
   - Configure error tracking
   - Set up alerts for failed deployments

4. **Optimize performance**
   - Check Vercel Analytics for performance metrics
   - Optimize images and assets

---

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel Support](https://vercel.com/support)

---

**Need Help?** Check the build logs in Vercel dashboard for specific error messages.


