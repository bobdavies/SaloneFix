# Deployment Guide for SaloneFix

## Prerequisites
- Git repository initialized ✅
- Initial commit created ✅

## Step 1: Push to GitHub/GitLab

### Create a new repository on GitHub:
1. Go to [github.com](https://github.com) and sign in
2. Click the "+" icon → "New repository"
3. Name it `SaloneFix` (or your preferred name)
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/SaloneFix.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your `SaloneFix` repository
4. Vercel will auto-detect Next.js settings
5. **Add Environment Variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `NEXT_PUBLIC_GEMINI_API_KEY` - Your Google Gemini API key
   - `NEXT_PUBLIC_GEMINI_MODEL` - (Optional) Model name, defaults to 'gemini-pro'
6. Click "Deploy"

### Option B: Via Vercel CLI
```bash
npm i -g vercel
vercel
# Follow the prompts and add environment variables when asked
```

## Step 3: Post-Deployment

After deployment, Vercel will provide you with:
- Production URL (e.g., `https://salonefix.vercel.app`)
- Preview URLs for each commit

### Important Notes:
- Environment variables are automatically available in your Next.js app
- The build command `next build` will run automatically
- Your app will rebuild on every push to the main branch (if connected)

## Troubleshooting

### Build Errors:
- Check that all environment variables are set in Vercel dashboard
- Verify `package.json` has the correct build script
- Check Vercel build logs for specific errors

### Environment Variables Not Working:
- Ensure all variables start with `NEXT_PUBLIC_` for client-side access
- Restart the deployment after adding new variables
- Check variable names match exactly (case-sensitive)
