# Supabase Database Setup for AdBoard

This guide covers setting up Supabase as the database backend for AdBoard.

## Overview

Supabase provides a managed PostgreSQL database with additional features like:
- Automatic backups
- Connection pooling
- Real-time subscriptions (optional)
- Row Level Security (RLS)
- Built-in API generation
- Dashboard for database management

## Setup Steps

### 1. Create Supabase Project

1. **Sign up/Login to Supabase**:
   - Go to [supabase.com](https://supabase.com)
   - Create an account or log in
   - Click "New Project"

2. **Configure Project**:
   - Choose your organization
   - Enter project name: `adboard-production` (or your preferred name)
   - Enter database password (save this securely!)
   - Select region closest to your application server
   - Click "Create new project"

3. **Wait for Setup**:
   - Project creation takes 1-2 minutes
   - You'll be redirected to the project dashboard

### 2. Get Connection Details

1. **Database Settings**:
   - Go to Settings → Database
   - Copy the connection string under "Connection string"
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres`

2. **Connection Pooling** (Recommended):
   - Use the pooled connection string for production
   - Format: `postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

3. **API Details** (for future use):
   - Project URL: `https://[YOUR-PROJECT-REF].supabase.co`
   - Anon public key: `eyJ...` (found in Settings → API)
   - Service role key: `eyJ...` (found in Settings → API)

### 3. Configure Environment Variables

Update your environment variables:

```env
# Required for Prisma
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres"

# Optional - for future Supabase features
SUPABASE_URL="https://cmjaxqfargntgmmtfczg.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### 4. Enable Required Extensions

Run these commands in the Supabase SQL Editor (Database → SQL Editor):

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Text search capabilities
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Advanced indexing
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Verify extensions are enabled
SELECT * FROM pg_extension;
```

### 5. Run Database Migration

After deploying your application:

```bash
# SSH into your application container
docker exec -it <container_name> npx prisma migrate deploy

# Or run locally if you have the environment variables set
npx prisma migrate deploy
```

### 6. Verify Setup

Test the database connection:

```bash
# Test connection
psql "postgresql://postgres:[PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres" -c "SELECT version();"

# Check tables were created
psql "postgresql://postgres:[PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres" -c "\dt"
```

## Security Configuration

### Row Level Security (Optional but Recommended)

Enable RLS for sensitive tables:

```sql
-- Enable RLS on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your needs)
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

-- Users can only see organizations they belong to
CREATE POLICY "Users can view own organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE memberships.org_id = organizations.id 
      AND memberships.user_id = auth.uid()::text
    )
  );

-- Users can only see assets from their organizations
CREATE POLICY "Users can view organization assets" ON assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE memberships.org_id = assets.org_id 
      AND memberships.user_id = auth.uid()::text
    )
  );
```

### Network Security

1. **IP Restrictions** (if needed):
   - Go to Settings → Database
   - Add allowed IP addresses under "Network restrictions"
   - Usually not needed for application servers

2. **SSL Enforcement**:
   - SSL is enforced by default
   - All connections use TLS encryption

## Performance Optimization

### Connection Pooling

1. **Use Pooled Connection**:
   ```env
   # Use this for high-traffic applications
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
   ```

2. **Configure Prisma Connection Pool**:
   ```typescript
   // In your prisma configuration
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     directUrl = env("DIRECT_URL") // Optional: direct connection for migrations
   }
   ```

### Indexing

Create additional indexes for better performance:

```sql
-- Optimize asset search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_brand_name ON assets USING gin(brand_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_headline ON assets USING gin(headline gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_ad_text ON assets USING gin(ad_text gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_org_platform ON assets(org_id, platform);

-- Optimize tag queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_tags_asset_id ON asset_tags(asset_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_org_name ON tags(org_id, name);

-- Optimize board queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_board_assets_board_id ON board_assets(board_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_board_assets_added_at ON board_assets(added_at DESC);
```

## Monitoring and Maintenance

### Database Monitoring

1. **Supabase Dashboard**:
   - Monitor database usage in Reports section
   - Check query performance
   - View connection counts

2. **Query Performance**:
   ```sql
   -- Check slow queries
   SELECT query, mean_exec_time, calls, total_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

### Backup Strategy

1. **Automatic Backups**:
   - Daily backups included in all plans
   - Point-in-time recovery (Pro plan)
   - 7-day retention (can be extended)

2. **Manual Backups**:
   ```bash
   # Create manual backup
   pg_dump "postgresql://postgres:[PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres" \
     --clean --create --if-exists \
     > adboard_backup_$(date +%Y%m%d_%H%M%S).sql
   
   # Compress backup
   gzip adboard_backup_*.sql
   ```

3. **Automated Backup Script**:
   ```bash
   #!/bin/bash
   # backup_supabase.sh
   
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/backups/supabase"
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres"
   
   mkdir -p $BACKUP_DIR
   
   pg_dump "$DATABASE_URL" \
     --clean --create --if-exists \
     > $BACKUP_DIR/adboard_$DATE.sql
   
   gzip $BACKUP_DIR/adboard_$DATE.sql
   
   # Keep only last 30 days
   find $BACKUP_DIR -name "adboard_*.sql.gz" -mtime +30 -delete
   
   echo "Backup completed: adboard_$DATE.sql.gz"
   ```

## Scaling Considerations

### Plan Limits

- **Free Tier**: 500MB, 2 CPU hours, 5GB bandwidth
- **Pro Plan**: 8GB included, unlimited CPU, 250GB bandwidth
- **Team Plan**: Larger limits, additional features

### Upgrading

When you need to scale:

1. **Upgrade Plan**: Pro plan provides better performance and features
2. **Read Replicas**: Available for high-read workloads
3. **Connection Pooling**: Use for high-concurrency applications
4. **Database Optimization**: Regular maintenance and query optimization

## Troubleshooting

### Common Issues

1. **Connection Timeouts**:
   ```typescript
   // Increase connection timeout in Prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   
   // In your application
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
     // Increase timeout
     __internal: {
       engine: {
         connectTimeout: 60000,
         queryTimeout: 60000,
       },
     },
   })
   ```

2. **Migration Issues**:
   ```bash
   # Reset migration state if needed
   npx prisma migrate reset
   
   # Deploy specific migration
   npx prisma migrate deploy
   
   # Generate client after migration
   npx prisma generate
   ```

3. **Connection Pool Exhaustion**:
   - Use connection pooling
   - Implement connection retry logic
   - Monitor connection counts

### Getting Help

1. **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
2. **Supabase Discord**: Community support
3. **Supabase Support**: Pro plan includes email support
4. **Prisma Documentation**: [prisma.io/docs](https://prisma.io/docs)

## Migration from Self-Hosted PostgreSQL

If migrating from a self-hosted database:

1. **Export Data**:
   ```bash
   pg_dump "postgresql://old_connection_string" > migration_data.sql
   ```

2. **Import to Supabase**:
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < migration_data.sql
   ```

3. **Update Environment Variables**:
   - Replace DATABASE_URL with Supabase connection string
   - Test application connectivity

4. **Verify Migration**:
   - Check all tables and data
   - Run application tests
   - Monitor for any issues

This setup provides a robust, managed database solution that scales with your AdBoard application while reducing operational overhead.