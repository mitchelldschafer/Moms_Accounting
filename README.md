# TaxDocs - Professional Tax Document Management System

A comprehensive multi-tenant SaaS application for managing tax documents between CPAs and their clients. Built with Next.js 14, TypeScript, Supabase, and shadcn/ui.

## Features

### Client Portal
- **Dashboard**: Overview of document upload progress, recent uploads, messages, and tasks
- **Document Upload**: Drag-and-drop file upload with progress tracking
- **Document Management**: View, filter, and manage uploaded tax documents
- **Messages**: Communicate directly with assigned CPA
- **Profile Management**: Update personal and tax information

### CPA Portal
- **Dashboard**: Client overview, pending reviews, and activity tracking
- **Client Management**: View all clients with progress indicators
- **Client Detail View**: Comprehensive tabs for documents, extracted data, tasks, and messages
- **Document Review**: Review and approve client documents
- **Task Management**: Create and track tasks for clients
- **Messaging**: Communicate with all clients
- **Firm Settings**: Manage firm profile and preferences

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Form Validation**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd taxdocs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project settings.

4. Database Setup:

The database migrations have already been applied to your Supabase instance:
- `create_tax_management_schema`: Creates all tables and types
- `setup_storage_bucket`: Creates the tax-documents storage bucket
- `create_rls_policies`: Sets up Row Level Security policies
- `seed_demo_data`: Adds demo CPA firm

5. Create Demo Users:

Use the signup flow at `/signup` to create:
- **CPA Account**: Select "CPA / Tax Professional" role
- **Client Account**: Select "Client" role

Or use the Supabase Auth UI to create test users.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
├── app/                      # Next.js app directory
│   ├── client/              # Client portal pages
│   │   ├── dashboard/
│   │   ├── upload/
│   │   ├── documents/
│   │   ├── messages/
│   │   └── profile/
│   ├── cpa/                 # CPA portal pages
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── documents/
│   │   ├── tasks/
│   │   ├── messages/
│   │   └── settings/
│   ├── login/               # Authentication pages
│   ├── signup/
│   └── layout.tsx           # Root layout with AuthProvider
├── components/              # React components
│   ├── layouts/             # Layout components
│   ├── ui/                  # shadcn/ui components
│   ├── auth-provider.tsx    # Authentication context
│   ├── status-badge.tsx     # Status indicators
│   ├── document-type-label.tsx
│   └── file-upload.tsx      # File upload component
├── lib/                     # Utility functions
│   ├── supabase/            # Supabase configuration
│   │   ├── client.ts        # Supabase client
│   │   ├── types.ts         # TypeScript types
│   │   └── auth.ts          # Auth helpers
│   └── utils.ts
└── hooks/                   # Custom React hooks
```

## Database Schema

### Main Tables

- **cpa_firms**: CPA firm information
- **users**: User profiles (extends auth.users)
- **clients_profile**: Extended client information
- **documents**: Uploaded tax documents
- **extracted_data**: Field-level extracted data
- **tasks**: Task management
- **messages**: Internal messaging

### Security

All tables have Row Level Security (RLS) enabled with policies ensuring:
- Clients can only access their own data
- CPAs can access data for their assigned clients
- Proper authentication required for all operations

## File Upload

Documents are stored in Supabase Storage:
- **Bucket**: `tax-documents` (private)
- **Structure**: `{firm_id}/{client_id}/{tax_year}/{document_id}-{filename}`
- **Max Size**: 50MB per file
- **Allowed Types**: PDF, JPG, PNG, HEIC

## Authentication Flow

1. Users sign up via `/signup`
2. Email/password authentication
3. Role-based routing:
   - CPAs → `/cpa/dashboard`
   - Clients → `/client/dashboard`
4. Session managed by Supabase Auth

## Future Enhancements

The following features are prepared for future implementation:

- **Document Extraction**: Automated field extraction from uploaded documents
- **OCR Integration**: Optical character recognition for scanned documents
- **AI Classification**: Automatic document type detection
- **Missing Document Detection**: Smart algorithms to identify missing forms
- **Tax Software Export**: Export data to ProSeries, Drake, Lacerte formats
- **Batch Operations**: Bulk document processing
- **Advanced Reporting**: Analytics and insights
- **Email Notifications**: Automated email alerts
- **API Integrations**: Connect with third-party services

## Testing

### Demo Accounts

After running the seed migration, you can create test accounts:

**CPA Account:**
- Sign up at `/signup`
- Select "CPA / Tax Professional"
- Create firm: "Demo CPA Firm"

**Client Account:**
- Sign up at `/signup`
- Select "Client"
- Will need to be assigned to a CPA manually via database

### Testing Workflow

1. Sign up as CPA
2. Sign up as Client
3. Manually assign client to CPA in database:
   ```sql
   UPDATE users
   SET assigned_cpa_id = 'cpa_user_id'
   WHERE id = 'client_user_id';
   ```
4. Log in as client and upload documents
5. Log in as CPA and review documents

## Building for Production

```bash
npm run build
```

This creates an optimized production build in the `.next` directory.

## Deployment

### Recommended: Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Alternative: Netlify

The project includes `netlify.toml` configuration for Netlify deployment.

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Optional (for future features):

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Support

For issues or questions:
1. Check the database logs in Supabase
2. Review RLS policies if access issues occur
3. Ensure environment variables are set correctly

## License

This project is proprietary software.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Backend powered by [Supabase](https://supabase.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
