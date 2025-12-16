# SaloneFix Setup Instructions

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Supabase account (free tier works)
- Google Gemini API key

## Step 1: Clone and Install

```bash
npm install
# or
pnpm install
```

## Step 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run this schema:

```sql
-- Create reports table (minimum required columns)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  image_url TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved'))
);

-- Optional: Add additional columns for enhanced features
-- See DOC/database_migration.sql for optional columns:
-- - reporter_id (UUID) - Track authenticated users
-- - device_id (TEXT) - Track anonymous users
-- - assigned_to (TEXT) - Team assignment
-- - resolved_at (TIMESTAMPTZ) - Resolution timestamp

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('hazards', 'hazards', true);

-- Set up storage policy (allow public read, authenticated write)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'hazards');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hazards');
```

3. Get your Supabase URL and Anon Key from Settings > API

## Step 3: Set Up Google Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key

## Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your values:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-key
```

## Step 5: Run the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 6: (Optional) Add Enhanced Features

If you want to enable additional features like user tracking, team assignment, and resolution timestamps, run the migration script:

1. Go to Supabase SQL Editor
2. Run the SQL from `DOC/database_migration.sql`

This will add optional columns:
- `reporter_id` - Track which authenticated user submitted the report
- `device_id` - Track anonymous users via device ID
- `assigned_to` - Assign reports to teams
- `resolved_at` - Track when reports were resolved

**Note:** The app works without these columns - they're optional enhancements.

## Step 7: Test the Application

1. **Citizen View** (`/`):
   - Click "Report Hazard" button
   - Take/upload a photo
   - Verify geolocation capture
   - Check AI analysis
   - Confirm report appears in feed

2. **Admin View** (`/admin`):
   - View map with markers
   - Check reports list
   - Update report status
   - Verify changes persist

## Troubleshooting

### "Could not find the 'reporter_id' column" Error
**Solution:** This is normal if you haven't added the optional columns. The app will automatically retry without them. To enable user tracking, run the migration script in `DOC/database_migration.sql`.

### Other Database Column Errors
The app gracefully handles missing optional columns. If you see column errors, they're likely for optional features. The app will work with just the basic columns defined in Step 2.

### Geolocation Not Working
- Ensure you're using HTTPS (required for geolocation)
- Check browser permissions
- App will fallback to Freetown coordinates if denied

### Supabase Errors
- Verify your URL and keys are correct
- Check that the `reports` table exists
- Ensure storage bucket `hazards` is created and public

### Gemini API Errors
- Verify API key is valid
- Check API quota/limits
- Ensure key has vision model access

## Production Deployment

1. Set environment variables in your hosting platform (Vercel recommended)
2. Build the project: `npm run build`
3. Deploy to Vercel/Netlify

## Project Structure

```
├── app/                    # Next.js app router
│   ├── page.tsx           # Citizen landing page
│   └── admin/             # Admin dashboard
├── components/            # React components
│   ├── citizen-view.tsx   # Main citizen interface
│   └── admin-view.tsx     # Admin dashboard
├── src/
│   ├── lib/
│   │   └── supabase.ts   # Supabase client
│   └── services/
│       └── reportService.ts  # Business logic
└── lib/
    └── types.ts           # TypeScript types
```







