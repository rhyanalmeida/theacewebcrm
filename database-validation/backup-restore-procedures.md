# ACE CRM - Supabase Backup and Restore Procedures

## 📋 Overview

This document provides comprehensive backup and restore procedures for the ACE CRM Supabase database. It covers automated backups, manual backups, disaster recovery, and data migration strategies.

## 🔧 Prerequisites

- Supabase CLI installed (`npm install -g @supabase/cli`)
- PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`)
- Access to Supabase project credentials
- Appropriate permissions for database operations

## 📦 Automated Backups

### Supabase Built-in Backups

Supabase automatically creates backups based on your plan:

- **Free Plan**: Daily backups, 7-day retention
- **Pro Plan**: Daily backups, 7-day retention + point-in-time recovery (7 days)
- **Team Plan**: Daily backups, 14-day retention + point-in-time recovery (14 days)
- **Enterprise**: Custom retention policies

### Accessing Automated Backups

1. **Via Supabase Dashboard:**
   ```
   https://app.supabase.com/project/hxcrjwrinexiyeyyyhfa/database/backups
   ```

2. **Via CLI:**
   ```bash
   supabase db dump --project-ref hxcrjwrinexiyeyyyhfa --password
   ```

## 🛠️ Manual Backup Procedures

### Full Database Backup

```bash
#!/bin/bash
# full-backup.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
DB_PASSWORD="your-db-password"
BACKUP_DIR="/path/to/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Full database dump
pg_dump \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --verbose \
  --clean \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="$BACKUP_DIR/ace_crm_full_$TIMESTAMP.backup"

echo "Full backup completed: ace_crm_full_$TIMESTAMP.backup"
```

### Schema-Only Backup

```bash
#!/bin/bash
# schema-backup.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
DB_PASSWORD="your-db-password"
BACKUP_DIR="/path/to/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Schema-only dump
pg_dump \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --verbose \
  --schema-only \
  --clean \
  --no-owner \
  --no-privileges \
  --format=plain \
  --file="$BACKUP_DIR/ace_crm_schema_$TIMESTAMP.sql"

echo "Schema backup completed: ace_crm_schema_$TIMESTAMP.sql"
```

### Data-Only Backup

```bash
#!/bin/bash
# data-backup.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
DB_PASSWORD="your-db-password"
BACKUP_DIR="/path/to/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Data-only dump
pg_dump \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --verbose \
  --data-only \
  --column-inserts \
  --format=plain \
  --file="$BACKUP_DIR/ace_crm_data_$TIMESTAMP.sql"

echo "Data backup completed: ace_crm_data_$TIMESTAMP.sql"
```

### Table-Specific Backup

```bash
#!/bin/bash
# table-backup.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
TABLE_NAME="$1"  # Pass table name as argument
BACKUP_DIR="/path/to/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

if [ -z "$TABLE_NAME" ]; then
  echo "Usage: $0 <table_name>"
  exit 1
fi

# Table-specific dump
pg_dump \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --verbose \
  --table="public.$TABLE_NAME" \
  --data-only \
  --column-inserts \
  --format=plain \
  --file="$BACKUP_DIR/ace_crm_${TABLE_NAME}_$TIMESTAMP.sql"

echo "Table backup completed: ace_crm_${TABLE_NAME}_$TIMESTAMP.sql"
```

## 📥 Restore Procedures

### Full Database Restore

```bash
#!/bin/bash
# full-restore.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
BACKUP_FILE="$1"
DB_PASSWORD="your-db-password"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Restore from custom format backup
pg_restore \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --verbose \
  --clean \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  "$BACKUP_FILE"

echo "Full restore completed from: $BACKUP_FILE"
```

### Schema-Only Restore

```bash
#!/bin/bash
# schema-restore.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
SCHEMA_FILE="$1"

if [ -z "$SCHEMA_FILE" ]; then
  echo "Usage: $0 <schema_file.sql>"
  exit 1
fi

# Restore schema
psql \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --file="$SCHEMA_FILE"

echo "Schema restore completed from: $SCHEMA_FILE"
```

### Data-Only Restore

```bash
#!/bin/bash
# data-restore.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
DATA_FILE="$1"

if [ -z "$DATA_FILE" ]; then
  echo "Usage: $0 <data_file.sql>"
  exit 1
fi

# Restore data
psql \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --file="$DATA_FILE"

echo "Data restore completed from: $DATA_FILE"
```

## 🚨 Disaster Recovery

### Emergency Backup Creation

```bash
#!/bin/bash
# emergency-backup.sh

# This script creates an immediate backup for disaster recovery
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
EMERGENCY_DIR="/emergency/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$EMERGENCY_DIR"

echo "Creating emergency backup..."

# Create multiple backup formats
pg_dump \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --format=custom \
  --file="$EMERGENCY_DIR/EMERGENCY_ace_crm_$TIMESTAMP.backup" &

pg_dump \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --format=plain \
  --file="$EMERGENCY_DIR/EMERGENCY_ace_crm_$TIMESTAMP.sql" &

