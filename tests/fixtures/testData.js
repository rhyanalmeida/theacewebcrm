const faker = require('faker');
const bcrypt = require('bcryptjs');

// Generate consistent test data
faker.seed(12345);

const testUsers = {
  admin: {
    email: 'admin@acewebdesigners.com',
    password: 'AdminPass123!',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin',
    status: 'active',
    phone: '+1234567890'
  },
  manager: {
    email: 'manager@acewebdesigners.com',
    password: 'ManagerPass123!',
    first_name: 'Manager',
    last_name: 'User',
    role: 'manager',
    status: 'active',
    phone: '+1234567891'
  },
  user: {
    email: 'user@acewebdesigners.com',
    password: 'UserPass123!',
    first_name: 'Regular',
    last_name: 'User',
    role: 'user',
    status: 'active',
    phone: '+1234567892'
  },
  inactive: {
    email: 'inactive@acewebdesigners.com',
    password: 'InactivePass123!',
    first_name: 'Inactive',
    last_name: 'User',
    role: 'user',
    status: 'inactive',
    phone: '+1234567893'
  }
};

const testClients = {
  prospect: {
    email: 'prospect@example.com',
    first_name: 'John',
    last_name: 'Prospect',
    company: 'Prospect Company Inc.',
    phone: '+1555001001',
    industry: 'Technology',
    status: 'prospect',
    lead_source: 'website',
    engagement_level: 'warm',
    budget_min: 5000,
    budget_max: 15000,
    notes: 'Interested in website redesign',
    tags: JSON.stringify(['website', 'redesign']),
    business_description: 'A growing tech company looking for modern web presence',
    pain_points: JSON.stringify(['outdated website', 'poor mobile experience']),
    goals: JSON.stringify(['increase leads', 'improve brand image'])
  },
  qualified: {
    email: 'qualified@example.com',
    first_name: 'Sarah',
    last_name: 'Qualified',
    company: 'Qualified Corp',
    phone: '+1555002002',
    industry: 'Healthcare',
    status: 'qualified',
    lead_source: 'referral',
    engagement_level: 'hot',
    budget_min: 10000,
    budget_max: 25000,
    notes: 'Ready to move forward with project',
    tags: JSON.stringify(['healthcare', 'compliance']),
    business_description: 'Healthcare provider needing HIPAA compliant solutions',
    pain_points: JSON.stringify(['compliance issues', 'patient management']),
    goals: JSON.stringify(['HIPAA compliance', 'streamline processes'])
  },
  client: {
    email: 'client@example.com',
    first_name: 'Michael',
    last_name: 'Client',
    company: 'Active Client LLC',
    phone: '+1555003003',
    industry: 'Retail',
    status: 'client',
    lead_source: 'advertisement',
    engagement_level: 'hot',
    budget_min: 15000,
    budget_max: 30000,
    notes: 'Long-term client with multiple projects',
    tags: JSON.stringify(['retail', 'ecommerce', 'vip']),
    business_description: 'Established retail business expanding online',
    pain_points: JSON.stringify(['outdated ecommerce', 'inventory management']),
    goals: JSON.stringify(['online expansion', 'automation'])
  }
};

const testProjects = {
  website: {
    name: 'Company Website Redesign',
    project_code: 'WEB001',
    type: 'website',
    description: 'Complete website redesign with modern UI/UX',
    status: 'in_progress',
    estimated_cost: 12000,
    actual_cost: 8000,
    progress_percentage: 65,
    expected_completion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    requirements: JSON.stringify([
      'Responsive design',
      'SEO optimization',
      'Contact forms',
      'Blog functionality'
    ]),
    deliverables: JSON.stringify([
      'Design mockups',
      'Frontend development',
      'CMS setup',
      'Testing & launch'
    ])
  },
  ecommerce: {
    name: 'E-commerce Platform',
    project_code: 'ECOM001',
    type: 'ecommerce',
    description: 'Custom e-commerce platform with payment integration',
    status: 'planning',
    estimated_cost: 25000,
    actual_cost: 0,
    progress_percentage: 15,
    expected_completion: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    requirements: JSON.stringify([
      'Product catalog',
      'Shopping cart',
      'Payment gateway',
      'Order management',
      'Inventory tracking'
    ]),
    deliverables: JSON.stringify([
      'System architecture',
      'Database design',
      'Backend API',
      'Frontend store',
      'Admin panel'
    ])
  }
};

// Helper function to hash passwords for test users
const hashTestPasswords = async () => {
  const hashedUsers = {};
  for (const [key, user] of Object.entries(testUsers)) {
    hashedUsers[key] = {
      ...user,
      password_hash: await bcrypt.hash(user.password, 10)
    };
    delete hashedUsers[key].password; // Remove plain text password
  }
  return hashedUsers;
};

// Generate random test data
const generateRandomUser = (overrides = {}) => ({
  email: faker.internet.email().toLowerCase(),
  password: 'TestPass123!',
  first_name: faker.name.firstName(),
  last_name: faker.name.lastName(),
  phone: faker.phone.phoneNumber(),
  role: 'user',
  status: 'active',
  ...overrides
});

const generateRandomClient = (overrides = {}) => ({
  email: faker.internet.email().toLowerCase(),
  first_name: faker.name.firstName(),
  last_name: faker.name.lastName(),
  company: faker.company.companyName(),
  phone: faker.phone.phoneNumber(),
  industry: faker.random.arrayElement(['Technology', 'Healthcare', 'Retail', 'Finance', 'Manufacturing']),
  status: 'prospect',
  lead_source: faker.random.arrayElement(['website', 'referral', 'social', 'advertisement']),
  engagement_level: faker.random.arrayElement(['cold', 'warm', 'hot']),
  budget_min: faker.random.number({ min: 1000, max: 5000 }),
  budget_max: faker.random.number({ min: 5000, max: 50000 }),
  notes: faker.lorem.sentence(),
  tags: JSON.stringify([faker.lorem.word(), faker.lorem.word()]),
  business_description: faker.company.catchPhrase(),
  pain_points: JSON.stringify([faker.lorem.words(3), faker.lorem.words(3)]),
  goals: JSON.stringify([faker.lorem.words(3), faker.lorem.words(3)]),
  ...overrides
});

const generateRandomProject = (overrides = {}) => ({
  name: `${faker.company.bsBuzz()} ${faker.random.arrayElement(['Website', 'Platform', 'System'])}`,
  project_code: `${faker.random.alphaNumeric(3).toUpperCase()}${faker.random.number({ min: 100, max: 999 })}`,
  type: faker.random.arrayElement(['website', 'ecommerce', 'webapp', 'mobile']),
  description: faker.lorem.sentence(),
  status: faker.random.arrayElement(['planning', 'in_progress', 'review', 'completed', 'on_hold']),
  estimated_cost: faker.random.number({ min: 1000, max: 50000 }),
  actual_cost: faker.random.number({ min: 500, max: 30000 }),
  progress_percentage: faker.random.number({ min: 0, max: 100 }),
  expected_completion: faker.date.future(),
  requirements: JSON.stringify([
    faker.lorem.words(3),
    faker.lorem.words(3),
    faker.lorem.words(3)
  ]),
  deliverables: JSON.stringify([
    faker.lorem.words(2),
    faker.lorem.words(2),
    faker.lorem.words(2)
  ]),
  ...overrides
});

module.exports = {
  testUsers,
  testClients,
  testProjects,
  hashTestPasswords,
  generateRandomUser,
  generateRandomClient,
  generateRandomProject
};