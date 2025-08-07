# ACE CRM API Specification

## Overview
RESTful API for ACE CRM system with consistent resource naming, proper HTTP methods, and comprehensive error handling.

## Base URL
- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.acecrm.com/v1`

## Authentication
- **Type**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer <token>`
- **Token Expiry**: 24 hours (with refresh token support)

## Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": {}, // Resource data or array
  "meta": {   // Optional metadata for pagination, etc.
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasNext": true
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

## HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (for DELETE)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error

## Core API Endpoints

### Authentication
```
POST   /auth/login              # User login
POST   /auth/register           # User registration
POST   /auth/refresh            # Refresh access token
POST   /auth/logout             # User logout
POST   /auth/forgot-password    # Password reset request
POST   /auth/reset-password     # Password reset confirmation
GET    /auth/me                 # Current user profile
PUT    /auth/me                 # Update user profile
```

### Users Management
```
GET    /users                   # List users (admin)
POST   /users                   # Create user (admin)
GET    /users/:id               # Get user details
PUT    /users/:id               # Update user
DELETE /users/:id               # Delete user (soft delete)
GET    /users/:id/activities    # User's activities
PUT    /users/:id/password      # Change user password
PUT    /users/:id/status        # Update user status
```

### Roles & Permissions
```
GET    /roles                   # List roles
POST   /roles                   # Create role
GET    /roles/:id               # Get role details
PUT    /roles/:id               # Update role
DELETE /roles/:id               # Delete role
POST   /users/:id/roles         # Assign role to user
DELETE /users/:userId/roles/:roleId # Remove role from user
```

### Companies
```
GET    /companies               # List companies (with filtering/search)
POST   /companies               # Create company
GET    /companies/:id           # Get company details
PUT    /companies/:id           # Update company
DELETE /companies/:id           # Delete company (soft delete)
GET    /companies/:id/contacts  # Company contacts
GET    /companies/:id/deals     # Company deals
GET    /companies/:id/projects  # Company projects
GET    /companies/:id/activities # Company activities
GET    /companies/:id/invoices  # Company invoices
```

### Contacts
```
GET    /contacts                # List contacts
POST   /contacts                # Create contact
GET    /contacts/:id            # Get contact details
PUT    /contacts/:id            # Update contact
DELETE /contacts/:id            # Delete contact (soft delete)
GET    /contacts/:id/activities # Contact activities
GET    /contacts/:id/deals      # Contact deals
GET    /contacts/:id/projects   # Contact projects
POST   /contacts/import         # Bulk import contacts
GET    /contacts/export         # Export contacts
```

### Leads
```
GET    /leads                   # List leads
POST   /leads                   # Create lead
GET    /leads/:id               # Get lead details
PUT    /leads/:id               # Update lead
DELETE /leads/:id               # Delete lead
PUT    /leads/:id/status        # Update lead status
PUT    /leads/:id/owner         # Change lead owner
GET    /leads/:id/activities    # Lead activities
POST   /leads/:id/convert       # Convert lead to deal
GET    /leads/pipeline          # Lead pipeline view
```

### Deals
```
GET    /deals                   # List deals
POST   /deals                   # Create deal
GET    /deals/:id               # Get deal details
PUT    /deals/:id               # Update deal
DELETE /deals/:id               # Delete deal
PUT    /deals/:id/stage         # Update deal stage
PUT    /deals/:id/owner         # Change deal owner
GET    /deals/:id/activities    # Deal activities
POST   /deals/:id/close         # Close deal (won/lost)
GET    /deals/pipeline          # Deal pipeline view
GET    /deals/analytics         # Deal analytics
```

### Projects
```
GET    /projects                # List projects
POST   /projects                # Create project
GET    /projects/:id            # Get project details
PUT    /projects/:id            # Update project
DELETE /projects/:id            # Delete project
PUT    /projects/:id/status     # Update project status
GET    /projects/:id/tasks      # Project tasks
GET    /projects/:id/activities # Project activities
GET    /projects/:id/team       # Project team members
POST   /projects/:id/team       # Add team member
DELETE /projects/:projectId/team/:userId # Remove team member
```

### Tasks
```
GET    /tasks                   # List tasks (with filtering)
POST   /tasks                   # Create task
GET    /tasks/:id               # Get task details
PUT    /tasks/:id               # Update task
DELETE /tasks/:id               # Delete task
PUT    /tasks/:id/status        # Update task status
PUT    /tasks/:id/assign        # Assign task to user
GET    /tasks/my-tasks          # Current user's tasks
POST   /tasks/bulk-update       # Bulk update tasks
```

### Activities
```
GET    /activities              # List activities
POST   /activities              # Create activity
GET    /activities/:id          # Get activity details
PUT    /activities/:id          # Update activity
DELETE /activities/:id          # Delete activity
GET    /activities/timeline     # Activity timeline
POST   /activities/email        # Log email activity
POST   /activities/call         # Log call activity
POST   /activities/meeting      # Log meeting activity
POST   /activities/note         # Add note/comment
```

### Invoices
```
GET    /invoices                # List invoices
POST   /invoices                # Create invoice
GET    /invoices/:id            # Get invoice details
PUT    /invoices/:id            # Update invoice
DELETE /invoices/:id            # Delete invoice
PUT    /invoices/:id/status     # Update invoice status
POST   /invoices/:id/send       # Send invoice to client
GET    /invoices/:id/pdf        # Download invoice PDF
POST   /invoices/:id/payment    # Record payment
GET    /invoices/analytics      # Invoice analytics
```

### Reports & Analytics
```
GET    /analytics/dashboard     # Dashboard metrics
GET    /analytics/sales         # Sales analytics
GET    /analytics/projects      # Project analytics
GET    /analytics/revenue       # Revenue analytics
GET    /analytics/team          # Team performance
GET    /reports/leads           # Lead reports
GET    /reports/deals           # Deal reports
GET    /reports/projects        # Project reports
POST   /reports/custom          # Custom report generation
```

### File Management
```
POST   /files/upload            # Upload file
GET    /files/:id               # Download file
DELETE /files/:id               # Delete file
GET    /files                   # List files (with filtering)
POST   /files/avatar            # Upload user avatar
POST   /files/logo              # Upload company logo
```

### Settings
```
GET    /settings                # Get system settings
PUT    /settings                # Update settings
GET    /settings/custom-fields  # Get custom fields
POST   /settings/custom-fields  # Create custom field
PUT    /settings/custom-fields/:id # Update custom field
DELETE /settings/custom-fields/:id # Delete custom field
```

### Search & Filtering
```
GET    /search                  # Global search
GET    /search/contacts         # Search contacts
GET    /search/companies        # Search companies
GET    /search/deals            # Search deals
GET    /search/projects         # Search projects
```

### Webhooks
```
GET    /webhooks                # List webhooks
POST   /webhooks                # Create webhook
PUT    /webhooks/:id            # Update webhook
DELETE /webhooks/:id            # Delete webhook
POST   /webhooks/:id/test       # Test webhook
GET    /webhooks/:id/logs       # Webhook logs
```

## Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

### Filtering
- `filter[field]` - Filter by field value
- `filter[status]` - Filter by status
- `filter[owner_id]` - Filter by owner
- `filter[created_at]` - Filter by creation date (ISO 8601)

### Sorting
- `sort` - Field to sort by (prefix with `-` for descending)
- Example: `sort=-created_at` (newest first)

### Search
- `search` - Search term for full-text search
- `fields` - Comma-separated list of fields to include in response

### Examples
```
GET /contacts?page=2&limit=50&filter[status]=active&sort=-created_at
GET /deals?filter[stage]=proposal&filter[owner_id]=123&search=website
GET /companies?search=design&fields=id,name,website&sort=name
```

## Webhook Events

### Available Events
- `contact.created`
- `contact.updated`
- `contact.deleted`
- `company.created`
- `company.updated`
- `deal.created`
- `deal.updated`
- `deal.stage_changed`
- `deal.closed`
- `project.created`
- `project.updated`
- `project.status_changed`
- `invoice.created`
- `invoice.sent`
- `invoice.paid`

### Webhook Payload
```json
{
  "event": "deal.stage_changed",
  "timestamp": "2025-01-01T12:00:00Z",
  "data": {
    "id": "uuid",
    "previous_stage": "proposal",
    "current_stage": "negotiation",
    "deal": {
      // Full deal object
    }
  }
}
```

## Rate Limiting
- **Limit**: 1000 requests per hour per API key
- **Headers**: 
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## API Versioning
- **Current Version**: v1
- **Header**: `Accept: application/vnd.ace-crm.v1+json`
- **URL**: `/api/v1/` (default)
- **Deprecation**: 12-month notice for breaking changes

This API specification provides a comprehensive foundation for the ACE CRM system with RESTful principles, consistent patterns, and extensive functionality for managing web design agency workflows.