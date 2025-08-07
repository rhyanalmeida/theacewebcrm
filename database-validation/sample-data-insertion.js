#!/usr/bin/env node

/**
 * Sample Data Insertion Script for ACE CRM
 * Creates test data to validate database functionality
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('📝 ACE CRM Sample Data Insertion');
console.log('=================================\n');

// Sample data templates
const sampleUsers = [
  {
    email: 'admin@acecrm.com',
    first_name: 'Admin',
    last_name: 'User',
    phone: '+1-555-0001',
    timezone: 'America/New_York',
    language: 'en',
    status: 'active',
    email_verified: true
  },
  {
    email: 'manager@acecrm.com',
    first_name: 'Manager',
    last_name: 'Smith',
    phone: '+1-555-0002',
    timezone: 'America/Los_Angeles',
    language: 'en',
    status: 'active',
    email_verified: true
  },
  {
    email: 'sales@acecrm.com',
    first_name: 'Sales',
    last_name: 'Representative',
    phone: '+1-555-0003',
    timezone: 'America/Chicago',
    language: 'en',
    status: 'active',
    email_verified: true
  }
];

const sampleRoles = [
  {
    name: 'super_admin',
    description: 'Full system access and administration',
    permissions: {
      users: ['create', 'read', 'update', 'delete'],
      companies: ['create', 'read', 'update', 'delete'],
      contacts: ['create', 'read', 'update', 'delete'],
      leads: ['create', 'read', 'update', 'delete'],
      deals: ['create', 'read', 'update', 'delete'],
      projects: ['create', 'read', 'update', 'delete'],
      invoices: ['create', 'read', 'update', 'delete'],
      settings: ['create', 'read', 'update', 'delete']
    }
  },
  {
    name: 'admin',
    description: 'Administrative access with some restrictions',
    permissions: {
      users: ['read', 'update'],
      companies: ['create', 'read', 'update', 'delete'],
      contacts: ['create', 'read', 'update', 'delete'],
      leads: ['create', 'read', 'update', 'delete'],
      deals: ['create', 'read', 'update', 'delete'],
      projects: ['create', 'read', 'update', 'delete'],
      invoices: ['create', 'read', 'update', 'delete']
    }
  },
  {
    name: 'manager',
    description: 'Team management and oversight',
    permissions: {
      companies: ['create', 'read', 'update'],
      contacts: ['create', 'read', 'update'],
      leads: ['create', 'read', 'update'],
      deals: ['create', 'read', 'update'],
      projects: ['create', 'read', 'update'],
      invoices: ['read']
    }
  },
  {
    name: 'user',
    description: 'Standard user access',
    permissions: {
      companies: ['read'],
      contacts: ['create', 'read', 'update'],
      leads: ['create', 'read', 'update'],
      deals: ['read', 'update'],
      projects: ['read'],
      invoices: ['read']
    }
  }
];

const sampleCompanies = [
  {
    name: 'Acme Corporation',
    legal_name: 'Acme Corporation LLC',
    website: 'https://acme.com',
    industry: 'Technology',
    company_size: '500-1000',
    annual_revenue: 50000000,
    description: 'Leading technology company specializing in innovative solutions',
    address: {
      street: '123 Business Ave',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postal_code: '10001'
    },
    social_media: {
      linkedin: 'https://linkedin.com/company/acme-corp',
      twitter: 'https://twitter.com/acmecorp'
    },
    status: 'active'
  },
  {
    name: 'GlobalTech Solutions',
    legal_name: 'GlobalTech Solutions Inc.',
    website: 'https://globaltech.com',
    industry: 'Software Development',
    company_size: '100-500',
    annual_revenue: 15000000,
    description: 'Custom software development and IT consulting',
    address: {
      street: '456 Tech Blvd',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      postal_code: '94105'
    },
    status: 'active'
  },
  {
    name: 'StartupInc',
    legal_name: 'StartupInc LLC',
    website: 'https://startupinc.com',
    industry: 'E-commerce',
    company_size: '10-50',
    annual_revenue: 2000000,
    description: 'Innovative e-commerce platform for small businesses',
    address: {
      street: '789 Innovation Way',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      postal_code: '78701'
    },
    status: 'prospect'
  }
];

const sampleContacts = [
  {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@acme.com',
    title: 'CEO',
    department: 'Executive',
    phone: '+1-555-1001',
    mobile_phone: '+1-555-2001',
    linkedin_url: 'https://linkedin.com/in/johnsmith',
    birthday: '1975-03-15',
    notes: 'Decision maker for technology purchases. Prefers email communication.',
    status: 'active',
    lead_source: 'Website'
  },
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@globaltech.com',
    title: 'CTO',
    department: 'Technology',
    phone: '+1-555-1002',
    mobile_phone: '+1-555-2002',
    linkedin_url: 'https://linkedin.com/in/sarahjohnson',
    birthday: '1980-07-22',
    notes: 'Technical expert, interested in scalable solutions.',
    status: 'active',
    lead_source: 'Referral'
  },
  {
    first_name: 'Mike',
    last_name: 'Brown',
    email: 'mike.brown@startupinc.com',
    title: 'Founder',
    department: 'Executive',
    phone: '+1-555-1003',
    mobile_phone: '+1-555-2003',
    notes: 'Young entrepreneur looking for cost-effective solutions.',
    status: 'active',
    lead_source: 'Social Media'
  }
];

const sampleLeads = [
  {
    title: 'Website Redesign Project',
    description: 'Complete website redesign with modern responsive design and improved user experience',
    status: 'qualified',
    priority: 'high',
    lead_source: 'Website',
    estimated_value: 25000,
    estimated_close_date: '2025-02-15',
    probability: 75,
    next_action: 'Send detailed proposal',
    next_action_date: '2025-01-15T10:00:00Z'
  },
  {
    title: 'E-commerce Platform Development',
    description: 'Custom e-commerce solution with inventory management and payment processing',
    status: 'proposal',
    priority: 'high',
    lead_source: 'Referral',
    estimated_value: 45000,
    estimated_close_date: '2025-03-01',
    probability: 60,
    next_action: 'Follow up on proposal',
    next_action_date: '2025-01-20T14:00:00Z'
  },
  {
    title: 'Mobile App Development',
    description: 'iOS and Android app for customer engagement and loyalty program',
    status: 'new',
    priority: 'medium',
    lead_source: 'Cold Call',
    estimated_value: 35000,
    estimated_close_date: '2025-04-01',
    probability: 25,
    next_action: 'Schedule discovery call',
    next_action_date: '2025-01-12T09:00:00Z'
  }
];

const sampleDeals = [
  {
    title: 'Corporate Website Redesign',
    description: 'Full redesign of corporate website with CMS integration',
    deal_type: 'website_design',
    stage: 'negotiation',
    value: 22000,
    currency: 'USD',
    close_date: '2025-01-25',
    probability: 85,
    next_action: 'Finalize contract terms',
    next_action_date: '2025-01-10T15:00:00Z'
  },
  {
    title: 'E-commerce Platform',
    description: 'Custom e-commerce platform with payment gateway integration',
    deal_type: 'web_development',
    stage: 'proposal',
    value: 42000,
    currency: 'USD',
    close_date: '2025-02-28',
    probability: 70,
    next_action: 'Present technical specifications',
    next_action_date: '2025-01-18T11:00:00Z'
  }
];

const sampleProjects = [
  {
    name: 'Acme Website Redesign',
    description: 'Complete redesign of the Acme Corporation website with modern UI/UX',
    project_type: 'website_design',
    status: 'active',
    priority: 'high',
    start_date: '2025-01-01',
    due_date: '2025-03-01',
    budget: 22000,
    hours_estimated: 200,
    hours_actual: 45,
    team_members: [],
    tags: ['website', 'design', 'urgent'],
    custom_fields: {
      client_portal_access: true,
      requires_seo: true,
      mobile_first: true
    }
  }
];

const sampleActivities = [
  {
    subject: 'Initial consultation call',
    body: 'Discussed project requirements and timeline with John Smith. He is interested in a complete redesign.',
    activity_date: '2025-01-05T14:00:00Z',
    duration_minutes: 60,
    related_to_type: 'contact',
    participants: [
      {
        type: 'contact',
        name: 'John Smith',
        email: 'john.smith@acme.com'
      }
    ]
  },
  {
    subject: 'Proposal sent',
    body: 'Sent detailed proposal for website redesign project including timeline and pricing.',
    activity_date: '2025-01-06T10:00:00Z',
    related_to_type: 'lead',
    email_from: 'sales@acecrm.com',
    email_to: ['john.smith@acme.com'],
    attachments: [
      {
        name: 'Website_Redesign_Proposal.pdf',
        size: 1024000,
        type: 'application/pdf'
      }
    ]
  }
];

async function insertSampleData(supabase, tableName, data, description) {
  console.log(`\n📋 Inserting ${description}...`);
  
  try {
    const { data: result, error } = await supabase
      .from(tableName)
      .insert(data)
      .select();
    
    if (error) {
      console.log(`   ❌ Failed to insert ${description}: ${error.message}`);
      return { success: false, error: error.message, data: [] };
    }
    
    console.log(`   ✅ Successfully inserted ${result.length} ${description.toLowerCase()}`);
    return { success: true, data: result };
    
  } catch (error) {
    console.log(`   ❌ Exception inserting ${description}: ${error.message}`);
    return { success: false, error: error.message, data: [] };
  }
}

async function createAuthUsers(supabase) {
  console.log('\n👤 Creating Auth Users...');
  
  const authUsers = [];
  
  for (const user of sampleUsers) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'TempPassword123!',
        email_confirm: true,
        user_metadata: {
          first_name: user.first_name,
          last_name: user.last_name
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`   ⚠️  User ${user.email} already exists`);
        } else {
          console.log(`   ❌ Failed to create user ${user.email}: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Created auth user: ${user.email}`);
        authUsers.push({
          ...user,
          id: data.user.id
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Exception creating user ${user.email}: ${error.message}`);
    }
  }
  
  return authUsers;
}

async function linkDataWithForeignKeys(supabase, insertedData) {
  console.log('\n🔗 Linking data with foreign keys...');
  
  const { users, companies, contacts, leads, deals, projects } = insertedData;
  
  // Update companies with owner_id
  if (users.length > 0 && companies.length > 0) {
    for (let i = 0; i < companies.length; i++) {
      const ownerId = users[i % users.length].id;
      const companyId = companies[i].id;
      
      const { error } = await supabase
        .from('companies')
        .update({ 
          owner_id: ownerId,
          created_by: ownerId
        })
        .eq('id', companyId);
        
      if (error) {
        console.log(`   ⚠️  Could not update company owner: ${error.message}`);
      }
    }
    console.log(`   ✅ Updated ${companies.length} companies with owners`);
  }
  
  // Update contacts with company_id and owner_id
  if (companies.length > 0 && contacts.length > 0 && users.length > 0) {
    for (let i = 0; i < contacts.length; i++) {
      const companyId = companies[i % companies.length].id;
      const ownerId = users[i % users.length].id;
      const contactId = contacts[i].id;
      
      const { error } = await supabase
        .from('contacts')
        .update({ 
          company_id: companyId,
          owner_id: ownerId,
          created_by: ownerId
        })
        .eq('id', contactId);
        
      if (error) {
        console.log(`   ⚠️  Could not update contact ${i}: ${error.message}`);
      }
    }
    console.log(`   ✅ Updated ${contacts.length} contacts with companies and owners`);
  }
  
  // Update leads with contact_id, company_id, and owner_id
  if (contacts.length > 0 && leads.length > 0) {
    for (let i = 0; i < leads.length; i++) {
      const contactId = contacts[i % contacts.length].id;
      const companyId = companies[i % companies.length].id;
      const ownerId = users[i % users.length].id;
      const leadId = leads[i].id;
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          contact_id: contactId,
          company_id: companyId,
          owner_id: ownerId,
          created_by: ownerId
        })
        .eq('id', leadId);
        
      if (error) {
        console.log(`   ⚠️  Could not update lead ${i}: ${error.message}`);
      }
    }
    console.log(`   ✅ Updated ${leads.length} leads with relationships`);
  }
  
  // Update deals with lead_id, contact_id, company_id, and owner_id
  if (leads.length > 0 && deals.length > 0) {
    for (let i = 0; i < deals.length; i++) {
      const leadId = leads[i % leads.length].id;
      const contactId = contacts[i % contacts.length].id;
      const companyId = companies[i % companies.length].id;
      const ownerId = users[i % users.length].id;
      const dealId = deals[i].id;
      
      const { error } = await supabase
        .from('deals')
        .update({ 
          lead_id: leadId,
          contact_id: contactId,
          company_id: companyId,
          owner_id: ownerId,
          created_by: ownerId
        })
        .eq('id', dealId);
        
      if (error) {
        console.log(`   ⚠️  Could not update deal ${i}: ${error.message}`);
      }
    }
    console.log(`   ✅ Updated ${deals.length} deals with relationships`);
  }
  
  // Update projects with deal_id, company_id, and project_manager_id
  if (deals.length > 0 && projects.length > 0) {
    for (let i = 0; i < projects.length; i++) {
      const dealId = deals[i % deals.length].id;
      const companyId = companies[i % companies.length].id;
      const contactId = contacts[i % contacts.length].id;
      const managerId = users[i % users.length].id;
      const projectId = projects[i].id;
      
      // Update team_members array
      const teamMembers = users.map(u => u.id);
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          deal_id: dealId,
          company_id: companyId,
          contact_id: contactId,
          project_manager_id: managerId,
          team_members: teamMembers,
          created_by: managerId
        })
        .eq('id', projectId);
        
      if (error) {
        console.log(`   ⚠️  Could not update project ${i}: ${error.message}`);
      }
    }
    console.log(`   ✅ Updated ${projects.length} projects with relationships`);
  }
}

async function insertSampleActivities(supabase, insertedData) {
  console.log('\n📝 Inserting sample activities...');
  
  const { contacts, leads } = insertedData;
  
  if (contacts.length === 0 || leads.length === 0) {
    console.log('   ⚠️  Skipping activities - missing contacts or leads');
    return { success: false, data: [] };
  }
  
  // Update activities with actual IDs
  const activitiesWithIds = sampleActivities.map((activity, index) => ({
    ...activity,
    related_to_id: activity.related_to_type === 'contact' 
      ? contacts[index % contacts.length].id 
      : leads[index % leads.length].id,
    created_by: insertedData.users[0]?.id || null
  }));
  
  return await insertSampleData(supabase, 'activities', activitiesWithIds, 'sample activities');
}

async function runSampleDataInsertion() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('Starting sample data insertion...\n');
  
  // Track inserted data for foreign key relationships
  const insertedData = {};
  
  try {
    // 1. Create auth users first
    const authUsers = await createAuthUsers(supabase);
    
    // 2. Insert roles
    const rolesResult = await insertSampleData(supabase, 'roles', sampleRoles, 'sample roles');
    insertedData.roles = rolesResult.data;
    
    // 3. Insert user profiles (linked to auth users)
    const userProfiles = authUsers.map(user => ({
      id: user.id, // Use auth user ID
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      timezone: user.timezone,
      language: user.language,
      status: user.status,
      email_verified: user.email_verified
    }));
    
    const usersResult = await insertSampleData(supabase, 'users', userProfiles, 'user profiles');
    insertedData.users = usersResult.data;
    
    // 4. Insert companies
    const companiesResult = await insertSampleData(supabase, 'companies', sampleCompanies, 'sample companies');
    insertedData.companies = companiesResult.data;
    
    // 5. Insert contacts
    const contactsResult = await insertSampleData(supabase, 'contacts', sampleContacts, 'sample contacts');
    insertedData.contacts = contactsResult.data;
    
    // 6. Insert leads
    const leadsResult = await insertSampleData(supabase, 'leads', sampleLeads, 'sample leads');
    insertedData.leads = leadsResult.data;
    
    // 7. Insert deals
    const dealsResult = await insertSampleData(supabase, 'deals', sampleDeals, 'sample deals');
    insertedData.deals = dealsResult.data;
    
    // 8. Insert projects
    const projectsResult = await insertSampleData(supabase, 'projects', sampleProjects, 'sample projects');
    insertedData.projects = projectsResult.data;
    
    // 9. Link all data with foreign keys
    await linkDataWithForeignKeys(supabase, insertedData);
    
    // 10. Insert activities (after relationships are established)
    const activitiesResult = await insertSampleActivities(supabase, insertedData);
    insertedData.activities = activitiesResult.data;
    
    // Summary
    console.log('\n=================================');
    console.log('📊 Sample Data Insertion Summary');
    console.log('=================================');
    
    const summary = [
      { name: 'Users', count: insertedData.users?.length || 0 },
      { name: 'Roles', count: insertedData.roles?.length || 0 },
      { name: 'Companies', count: insertedData.companies?.length || 0 },
      { name: 'Contacts', count: insertedData.contacts?.length || 0 },
      { name: 'Leads', count: insertedData.leads?.length || 0 },
      { name: 'Deals', count: insertedData.deals?.length || 0 },
      { name: 'Projects', count: insertedData.projects?.length || 0 },
      { name: 'Activities', count: insertedData.activities?.length || 0 }
    ];
    
    summary.forEach(item => {
      console.log(`${item.name}: ${item.count} records`);
    });
    
    const totalRecords = summary.reduce((sum, item) => sum + item.count, 0);
    console.log(`\nTotal: ${totalRecords} records inserted successfully!`);
    
    console.log('\n🔑 Test Credentials:');
    authUsers.forEach(user => {
      console.log(`   Email: ${user.email} | Password: TempPassword123!`);
    });
    
    console.log('\n🎉 Sample data insertion completed successfully!');
    
  } catch (error) {
    console.error('❌ Sample data insertion failed:', error);
    process.exit(1);
  }
}

runSampleDataInsertion();