wait

echo "Emergency backup completed in: $EMERGENCY_DIR"
```

### Point-in-Time Recovery (PITR)

For Pro plans and above, you can restore to a specific point in time:

```bash
# Via Supabase CLI
supabase db restore --project-ref hxcrjwrinexiyeyyyhfa --recovery-time "2025-01-10T14:30:00Z"
```

### Recovery Validation

```bash
#!/bin/bash
# validate-recovery.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"

echo "Validating database recovery..."

# Check table existence
psql \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --command="SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# Check record counts
psql \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --command="
    SELECT 
      'users' as table_name, COUNT(*) as record_count FROM users
    UNION ALL
    SELECT 'companies', COUNT(*) FROM companies
    UNION ALL
    SELECT 'contacts', COUNT(*) FROM contacts
    UNION ALL
    SELECT 'leads', COUNT(*) FROM leads
    UNION ALL
    SELECT 'deals', COUNT(*) FROM deals
    UNION ALL
    SELECT 'projects', COUNT(*) FROM projects;
  "

echo "Recovery validation completed"
```

## 🔄 Data Migration

### Export Data for Migration

```bash
#!/bin/bash
# export-for-migration.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
EXPORT_DIR="/path/to/migration/export"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$EXPORT_DIR"

# Export each table separately for easier migration
TABLES=("users" "roles" "user_roles" "companies" "contacts" "leads" "deals" "projects" "tasks" "activities" "invoices" "invoice_items")

for table in "${TABLES[@]}"; do
  echo "Exporting table: $table"
  
  pg_dump \
    --host=db.$PROJECT_REF.supabase.co \
    --port=5432 \
    --username=postgres \
    --dbname=postgres \
    --no-password \
    --table="public.$table" \
    --data-only \
    --column-inserts \
    --file="$EXPORT_DIR/${table}_$TIMESTAMP.sql"
done

echo "Migration export completed in: $EXPORT_DIR"
```

### Import Data from Migration

```bash
#!/bin/bash
# import-from-migration.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
IMPORT_DIR="$1"

if [ -z "$IMPORT_DIR" ]; then
  echo "Usage: $0 <import_directory>"
  exit 1
fi

# Import tables in dependency order
TABLES_ORDER=("roles" "users" "user_roles" "companies" "contacts" "leads" "deals" "projects" "tasks" "activities" "invoices" "invoice_items")

for table in "${TABLES_ORDER[@]}"; do
  TABLE_FILE=$(find "$IMPORT_DIR" -name "${table}_*.sql" | head -1)
  
  if [ -f "$TABLE_FILE" ]; then
    echo "Importing table: $table from $TABLE_FILE"
    
    psql \
      --host=db.$PROJECT_REF.supabase.co \
      --port=5432 \
      --username=postgres \
      --dbname=postgres \
      --no-password \
      --file="$TABLE_FILE"
  else
    echo "Warning: No file found for table $table"
  fi
done

echo "Migration import completed"
```

## 📊 Backup Monitoring and Alerting

### Backup Verification Script

```bash
#!/bin/bash
# verify-backup.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Verify backup file integrity
if [[ "$BACKUP_FILE" == *.backup ]]; then
  # Custom format - use pg_restore to verify
  pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ Backup file is valid: $BACKUP_FILE"
  else
    echo "❌ Backup file is corrupted: $BACKUP_FILE"
    exit 1
  fi
elif [[ "$BACKUP_FILE" == *.sql ]]; then
  # Plain format - check if file is readable and contains expected content
  if grep -q "CREATE TABLE\|INSERT INTO" "$BACKUP_FILE"; then
    echo "✅ SQL backup file appears valid: $BACKUP_FILE"
  else
    echo "❌ SQL backup file appears invalid: $BACKUP_FILE"
    exit 1
  fi
fi
```

### Automated Backup Script with Monitoring

```bash
#!/bin/bash
# automated-backup-with-monitoring.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
BACKUP_DIR="/path/to/automated/backups"
RETENTION_DAYS=30
LOG_FILE="/var/log/ace-crm-backup.log"
EMAIL_ALERTS="admin@acecrm.com"

# Create timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Function to log messages
log_message() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send email alert
send_alert() {
  local subject="$1"
  local message="$2"
  echo "$message" | mail -s "$subject" "$EMAIL_ALERTS"
}

# Start backup
log_message "Starting automated backup"

# Create backup
BACKUP_FILE="$BACKUP_DIR/ace_crm_auto_$TIMESTAMP.backup"

pg_dump \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --verbose \
  --format=custom \
  --file="$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"

# Check if backup was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  log_message "Backup completed successfully: $BACKUP_FILE"
  
  # Verify backup
  if pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1; then
    log_message "Backup verification passed"
  else
    log_message "❌ Backup verification failed!"
    send_alert "ACE CRM Backup Verification Failed" "Backup file $BACKUP_FILE failed verification check"
  fi
  
  # Compress backup
  gzip "$BACKUP_FILE"
  log_message "Backup compressed: ${BACKUP_FILE}.gz"
  
