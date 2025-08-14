# AdBoard Deployment Guide for Coolify

This guide covers deploying AdBoard to Coolify, a self-hosted deployment platform.

## Prerequisites

- Coolify instance running and accessible
- Domain name configured
- Basic knowledge of Docker and environment variables

## Deployment Steps

### 1. Prepare Your Coolify Instance

Ensure your Coolify instance is running and accessible. You'll need:
- Admin access to Coolify dashboard
- A server with Docker installed
- SSL certificate capability (Let's Encrypt recommended)

### 2. Create a New Project in Coolify

1. Log into your Coolify dashboard
2. Click "New Project"
3. Choose "Application" (not Docker Compose)
4. Connect your Git repository (GitHub/GitLab)
5. Coolify will auto-detect this as a Next.js application

### 3. Configure Environment Variables

Set up the following environment variables in Coolify:

#### Database Configuration (Supabase)
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres
```

#### Application Configuration
```env
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
PORT=3000
```

#### Email Configuration (for magic links)
```env
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

#### Cloudinary Configuration
```env
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

#### Extension API
```env
EXTENSION_API_SECRET=your-extension-api-secret
```

### 4. Application Configuration

Coolify will automatically:
- Detect this as a Next.js application
- Install dependencies with `npm ci`
- Build the application with `npm run build`
- Start the application with `npm start`

No additional configuration needed!

### 5. Domain and SSL Setup

1. Configure your domain in Coolify
2. Enable SSL (Let's Encrypt)
3. Set up any required DNS records

### 6. Deploy the Application

1. Commit your changes to your Git repository
2. In Coolify, trigger a deployment
3. Monitor the build and deployment logs
4. Verify the application is running at your domain

## Post-Deployment Steps

### 1. Database Setup

#### Set up Supabase Database

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and database password

2. **Get Database Connection String**:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres
   ```

3. **Run Database Migration**:
   ```bash
   # Via Coolify terminal or SSH into your server
   # Navigate to your application directory and run:
   npx prisma migrate deploy
   ```

4. **Enable Required Extensions** (via Supabase SQL Editor):
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   CREATE EXTENSION IF NOT EXISTS "btree_gin";
   ```

### 2. Health Check

Verify the application is healthy:
```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "environment": "production"
}
```

### 3. Create First User

1. Navigate to `https://yourdomain.com`
2. Enter your email address
3. Check your email for the magic link
4. Complete the sign-up process

### 4. Generate API Token for Chrome Extension

1. Go to Settings → API Tokens
2. Create a new token for the Chrome extension
3. Note down the token (you won't see it again)

## Maintenance and Updates

### Updating the Application

1. Push changes to your Git repository
2. Coolify will automatically detect changes and redeploy
3. Database migrations will run automatically if needed

### Backup Strategy

#### Database Backups (Supabase)

Supabase provides automatic daily backups for all projects. For additional backups:

1. **Manual Backup via Supabase Dashboard**:
   - Go to Settings → Database
   - Click "Create backup"

2. **Programmatic Backup**:
   ```bash
   # Using pg_dump with Supabase connection
   pg_dump "postgresql://postgres:[PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres" > backup.sql
   
   # Restore (be careful - this will overwrite data)
   psql "postgresql://postgres:[PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres" < backup.sql
   ```

3. **Point-in-Time Recovery**:
   - Available for Supabase Pro plans
   - Can restore to any point within the last 7 days

#### Environment Variables Backup
Export your environment variables from Coolify and store them securely.

### Monitoring

#### Application Logs
```bash
# View application logs in Coolify dashboard
# Or via server terminal:
# Navigate to application directory and check logs
pm2 logs # if using PM2
# or check Coolify application logs directly in the dashboard
```

#### Resource Usage
Monitor your server resources through Coolify dashboard or system tools.

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
- Verify DATABASE_URL is correct and includes the right Supabase credentials
- Check Supabase project status in dashboard
- Ensure your server's IP is not blocked by Supabase (usually not an issue)
- Test connection manually: `psql "postgresql://postgres:[PASSWORD]@db.cmjaxqfargntgmmtfczg.supabase.co:5432/postgres"`

#### 2. Environment Variables Not Loading
- Double-check all required environment variables are set
- Restart the application container
- Verify environment variable names match exactly

#### 3. SSL Certificate Issues
- Ensure domain DNS is pointing to your server
- Check Coolify SSL configuration
- Verify Let's Encrypt rate limits haven't been exceeded

#### 4. Chrome Extension Connection Issues
- Verify NEXTAUTH_URL matches your domain
- Check CORS configuration in API routes
- Ensure API token is valid and not expired

### Getting Help

If you encounter issues:

1. Check Coolify documentation: https://coolify.io/docs
2. Review application logs for specific error messages
3. Verify all environment variables are correctly set
4. Test the health endpoint: `/api/health`

## Security Considerations

### Production Security Checklist

- [ ] Use strong, unique passwords for database
- [ ] Enable SSL/TLS encryption
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Implement rate limiting
- [ ] Regular backups
- [ ] Environment variable security

### API Security

- [ ] Use strong API secrets
- [ ] Implement rate limiting
- [ ] Monitor for suspicious activity
- [ ] Regular token rotation
- [ ] Audit logs review

## Performance Optimization

### Recommended Server Specifications

#### Minimum Requirements
- 2 CPU cores
- 4GB RAM
- 20GB storage
- 1Gbps network

#### Recommended for Production
- 4 CPU cores
- 8GB RAM
- 50GB SSD storage
- High-bandwidth network

### Scaling Considerations

As your application grows, consider:
- Horizontal scaling with multiple application instances
- Database read replicas
- CDN for static assets
- Redis caching layer
- Load balancing

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh - Daily backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
docker exec postgres pg_dump -U adboard_user adboard_production > $BACKUP_DIR/adboard_db_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/adboard_db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "adboard_db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: adboard_db_$DATE.sql.gz"
```

Add to crontab for daily execution:
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

This deployment guide should help you successfully deploy AdBoard on Coolify with proper configuration, security, and maintenance procedures.