# Testing the Tax Document Management System

## Authentication Testing Guide

### Prerequisites

1. Make sure your `.env` file has the correct Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

2. Verify the migrations have been applied in Supabase

3. Start the development server (it should already be running)

## Test 1: CPA Signup and Login

### Step 1: Create a CPA Account

1. Navigate to `/signup`
2. Fill in the form:
   - Role: Select "CPA / Tax Professional"
   - Firm Name: "Test CPA Firm" (required for CPAs)
   - Full Name: "John Smith"
   - Email: "test-cpa@example.com"
   - Password: "password123" (min 6 characters)
3. Click "Sign Up"
4. You should see a success message and be redirected to `/login`

### Step 2: Login as CPA

1. On the login page, enter:
   - Email: "test-cpa@example.com"
   - Password: "password123"
2. Click "Login"
3. You should be redirected to `/cpa/dashboard`
4. Verify the CPA dashboard loads with:
   - Navigation sidebar with: Dashboard, Clients, Documents, Tasks, Messages, Settings
   - Top bar showing your name "John Smith" and a Logout button
   - Overview cards showing "0" for all stats (no clients yet)
   - Empty state message: "No clients assigned yet"

### Step 3: Explore CPA Portal

Navigate through the sidebar to verify all pages load:
- Dashboard ✓
- Clients (should show empty state)
- Documents (should show empty state)
- Tasks (should show empty state)
- Messages (should show empty state)
- Settings (should show firm profile with "Test CPA Firm")

## Test 2: Client Signup and Login

### Step 1: Create a Client Account

1. Logout from CPA account (click Logout button)
2. Navigate to `/signup`
3. Fill in the form:
   - Role: Select "Client"
   - Full Name: "Jane Doe"
   - Email: "test-client@example.com"
   - Password: "password123"
4. Click "Sign Up"
5. You should see a success message and be redirected to `/login`

### Step 2: Login as Client

1. On the login page, enter:
   - Email: "test-client@example.com"
   - Password: "password123"
2. Click "Login"
3. You should be redirected to `/client/dashboard`
4. Verify the client dashboard loads with:
   - Top navigation: Logo, My Documents, Upload, Messages, Profile, Logout
   - Welcome message with client name
   - Stats showing "0" documents
   - Empty state for uploads

### Step 3: Explore Client Portal

Navigate through the top navigation to verify all pages load:
- Dashboard ✓
- My Documents (should show empty state)
- Upload (should show upload form)
- Messages (should show empty state)
- Profile (should show profile form with client name and email)

## Test 3: Assign Client to CPA (Database Operation)

Since the invite system isn't built yet, you need to manually assign the client to the CPA in the database:

1. Go to your Supabase Dashboard
2. Navigate to Table Editor → `users` table
3. Find the client user (test-client@example.com)
4. Edit the row and set:
   - `assigned_cpa_id` = the UUID of your CPA user (copy from test-cpa@example.com row)
5. Save the change

Now when you:
- Login as the CPA → you should see this client in the Clients list
- Login as the Client → you can upload documents that will be visible to the CPA

## Test 4: Document Upload (After Assignment)

1. Login as Client (test-client@example.com)
2. Navigate to "Upload"
3. Select Tax Year: 2024
4. Select Document Type: W-2 (optional)
5. Drag and drop or select a PDF/image file
6. File should upload successfully
7. Navigate to "My Documents" to see the uploaded file
8. Logout

9. Login as CPA (test-cpa@example.com)
10. Navigate to "Dashboard" → should see 1 document pending review
11. Click on the client name to view client detail
12. In the Documents tab, you should see the uploaded document
13. Click the checkmark icon to mark it as "Reviewed"

## Troubleshooting

### Issue: "No CPA assigned" error when uploading
- Make sure you manually assigned the client to a CPA in the database (Test 3)

### Issue: CPA can't see clients
- Verify the `assigned_cpa_id` is set correctly in the users table
- Check that both users have the correct roles ('cpa' and 'client')

### Issue: Login redirects to wrong dashboard
- Clear browser cache and cookies
- Check the `role` field in the users table

### Issue: "Invalid email or password"
- Verify the user was created in Supabase Auth (check Authentication → Users in Supabase Dashboard)
- Try resetting the password through Supabase Dashboard

### Issue: Pages show loading forever
- Check browser console for errors
- Verify `.env` has correct Supabase credentials
- Check that all migrations were applied successfully

## Success Criteria

- ✓ CPA can sign up and create a firm
- ✓ CPA can log in and access CPA dashboard
- ✓ All CPA portal pages load without errors
- ✓ Client can sign up
- ✓ Client can log in and access client dashboard
- ✓ All client portal pages load without errors
- ✓ After manual assignment, CPA sees client in list
- ✓ After manual assignment, client can upload documents
- ✓ CPA can view and review client documents

## Next Steps

After basic authentication works:
1. Build client invitation system (CPAs can invite clients by email)
2. Add document extraction features
3. Implement automated missing document detection
4. Add export to tax software functionality