else
  log_message "❌ Backup failed!"
  send_alert "ACE CRM Backup Failed" "Automated backup failed at $(date)"
  exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "ace_crm_auto_*.backup.gz" -mtime +$RETENTION_DAYS -delete
log_message "Old backups cleaned up (retention: $RETENTION_DAYS days)"

log_message "Automated backup completed successfully"
```

## 📅 Backup Schedule Recommendations

### Daily Backups (Recommended)

Add to crontab (`crontab -e`):

```cron
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/automated-backup-with-monitoring.sh

# Weekly full backup at 1 AM on Sundays
0 1 * * 0 /path/to/scripts/full-backup.sh

# Monthly schema backup at 3 AM on the 1st
0 3 1 * * /path/to/scripts/schema-backup.sh
```

### Critical System Backups

```cron
# Every 4 hours for critical systems
0 */4 * * * /path/to/scripts/emergency-backup.sh

# Before any major deployment
# (Run manually before deployments)
```

## 🔐 Security Considerations

### Backup Encryption

```bash
#!/bin/bash
# encrypted-backup.sh

# Configuration
PROJECT_REF="hxcrjwrinexiyeyyyhfa"
BACKUP_DIR="/path/to/encrypted/backups"
GPG_RECIPIENT="backup@acecrm.com"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup and encrypt
pg_dump \
  --host=db.$PROJECT_REF.supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --no-password \
  --format=custom | \
gpg --encrypt --recipient "$GPG_RECIPIENT" \
  --output "$BACKUP_DIR/ace_crm_encrypted_$TIMESTAMP.backup.gpg"

echo "Encrypted backup created: ace_crm_encrypted_$TIMESTAMP.backup.gpg"
```

### Backup Permissions

```bash
# Set secure permissions on backup files
chmod 600 /path/to/backups/*.backup
chmod 600 /path/to/backups/*.sql
chown postgres:postgres /path/to/backups/*
```

## 🧪 Testing Backup and Restore

### Test Restore Script

```bash
#!/bin/bash
# test-restore.sh

# Configuration
BACKUP_FILE="$1"
TEST_DB="ace_crm_test_$(date +%s)"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

echo "Testing restore with backup: $BACKUP_FILE"

# Create test database
createdb "$TEST_DB"

# Restore to test database
if [[ "$BACKUP_FILE" == *.backup ]]; then
  pg_restore --dbname="$TEST_DB" --verbose "$BACKUP_FILE"
else
  psql --dbname="$TEST_DB" --file="$BACKUP_FILE"
fi

# Verify restore
TABLE_COUNT=$(psql --dbname="$TEST_DB" --tuples-only --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo "Test restore completed. Tables found: $TABLE_COUNT"

# Cleanup
dropdb "$TEST_DB"
echo "Test database cleaned up"
```

## 📚 Best Practices

### 1. Regular Testing
- Test restore procedures monthly
- Verify backup integrity weekly
- Document and time recovery procedures

### 2. Multiple Backup Types
- Full backups: Weekly
- Incremental/differential: Daily
- Schema-only: Before major changes
- Critical table backups: Before bulk operations

### 3. Storage Strategy
- Local backups for immediate access
- Remote backups for disaster recovery
- Cloud storage for long-term retention
- Encrypt sensitive data backups

### 4. Monitoring
- Monitor backup job completion
- Alert on backup failures
- Track backup file sizes and integrity
- Log all backup and restore operations

### 5. Documentation
- Maintain recovery time objectives (RTO)
- Document recovery point objectives (RPO)
- Keep contact information for emergencies
- Update procedures after schema changes

## 🆘 Emergency Contacts and Procedures

### Emergency Response Team
- **Database Administrator**: dba@acecrm.com
- **System Administrator**: sysadmin@acecrm.com
- **Development Team Lead**: dev-lead@acecrm.com

### Emergency Procedures
1. **Data Loss Detected**:
   - Stop all write operations immediately
   - Contact emergency response team
   - Assess data loss scope
   - Begin recovery from most recent backup

2. **Corruption Detected**:
   - Isolate affected systems
   - Create emergency backup if possible
   - Restore from verified backup
   - Validate data integrity post-recovery

3. **Complete System Failure**:
   - Activate disaster recovery plan
   - Deploy backup Supabase instance
   - Restore from latest backup
   - Update DNS/application endpoints
   - Validate full system functionality

## 📝 Backup Log Template

```
=== ACE CRM Backup Log ===
Date: _______________
Time Started: _______________
Time Completed: _______________
Backup Type: [ ] Full  [ ] Schema  [ ] Data  [ ] Table-specific
Backup Size: _______________
Location: _______________
Verification Status: [ ] Passed  [ ] Failed
Notes: _______________
Performed By: _______________
```

---

**Remember**: Backups are only as good as your ability to restore from them. Regular testing is crucial!