# ACE CRM Client Portal

A comprehensive client portal built with Next.js, TypeScript, Tailwind CSS, and Supabase. This portal provides clients with access to their projects, files, invoices, support tickets, and real-time communication.

## 🚀 Features

### Core Features
- **Authentication & Authorization** - Secure client login with Supabase Auth
- **Project Management** - View project status, progress, and details
- **File Management** - Download project files and deliverables
- **Invoice System** - View invoices and process payments with Stripe
- **Support Tickets** - Create and track support requests
- **Real-time Chat** - Communicate with project teams
- **Knowledge Base** - Access help articles and documentation
- **White-label Support** - Customizable branding and theming

### Technical Features
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Mode** - System-aware theme switching
- **Real-time Updates** - Live data synchronization with Supabase
- **File Upload/Download** - Secure file handling with Supabase Storage
- **Payment Processing** - Stripe integration for invoice payments
- **Email Notifications** - Automated client communications
- **Role-based Access** - Client-specific data isolation

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Payments**: Stripe
- **Real-time**: Socket.io (optional), Supabase Realtime
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- Supabase project with the following services:
  - Database (PostgreSQL)
  - Authentication
  - Storage
  - Real-time subscriptions
- Stripe account (for payments)
- Socket.io server (optional, for enhanced real-time features)

## 🚀 Getting Started

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd client-portal

# Install dependencies
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Socket.io Configuration (optional)
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000

# White Label Configuration
NEXT_PUBLIC_BRAND_NAME=Your Brand Name
NEXT_PUBLIC_BRAND_LOGO=/logo.png
NEXT_PUBLIC_PRIMARY_COLOR=#3B82F6
NEXT_PUBLIC_SECONDARY_COLOR=#1F2937
```

### 3. Database Setup

Run the database migrations in your Supabase SQL editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('client', 'admin', 'team')) DEFAULT 'client',
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_projects table
CREATE TABLE client_projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('planning', 'in-progress', 'review', 'completed', 'cancelled')) DEFAULT 'planning',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create project_files table
CREATE TABLE project_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES client_projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT CHECK (category IN ('deliverable', 'asset', 'document', 'feedback', 'other')) DEFAULT 'other',
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  is_client_visible BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_invoices table
CREATE TABLE client_invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
  due_date DATE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id TEXT,
  line_items JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Continue with other tables...
-- (See database schema file for complete setup)
```

### 4. Storage Setup

Create the following storage buckets in Supabase:

- `project-files` - For project deliverables and documents
- `chat-files` - For chat attachments
- `avatars` - For user profile pictures

### 5. Row Level Security (RLS)

Enable RLS policies to ensure data security:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
-- ... continue for all tables

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Clients can view own projects" ON client_projects
  FOR SELECT USING (auth.uid() = client_id);

-- ... continue with all necessary policies
```

### 6. Start Development

```bash
npm run dev
```

The application will be available at `http://localhost:3001`.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard-specific components
│   ├── files/             # File management components
│   ├── layout/            # Layout components
│   ├── support/           # Support system components
│   └── ui/                # Base UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── services/              # API service layers
├── stores/                # State management
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## 🔧 Configuration

### White-label Customization

Customize the portal's appearance by modifying environment variables:

```bash
NEXT_PUBLIC_BRAND_NAME="Your Company"
NEXT_PUBLIC_BRAND_LOGO="/your-logo.png"
NEXT_PUBLIC_PRIMARY_COLOR="#your-primary-color"
NEXT_PUBLIC_SECONDARY_COLOR="#your-secondary-color"
```

### Email Templates

Configure email templates in Supabase Auth settings for:
- Welcome emails
- Password reset
- Invoice notifications
- Project updates

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables
4. Deploy

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:

- Supabase keys and URL
- Stripe keys and webhook secret
- Custom branding variables
- Socket.io server URL (if using)

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **JWT Authentication** - Secure token-based auth
- **HTTPS Enforcement** - Encrypted data transmission
- **Input Validation** - Form and API input sanitization
- **File Upload Security** - Secure file handling and validation
- **Payment Security** - PCI-compliant Stripe integration

## 📊 Performance

The portal is optimized for performance with:
- **Next.js App Router** - Efficient routing and rendering
- **Server Components** - Reduced client-side JavaScript
- **Image Optimization** - Automatic image optimization
- **Caching** - Intelligent data caching strategies
- **Code Splitting** - Optimized bundle loading
- **Real-time Subscriptions** - Efficient data synchronization

## 🧪 Testing

```bash
# Run tests
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint
```

## 📝 API Documentation

The portal includes several API endpoints:

- `/api/create-payment-intent` - Creates Stripe payment intents
- `/api/webhooks/stripe` - Handles Stripe webhook events
- `/api/invoices/[id]/pdf` - Generates invoice PDFs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the knowledge base within the portal
- Create a support ticket through the portal
- Contact the development team

## 🔄 Updates

The portal includes automatic update notifications and version management. Updates are deployed seamlessly with zero-downtime deployments.