# Row Level Security (RLS) Policy Setup

## ⚠️ Critical: Admin Actions May Fail Due to RLS Policies

If admin actions are not persisting, it's likely a **Row Level Security (RLS)** policy issue.

## Quick Fix: Disable RLS for Testing (Not Recommended for Production)

```sql
-- TEMPORARY: Disable RLS for testing
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
```

**⚠️ WARNING:** Only do this for testing! Re-enable RLS for production.

## Proper RLS Policy Setup

### 1. Enable RLS

```sql
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
```

### 2. Create Policies

#### Policy 1: Allow anyone to INSERT (submit reports)
```sql
CREATE POLICY "Allow public insert" ON reports
FOR INSERT
TO public
WITH CHECK (true);
```

#### Policy 2: Allow anyone to SELECT (view reports)
```sql
CREATE POLICY "Allow public select" ON reports
FOR SELECT
TO public
USING (true);
```

#### Policy 3: Allow authenticated admins to UPDATE
```sql
-- First, create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user exists in an admins table (create this if needed)
  -- OR use a simple check like email domain
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id 
    AND email LIKE '%@admin.salonefix.com'  -- Adjust to your admin email pattern
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Then create the UPDATE policy
CREATE POLICY "Allow admin update" ON reports
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
```

#### Policy 4: Allow authenticated admins to DELETE
```sql
CREATE POLICY "Allow admin delete" ON reports
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
```

### 3. Alternative: Service Role Key (For Admin Operations)

If you're using the service role key (not recommended for client-side), RLS is bypassed.

**Check your Supabase client configuration:**
- If using `NEXT_PUBLIC_SUPABASE_ANON_KEY` → RLS policies apply
- If using service role key → RLS is bypassed (security risk!)

## Testing RLS Policies

Run this in Supabase SQL Editor to test:

```sql
-- Test if you can update (should return 1 row if policy works)
UPDATE reports 
SET status = 'In Progress' 
WHERE id = (SELECT id FROM reports LIMIT 1)
RETURNING id, status;

-- If this fails, RLS is blocking updates
```

## Common RLS Issues

### Issue: "new row violates row-level security policy"
**Cause:** INSERT policy doesn't allow the operation
**Fix:** Create INSERT policy (see above)

### Issue: "permission denied for table reports"
**Cause:** No UPDATE policy exists
**Fix:** Create UPDATE policy for admins (see above)

### Issue: Updates work but don't persist
**Cause:** Policy allows UPDATE but WITH CHECK fails
**Fix:** Ensure WITH CHECK matches USING clause

## Quick Diagnostic

Run this to check your current policies:

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'reports';
```

## Recommended Setup for SaloneFix

Since this is a civic reporting app, you likely want:

1. **Public can INSERT** (anyone can submit reports)
2. **Public can SELECT** (anyone can view reports)
3. **Authenticated admins can UPDATE** (only admins can change status)
4. **Authenticated admins can DELETE** (only admins can delete)

## Testing After Policy Setup

1. Submit a report (should work - public INSERT)
2. View reports (should work - public SELECT)
3. Login as admin
4. Change report status (should work - admin UPDATE)
5. Refresh page (status should persist)

If step 4 or 5 fails, check:
- Admin authentication is working
- `is_admin()` function returns true for your user
- UPDATE policy is correctly configured






