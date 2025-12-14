# Vercel Deployment Quick Checklist

## Before You Start
- [x] Code is on GitHub: https://github.com/bobdavies/SaloneFix
- [x] Build works locally: `npm run build`
- [ ] Have your API keys ready (see below)

## Required API Keys/Secrets

Before deploying, gather these:

### 1. Supabase Credentials
- [ ] Supabase Project URL
  - Where: Supabase Dashboard → Settings → API → Project URL
  - Format: `https://xxxxxxxxxxxxx.supabase.co`

- [ ] Supabase Anonymous Key
  - Where: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
  - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Google Gemini API Key
- [ ] Gemini API Key
  - Where: [Google AI Studio](https://makersuite.google.com/app/apikey)
  - Format: `AIzaSy...`

## Vercel Deployment Steps

1. [ ] Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. [ ] Click "Add New Project"
3. [ ] Import `bobdavies/SaloneFix` repository
4. [ ] Add Environment Variables:
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` = (your Supabase URL)
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your Supabase key)
   - [ ] `NEXT_PUBLIC_GEMINI_API_KEY` = (your Gemini key)
   - [ ] `NEXT_PUBLIC_GEMINI_MODEL` = `gemini-1.5-pro` (optional)
5. [ ] Click "Deploy"
6. [ ] Wait for build to complete (2-5 minutes)
7. [ ] Visit your live URL: `https://salonefix.vercel.app` (or similar)

## After Deployment

- [ ] Test the app on the live URL
- [ ] Verify environment variables are working
- [ ] Check build logs for any warnings
- [ ] Bookmark your Vercel dashboard URL

## Quick Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **GitHub Repo:** https://github.com/bobdavies/SaloneFix
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Google AI Studio:** https://makersuite.google.com/app/apikey

---

**Detailed instructions:** See `VERCEL_DEPLOYMENT.md`
