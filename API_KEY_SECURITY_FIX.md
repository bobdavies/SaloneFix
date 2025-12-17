# API Key Security Issue - Fix Guide

## 🔴 Problem Identified

You're experiencing this error:
```
[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [403] Your API key was reported as leaked. Please use another API key.
```

## 🔍 Root Cause

Your Google Gemini API key was **flagged as leaked** by Google because:

1. **Hardcoded API keys in test files**: The API key `AIzaSyA0TX4vCYnrHG5v26498An0dYFnjn27iN4` was hardcoded in:
   - `list_models.js` (line 3)
   - `check_models.js` (line 5)

2. **Environment files not properly ignored**: The `.env.local` file was not being ignored by git (it was commented out in `.gitignore`), meaning if it was committed, the API key would be exposed.

3. **Public exposure**: When these files with hardcoded keys are committed to a public repository or shared, Google's security systems detect them and automatically disable the key.

## ✅ What Has Been Fixed

1. ✅ **Removed hardcoded API keys** from `list_models.js` and `check_models.js`
2. ✅ **Updated test files** to use environment variables instead
3. ✅ **Fixed `.gitignore`** to properly ignore `.env.local` and `.env` files
4. ✅ **Added security warnings** in test files

## 🛠️ Solution Steps

### Step 1: Generate a New API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey) or [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click **Create Credentials** → **API Key**
4. Copy the new API key (it will start with `AIza...`)
5. **Important**: Restrict the API key to only the Generative Language API to improve security

### Step 2: Update Your Environment File

Open `.env.local` in your project root and update the API key:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_new_api_key_here
```

**Replace `your_new_api_key_here` with your actual new API key.**

### Step 3: Restart Your Development Server

After updating the API key:

1. Stop your current development server (Ctrl+C)
2. Restart it:
   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   ```

### Step 4: Verify the Fix

1. Try submitting a report again from the citizen view
2. The AI image analysis should now work without the 403 error

## 🔒 Security Best Practices (Going Forward)

### ✅ DO:
- ✅ Always use environment variables for API keys
- ✅ Keep `.env.local` in `.gitignore` (already fixed)
- ✅ Use different API keys for development and production
- ✅ Restrict API keys in Google Cloud Console to specific APIs/IPs
- ✅ Rotate API keys periodically
- ✅ Never commit API keys to version control

### ❌ DON'T:
- ❌ Hardcode API keys in source code
- ❌ Commit `.env.local` or `.env` files
- ❌ Share API keys in screenshots, documentation, or chat
- ❌ Use the same API key across multiple projects
- ❌ Leave API keys unrestricted in Google Cloud Console

## 🧪 Testing Your New API Key

You can test your new API key using the updated test files:

**Windows:**
```powershell
$env:NEXT_PUBLIC_GEMINI_API_KEY="your_new_key_here"
node check_models.js
```

**Linux/Mac:**
```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_new_key_here node check_models.js
```

Or simply ensure your `.env.local` file has the key and the test files will read it automatically.

## 📝 Additional Notes

- The error occurs at `src/services/reportService.ts:79` when calling `model.generateContent()`
- The API key is loaded from `process.env.NEXT_PUBLIC_GEMINI_API_KEY`
- The `NEXT_PUBLIC_` prefix is required for Next.js to expose the variable to client-side code
- If you're deploying to Vercel, make sure to add the new API key to your Vercel environment variables

## 🚨 If the Problem Persists

If you still see the error after generating a new key:

1. **Wait a few minutes**: Google's systems may need time to propagate the new key
2. **Check the API key format**: Should start with `AIza` and be about 39 characters long
3. **Verify environment variable**: Make sure `.env.local` has the correct variable name: `NEXT_PUBLIC_GEMINI_API_KEY`
4. **Clear Next.js cache**: Delete `.next` folder and restart the dev server
5. **Check API quotas**: Ensure your Google Cloud project has API access enabled and quotas available

## 📚 Related Files

- `src/services/reportService.ts` - Main service using the API key
- `.env.local` - Environment variables (not in git)
- `list_models.js` - Test file (now uses env vars)
- `check_models.js` - Test file (now uses env vars)
- `.gitignore` - Now properly ignores environment files

---

**Last Updated**: After fixing the security issue
**Status**: ✅ Fixed - Ready for new API key

