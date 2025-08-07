#!/usr/bin/env node

/**
 * Migration Script: MongoDB/PostgreSQL to Supabase
 * 
 * This script migrates data from the existing MongoDB/PostgreSQL database
 * to the new Supabase database structure.
 * 
 * Usage:
 * node scripts/migrate-to-supabase.js --source mongodb --dry-run
 * node scripts/migrate-to-supabase.js --source postgresql --execute
 */

const { createClient } = require('@supabase/supabase-js');
const mongoose = require('mongoose');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ace_crm',
  },
  postgresql: {
    connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/ace_crm',
  }
};

// Command line arguments
const args = process.argv.slice(2);
const sourceDb = args.find(arg => arg.startsWith('--source='))?.split('=')[1] || 'mongodb';
const isDryRun = args.includes('--dry-run');
const isExecute = args.includes('--execute');

if (!isDryRun && !isExecute) {
  console.error('Please specify either --dry-run or --execute');
  process.exit(1);
}

class DatabaseMigrator {
  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceKey);
    this.stats = {
      users: { total: 0, migrated: 0, errors: 0 },
      companies: { total: 0, migrated: 0, errors: 0 },
      contacts: { total: 0, migrated: 0, errors: 0 },
      leads: { total: 0, migrated: 0, errors: 0 },
      deals: { total: 0, migrated: 0, errors: 0 },
      projects: { total: 0, migrated: 0, errors: 0 },
      activities: { total: 0, migrated: 0, errors: 0 }
    };
  }

  async connectToSource() {
    if (sourceDb === 'mongodb') {
      await mongoose.connect(config.mongodb.uri);
      console.log('Connected to MongoDB');
    } else if (sourceDb === 'postgresql') {
      this.pgPool = new Pool({ connectionString: config.postgresql.connectionString });
      console.log('Connected to PostgreSQL');
    }
  }

  async disconnectFromSource() {
    if (sourceDb === 'mongodb') {
      await mongoose.disconnect();
    } else if (sourceDb === 'postgresql' && this.pgPool) {
      await this.pgPool.end();
    }
  }

  async testSupabaseConnection() {
    try {
      const { data, error } = await this.supabase.from('users').select('count').single();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      console.log('✅ Supabase connection successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
  }

  // MongoDB Migration Methods
  async migrateFromMongoDB() {
    console.log('🚀 Starting MongoDB to Supabase migration...');

    // Define MongoDB models (simplified)
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const CompanySchema = new mongoose.Schema({}, { strict: false });
    const ContactSchema = new mongoose.Schema({}, { strict: false });
    const LeadSchema = new mongoose.Schema({}, { strict: false });
    const DealSchema = new mongoose.Schema({}, { strict: false });
    const ProjectSchema = new mongoose.Schema({}, { strict: false });
    const ActivitySchema = new mongoose.Schema({}, { strict: false });

    const User = mongoose.model('User', UserSchema);
    const Company = mongoose.model('Company', CompanySchema);
    const Contact = mongoose.model('Contact', ContactSchema);
    const Lead = mongoose.model('Lead', LeadSchema);
    const Deal = mongoose.model('Deal', DealSchema);
    const Project = mongoose.model('Project', ProjectSchema);
    const Activity = mongoose.model('Activity', ActivitySchema);

    // Migrate in dependency order
    await this.migrateUsers(User);
    await this.migrateCompanies(Company);
    await this.migrateContacts(Contact);
    await this.migrateLeads(Lead);
    await this.migrateDeals(Deal);
    await this.migrateProjects(Project);
    await this.migrateActivities(Activity);
  }

  // PostgreSQL Migration Methods
  async migrateFromPostgreSQL() {
    console.log('🚀 Starting PostgreSQL to Supabase migration...');

    // Migrate in dependency order
    await this.migrateUsersFromPG();
    await this.migrateCompaniesFromPG();
    await this.migrateContactsFromPG();
    await this.migrateLeadsFromPG();
    await this.migrateDealsFromPG();
    await this.migrateProjectsFromPG();
    await this.migrateActivitiesFromPG();
  }

  // Generic migration methods
  async migrateUsers(Model) {
    console.log('📤 Migrating users...');
    
    const users = sourceDb === 'mongodb' 
      ? await Model.find({}).lean() 
      : await this.pgPool.query('SELECT * FROM users');

    const userData = sourceDb === 'mongodb' ? users : users.rows;
    this.stats.users.total = userData.length;

    for (const user of userData) {
      try {
        const mappedUser = this.mapUserData(user);
        
        if (!isDryRun) {
          const { error } = await this.supabase
            .from('users')
            .insert([mappedUser]);

          if (error) {
            console.error(`Failed to migrate user ${user._id || user.id}:`, error.message);
            this.stats.users.errors++;
            continue;
          }
        }

        this.stats.users.migrated++;
        
        if (this.stats.users.migrated % 100 === 0) {
          console.log(`  Migrated ${this.stats.users.migrated}/${this.stats.users.total} users`);
        }
      } catch (error) {
        console.error(`Error processing user ${user._id || user.id}:`, error.message);
        this.stats.users.errors++;
      }
    }

    console.log(`✅ Users migration complete: ${this.stats.users.migrated}/${this.stats.users.total} (${this.stats.users.errors} errors)`);
  }

  async migrateContacts(Model) {
    console.log('📤 Migrating contacts...');
    
    const contacts = sourceDb === 'mongodb' 
      ? await Model.find({}).lean() 
      : await this.pgPool.query('SELECT * FROM contacts');

    const contactData = sourceDb === 'mongodb' ? contacts : contacts.rows;
    this.stats.contacts.total = contactData.length;

    for (const contact of contactData) {
      try {
        const mappedContact = this.mapContactData(contact);
        
        if (!isDryRun) {
          const { error } = await this.supabase
            .from('contacts')
            .insert([mappedContact]);

          if (error) {
            console.error(`Failed to migrate contact ${contact._id || contact.id}:`, error.message);
            this.stats.contacts.errors++;
            continue;
          }
        }

        this.stats.contacts.migrated++;
        
        if (this.stats.contacts.migrated % 100 === 0) {
          console.log(`  Migrated ${this.stats.contacts.migrated}/${this.stats.contacts.total} contacts`);
        }
      } catch (error) {
        console.error(`Error processing contact ${contact._id || contact.id}:`, error.message);
        this.stats.contacts.errors++;
      }
    }

    console.log(`✅ Contacts migration complete: ${this.stats.contacts.migrated}/${this.stats.contacts.total} (${this.stats.contacts.errors} errors)`);
  }

  // Data mapping methods
  mapUserData(user) {
    return {
      id: user._id?.toString() || user.id,
      email: user.email,
      first_name: user.firstName || user.first_name,
      last_name: user.lastName || user.last_name,
      phone: user.phoneNumber || user.phone,
      avatar_url: user.avatar_url,
      timezone: user.timezone || 'UTC',
      language: user.language || 'en',
      status: user.isActive === false ? 'inactive' : 'active',
      email_verified: user.emailVerified || user.email_verified || false,
      last_login_at: user.lastLogin || user.last_login_at,
      created_at: user.createdAt || user.created_at || new Date().toISOString(),
      updated_at: user.updatedAt || user.updated_at || new Date().toISOString()
    };
  }

  mapContactData(contact) {
    return {
      id: contact._id?.toString() || contact.id,
      company_id: contact.company?.toString() || contact.company_id,
      email: contact.email,
      first_name: contact.firstName || contact.first_name,
      last_name: contact.lastName || contact.last_name,
      title: contact.position || contact.title,
      department: contact.department,
      phone: contact.phoneNumber || contact.phone,
      mobile_phone: contact.mobile_phone,
      avatar_url: contact.avatar_url,
      linkedin_url: contact.linkedin_url,
      address: contact.address ? (typeof contact.address === 'object' ? contact.address : JSON.parse(contact.address)) : null,
      birthday: contact.birthday,
      notes: contact.notes,
      status: contact.status || 'active',
      lead_source: contact.leadSource || contact.lead_source,
      owner_id: contact.owner?.toString() || contact.owner_id,
      created_by: contact.createdBy?.toString() || contact.created_by,
      created_at: contact.createdAt || contact.created_at || new Date().toISOString(),
      updated_at: contact.updatedAt || contact.updated_at || new Date().toISOString()
    };
  }

  mapCompanyData(company) {
    return {
      id: company._id?.toString() || company.id,
      name: company.name,
      legal_name: company.legal_name,
      website: company.website,
      industry: company.industry,
      company_size: company.company_size,
      annual_revenue: company.annual_revenue,
      description: company.description,
      logo_url: company.logo_url,
      address: company.address ? (typeof company.address === 'object' ? company.address : JSON.parse(company.address)) : null,
      social_media: company.social_media ? (typeof company.social_media === 'object' ? company.social_media : JSON.parse(company.social_media)) : null,
      status: company.status || 'active',
      owner_id: company.owner?.toString() || company.owner_id,
      created_by: company.createdBy?.toString() || company.created_by,
      created_at: company.createdAt || company.created_at || new Date().toISOString(),
      updated_at: company.updatedAt || company.updated_at || new Date().toISOString()
    };
  }

  // Add similar mapping methods for leads, deals, projects, activities...

  async generateMigrationReport() {
    const report = {
      migration_date: new Date().toISOString(),
      source_database: sourceDb,
      mode: isDryRun ? 'dry-run' : 'execute',
      statistics: this.stats,
      total_records: Object.values(this.stats).reduce((sum, stat) => sum + stat.total, 0),
      total_migrated: Object.values(this.stats).reduce((sum, stat) => sum + stat.migrated, 0),
      total_errors: Object.values(this.stats).reduce((sum, stat) => sum + stat.errors, 0)
    };

    // Save report to file
    const reportPath = path.join(__dirname, '..', 'migration-reports', `migration-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Migration Summary:');
    console.log(`Source: ${sourceDb}`);
    console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
    console.log(`Total Records: ${report.total_records}`);
    console.log(`Migrated: ${report.total_migrated}`);
    console.log(`Errors: ${report.total_errors}`);
    console.log(`Success Rate: ${((report.total_migrated / report.total_records) * 100).toFixed(2)}%`);
    console.log(`Report saved: ${reportPath}`);

    // Detailed breakdown
    console.log('\n📋 Detailed Breakdown:');
    Object.entries(this.stats).forEach(([entity, stats]) => {
      console.log(`  ${entity}: ${stats.migrated}/${stats.total} (${stats.errors} errors)`);
    });

    return report;
  }

  // Placeholder methods for other entities
  async migrateCompanies(Model) { /* Implementation similar to migrateUsers */ }
  async migrateLeads(Model) { /* Implementation similar to migrateUsers */ }
  async migrateDeals(Model) { /* Implementation similar to migrateUsers */ }
  async migrateProjects(Model) { /* Implementation similar to migrateUsers */ }
  async migrateActivities(Model) { /* Implementation similar to migrateUsers */ }

  // PostgreSQL specific methods
  async migrateUsersFromPG() { /* Implementation for PostgreSQL */ }
  async migrateCompaniesFromPG() { /* Implementation for PostgreSQL */ }
  async migrateContactsFromPG() { /* Implementation for PostgreSQL */ }
  async migrateLeadsFromPG() { /* Implementation for PostgreSQL */ }
  async migrateDealsFromPG() { /* Implementation for PostgreSQL */ }
  async migrateProjectsFromPG() { /* Implementation for PostgreSQL */ }
  async migrateActivitiesFromPG() { /* Implementation for PostgreSQL */ }
}

// Main execution
async function main() {
  console.log(`🔄 ACE CRM Database Migration Tool`);
  console.log(`Source: ${sourceDb.toUpperCase()}`);
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('----------------------------------------');

  const migrator = new DatabaseMigrator();

  try {
    // Test connections
    const supabaseConnected = await migrator.testSupabaseConnection();
    if (!supabaseConnected) {
      console.error('❌ Cannot proceed without Supabase connection');
      process.exit(1);
    }

    await migrator.connectToSource();

    // Run migration
    if (sourceDb === 'mongodb') {
      await migrator.migrateFromMongoDB();
    } else if (sourceDb === 'postgresql') {
      await migrator.migrateFromPostgreSQL();
    } else {
      throw new Error(`Unsupported source database: ${sourceDb}`);
    }

    // Generate report
    await migrator.generateMigrationReport();

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await migrator.disconnectFromSource();
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DatabaseMigrator };