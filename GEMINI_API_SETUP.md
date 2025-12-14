# Gemini API Setup Guide

## Common Errors

### Error 1: `API key not valid. Please pass a valid API key.`
This means your Gemini API key is either:
- Missing
- Invalid/expired
- Not properly loaded by Next.js

### Error 2: `models/gemini-1.5-flash is not found for API version v1beta`
This means the model name is not available in your API version or region. The code now uses `gemini-pro` by default, which is more stable.

## How to Fix

### Step 1: Get a Valid Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (it starts with `AIza...`)

### Step 2: Update Your .env.local File

Open `.env.local` in your project root and make sure it has:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_GEMINI_MODEL=gemini-pro
```

**Important:**
- Replace `your_actual_api_key_here` with the key you copied from Google AI Studio
- `NEXT_PUBLIC_GEMINI_MODEL` is optional - defaults to `gemini-pro` (most stable)
- Available models: `gemini-pro`, `gemini-1.5-flash-latest`, `gemini-1.5-pro-latest`
- Make sure there are no quotes around the values
- Make sure there are no spaces before or after the `=`

### Step 3: Restart the Development Server

After updating `.env.local`, you **must** restart the dev server:

1. Stop the current server (Ctrl+C in the terminal)
2. Start it again: `npm run dev`

**Why?** Next.js only loads environment variables when it starts. Changes to `.env.local` won't be picked up until you restart.

### Step 4: Verify It's Working

1. Open the app in your browser
2. Try submitting a report with a photo
3. The AI analysis should work without errors

## Troubleshooting

### If it still doesn't work:

1. **Check the API key format:**
   - Should start with `AIza`
   - Should be about 39 characters long
   - No spaces or quotes

2. **Verify the file name:**
   - Must be exactly `.env.local` (not `.env`, not `.env.example`)
   - Must be in the project root directory

3. **Check for typos:**
   - Variable name must be exactly: `NEXT_PUBLIC_GEMINI_API_KEY`
   - Case-sensitive!

4. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

5. **Check API key restrictions:**
   - In Google AI Studio, make sure your API key doesn't have restrictions that block your usage
   - For development, you can use it without restrictions

6. **Model not found error (404):**
   - If you get a "model not found" error, the model name might not be available
   - The code defaults to `gemini-pro` which is the most stable
   - You can override it by setting `NEXT_PUBLIC_GEMINI_MODEL=gemini-pro` in `.env.local`
   - Try these models in order: `gemini-pro`, `gemini-1.5-pro-latest`, `gemini-1.5-flash-latest`

## Security Note

⚠️ **Important:** The `NEXT_PUBLIC_` prefix means this key will be exposed to the browser. For production, consider:
- Using a server-side API route to call Gemini
- Setting up API key restrictions in Google Cloud Console
- Using environment-specific keys

For a hackathon/demo, this is acceptable, but be aware of the security implications.

