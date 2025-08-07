# ACE CRM API Documentation

## Overview
Complete Express.js backend API for ACE CRM system with Supabase integration, JWT authentication, file uploads, email capabilities, Stripe payments, and comprehensive error handling.

## Base URL
- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

## Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/register`
Register a new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Optional Company"
}
```

#### POST `/api/auth/login`
Login user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/refresh-token`
Refresh access token
```json
{
  "refresh_token": "your-refresh-token"
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication)

#### GET `/api/auth/profile`
Get current user profile (requires authentication)

#### PUT `/api/auth/profile`
Update user profile (requires authentication)
```json
{
  "first_name": "Updated Name",
  "phone": "+1234567890",
  "department": "Sales"
}
```

#### PUT `/api/auth/change-password`
Change user password (requires authentication)
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

### User Management (`/api/users`)
All routes require authentication

#### GET `/api/users`
Get all users with pagination (admin/manager only)
- Query parameters: `page`, `limit`, `search`, `role`, `is_active`

#### GET `/api/users/stats`
Get user statistics (admin/manager only)

#### GET `/api/users/:id`
Get user by ID

#### POST `/api/users`
Create new user (admin only)

#### PUT `/api/users/:id`
Update user

#### DELETE `/api/users/:id`
Delete user (admin only)

### Lead Management (`/api/leads`)

#### GET `/api/leads`
Get all leads with pagination
- Query parameters: `page`, `limit`, `search`, `status`, `assigned_to`

#### GET `/api/leads/stats`
Get lead statistics

#### POST `/api/leads`
Create new lead
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Example Corp",
  "source": "website",
  "expected_value": 5000,
  "notes": "Interested in web design services"
}
```

#### GET `/api/leads/:id`
Get lead by ID

#### PUT `/api/leads/:id`
Update lead

#### DELETE `/api/leads/:id`
Delete lead

#### GET `/api/leads/:id/activity`
Get lead activity history

#### POST `/api/leads/:id/convert`
Convert lead to contact/deal
```json
{
  "company_name": "New Company",
  "deal_title": "Website Redesign",
  "deal_value": 10000
}
```

### Contact Management (`/api/contacts`)

#### GET `/api/contacts`
Get all contacts with pagination

#### POST `/api/contacts`
Create new contact

#### GET `/api/contacts/:id`
Get contact by ID

#### PUT `/api/contacts/:id`
Update contact

#### DELETE `/api/contacts/:id`
Delete contact

### Company Management (`/api/companies`)

#### GET `/api/companies`
Get all companies

#### POST `/api/companies`
Create new company

#### GET `/api/companies/:id`
Get company by ID

#### PUT `/api/companies/:id`
Update company

#### DELETE `/api/companies/:id`
Delete company

### Deal Management (`/api/deals`)

#### GET `/api/deals`
Get all deals

#### POST `/api/deals`
Create new deal
```json
{
  "title": "Website Development",
  "description": "Build a new corporate website",
  "value": 15000,
  "stage": "prospecting",
  "probability": 50,
  "expected_close_date": "2024-12-31",
  "contact_id": "uuid",
  "company_id": "uuid"
}
```

#### GET `/api/deals/:id`
Get deal by ID

#### PUT `/api/deals/:id`
Update deal

#### DELETE `/api/deals/:id`
Delete deal

### Project Management (`/api/projects`)

#### GET `/api/projects`
Get all projects

#### POST `/api/projects`
Create new project
```json
{
  "name": "Website Redesign Project",
  "description": "Complete website overhaul",
  "status": "planning",
  "priority": "high",
  "start_date": "2024-01-01",
  "due_date": "2024-03-31",
  "budget": 25000,
  "company_id": "uuid"
}
```

#### GET `/api/projects/:id`
Get project by ID

#### PUT `/api/projects/:id`
Update project

#### DELETE `/api/projects/:id`
Delete project

### Payment Management (`/api/payments`)

#### POST `/api/payments/payment-intent`
Create Stripe payment intent
```json
{
  "amount": 5000,
  "currency": "USD",
  "invoice_id": "uuid"
}
```

#### GET `/api/payments/invoices`
Get all invoices

#### POST `/api/payments/invoices`
Create new invoice
```json
{
  "client_id": "uuid",
  "subtotal": 10000,
  "tax_rate": 0.08,
  "total": 10800,
  "due_date": "2024-02-15",
  "line_items": [
    {
      "description": "Web Development",
      "quantity": 1,
      "unit_price": 10000,
      "total": 10000
    }
  ]
}
```

#### GET `/api/payments/invoices/:id`
Get invoice by ID

#### PUT `/api/payments/invoices/:id`
Update invoice

#### POST `/api/payments/invoices/:id/send`
Send invoice to client

### File Management (`/api/files`)

#### POST `/api/files/upload`
Upload file (multipart/form-data)
- Form field: `file`
- Body: `related_type`, `related_id`, `is_public`

#### GET `/api/files`
Get all files

#### GET `/api/files/:id`
Get file by ID

#### GET `/api/files/:id/download`
Download file

#### DELETE `/api/files/:id`
Delete file

### Email Management (`/api/email`)

#### POST `/api/email/send`
Send email
```json
{
  "to": ["recipient@example.com"],
  "subject": "Your Invoice",
  "body": "Please find your invoice attached.",
  "template_id": "optional-uuid"
}
```

#### GET `/api/email/templates`
Get email templates (admin/manager only)

#### POST `/api/email/templates`
Create email template (admin/manager only)

### Analytics (`/api/analytics`)

#### GET `/api/analytics/dashboard`
Get dashboard statistics

#### GET `/api/analytics/sales`
Get sales analytics
- Query parameters: `start_date`, `end_date`, `period`

#### GET `/api/analytics/leads`
Get lead analytics

#### GET `/api/analytics/projects`
Get project analytics

#### GET `/api/analytics/revenue`
Get revenue analytics

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response
```json
{
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Unprocessable Entity
- 429: Too Many Requests
- 500: Internal Server Error

## Rate Limiting
- Default: 1000 requests per 15 minutes per IP
- Authentication endpoints: More restrictive limits

## File Upload Limits
- Maximum file size: 10MB
- Allowed types: Images, PDFs, documents
- Storage: Local filesystem (can be configured for cloud storage)

## Webhook Endpoints

### Stripe Webhook
`POST /api/payments/webhook/stripe`
- Handles Stripe payment notifications
- Webhook signature verification required

## Environment Variables
See `.env.example` for all required environment variables including:
- Database configuration
- JWT secrets
- Stripe keys
- Email settings
- File upload settings

## Security Features
- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Input validation with Joi
- SQL injection protection via Supabase
- Rate limiting
- CORS protection
- Security headers with Helmet
- File upload restrictions

## Database Schema
The API uses Supabase with the following main tables:
- `users` - User accounts
- `companies` - Company information
- `contacts` - Contact details
- `leads` - Lead management
- `deals` - Sales deals
- `projects` - Project tracking
- `invoices` - Invoice management
- `payments` - Payment records
- `files` - File uploads
- `activities` - Activity logging
- `email_templates` - Email templates

All tables include automatic timestamps and proper relationships with foreign key constraints.