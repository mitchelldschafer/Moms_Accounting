# TaxDocs - Single CPA Tax Assistant

## Project Overview
TaxDocs is a web application that serves as a single accountant's tax preparation assistant. It connects a CPA with their clients to collect tax documents, extract financial data, and streamline tax return preparation.

**Stack:** Next.js 14 (App Router) / TypeScript / Tailwind CSS / shadcn/ui / Supabase (Auth + PostgreSQL + Storage)

## Architecture

### Directory Structure
```
app/                    → Next.js App Router pages
  client/               → Client portal (dashboard, upload, documents, tax-info, messages, profile)
  cpa/                  → CPA portal (dashboard, clients, documents, tax-prep, tasks, messages, settings)
  login/ signup/        → Authentication pages
components/             → React components
  layouts/              → ClientLayout and CPALayout wrappers
  ui/                   → shadcn/ui primitives (do not modify directly)
lib/                    → Business logic and utilities
  supabase/             → Supabase client, auth helpers, storage utils, TypeScript types
  document-classifier.ts → Filename-based document type detection
  field-extractor.ts    → Expected field definitions and initial extraction per doc type
  tax-summary.ts        → Aggregation of extracted data into tax prep summary
hooks/                  → Custom React hooks
supabase/migrations/    → PostgreSQL migration files (RLS policies, schema)
```

### Data Flow
1. **CPA signs up** → creates firm → invites clients via email
2. **Client signs up** via invitation link → auto-assigned to CPA
3. **Client uploads documents** → auto-classified by filename → extracted_data fields created
4. **Client enters tax info** → income sources, deductions, dependents saved to clients_profile
5. **CPA reviews** → views documents, edits extracted fields, sees auto-populated tax summary
6. **CPA tax prep workspace** → aggregated view of all income, deductions, and withholdings per client

### Key Database Tables
- `users` — all users (role: 'cpa' | 'client'), links to firm and assigned CPA
- `clients_profile` — extended client info: SSN, filing status, dependents, address
- `documents` — uploaded files with type classification and status tracking
- `extracted_data` — field-level values from documents (wages, interest, etc.)
- `tasks` — CPA assigns tasks to clients
- `messages` — CPA ↔ client messaging
- `client_invitations` — invitation tokens for onboarding

### Document Types & Fields
Each document type has defined expected fields in `lib/field-extractor.ts`:
- **W-2**: employer_name, wages, federal/state tax withheld, SS/Medicare
- **1099-INT**: payer_name, interest income
- **1099-DIV**: ordinary/qualified dividends, capital gains
- **1099-MISC**: rents, royalties, other income
- **1099-NEC**: nonemployee compensation
- **1099-B**: proceeds, cost basis, gain/loss
- **Schedule C**: business income/expenses
- **Receipts**: vendor, amount, category
- **Bank Statements**: bank, balance, period

## Development Guidelines

### Running the App
```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript type checking
```

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

### Conventions
- All pages are `'use client'` components (client-side rendering with Supabase)
- Use `(supabase as any)` for mutations to work around strict typing on inserts/updates
- Use `useAuth()` hook from `components/auth-provider.tsx` for current user
- Use `useToast()` hook for user notifications
- Wrap client pages in `<ClientLayout>`, CPA pages in `<CPALayout>`
- Document status flow: `uploaded → processing → extracted → reviewed → complete`
- Currency values are stored as strings in extracted_data and formatted on display

### When Making Changes
- Always run `npm run typecheck` before committing
- Do not modify files in `components/ui/` (these are shadcn/ui primitives)
- New pages need to be added to the nav in `components/layouts/client-layout.tsx` or `cpa-layout.tsx`
- Database changes require a new migration file in `supabase/migrations/`
- Keep Supabase types in `lib/supabase/types.ts` in sync with schema changes
