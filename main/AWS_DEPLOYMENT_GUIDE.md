# AWS Free Tier Deployment Guide - PixieKat

## Overview
This guide will help you deploy your React frontend and Express backend on AWS Free Tier.

## Architecture
- **Frontend**: AWS S3 + CloudFront (Static hosting + CDN)
- **Backend**: AWS EC2 t2.micro (Express server with security hardening)
- **Database**: AWS RDS PostgreSQL db.t2.micro (User authentication)
- **Security**: Helmet, rate limiting, parameterized queries, secure cookies

---

## Prerequisites

1. **AWS Account** - Sign up at https://aws.amazon.com/free/
2. **AWS CLI** - Install from https://aws.amazon.com/cli/
3. **Git** - Your code should be in a Git repository
4. **Node.js** - Already installed

---

## Part 1: Database Setup (AWS RDS PostgreSQL)

### Step 1: Create RDS Database

1. **Go to AWS Console** → Search for "RDS"
2. **Click "Create database"**
3. **Configuration:**
   - Engine: PostgreSQL
   - Version: PostgreSQL 15.x (latest)
   - Templates: **Free tier**
   - DB instance identifier: `pixiekat-db`
   - Master username: `pixiekat_admin`
   - Master password: (create a strong password - save it!)
   
4. **Instance Configuration:**
   - DB instance class: `db.t3.micro` (Free tier eligible)
   - Storage: 20 GB (Free tier limit)
   - Enable storage autoscaling: No
   
5. **Connectivity:**
   - Public access: **Yes** (for now, we'll secure it later)
   - VPC security group: Create new → `pixiekat-db-sg`
   
6. **Additional Configuration:**
   - Initial database name: `pixiekat_auth`
   - Backup retention: 7 days
   - Enable automated backups: Yes
   
7. **Click "Create database"** (takes 5-10 minutes)

### Step 2: Configure Security Group

1. Go to **EC2 Console** → **Security Groups**
2. Find `pixiekat-db-sg`
3. **Edit inbound rules:**
   - Type: PostgreSQL
   - Port: 5432
   - Source: `0.0.0.0/0` (temporary - we'll restrict this later)
   - Description: "Allow PostgreSQL access"
4. **Save rules**

### Step 3: Note Database Endpoint

1. Go back to RDS → Databases → `pixiekat-db`
2. Copy the **Endpoint** (looks like: `pixiekat-db.xxxxxxxxx.us-east-1.rds.amazonaws.com`)
3. Save this - you'll need it for backend configuration

---

## Part 2: Backend Setup (AWS EC2)

### Step 1: Launch EC2 Instance

1. **Go to EC2 Console** → Click "Launch Instance"
2. **Configuration:**
   - Name: `pixiekat-backend`
   - AMI: Ubuntu Server 22.04 LTS (Free tier eligible)
   - Instance type: `t2.micro` (Free tier eligible)
   - Key pair: Create new key pair
     - Name: `pixiekat-key`
     - Type: RSA
     - Format: `.pem` (for Mac/Linux) or `.ppk` (for Windows/PuTTY)
     - **Download and save this file securely!**
   
3. **Network settings:**
   - Create security group: `pixiekat-backend-sg`
   - Allow SSH (port 22) from: Your IP
   - Allow HTTP (port 80) from: Anywhere
   - Allow HTTPS (port 443) from: Anywhere
   - Add custom TCP rule:
     - Port: 3000 (or your backend port)
     - Source: Anywhere
   
4. **Storage:** 8 GB (default, free tier)
5. **Click "Launch instance"**

### Step 2: Connect to EC2 Instance

**For Windows (PowerShell):**
```powershell
# Navigate to where you saved the key
cd "C:\path\to\your\key"

# Set permissions (if needed)
icacls pixiekat-key.pem /inheritance:r
icacls pixiekat-key.pem /grant:r "%username%:R"

# Connect via SSH
ssh -i pixiekat-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

**For Mac/Linux:**
```bash
# Set permissions
chmod 400 pixiekat-key.pem

# Connect
ssh -i pixiekat-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Step 3: Setup Server Environment

Once connected to EC2, run these commands:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install PostgreSQL client (for testing)
sudo apt install -y postgresql-client

# Create app directory
mkdir -p ~/pixiekat-backend
cd ~/pixiekat-backend
```

### Step 4: Deploy Backend Code

**Option A: Clone from Git (Recommended)**
```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Navigate to server directory
cd server

# Install dependencies
npm install
```

**Option B: Upload files manually**
```bash
# On your local machine (new terminal)
scp -i pixiekat-key.pem -r c:\The Creator\01.Projects\Pixie-Kat\main\server ubuntu@YOUR_EC2_PUBLIC_IP:~/pixiekat-backend/
```

### Step 5: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following (replace with your actual values):
```env
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=pixiekat-db.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=pixiekat_auth
DB_USER=pixiekat_admin
DB_PASSWORD=your_database_password

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# CORS Origin (your frontend URL - will update after frontend deployment)
CORS_ORIGIN=*
```

Save with `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Update Database Configuration

You need to migrate from SQLite to PostgreSQL. Create a new database file:

```bash
nano database-postgres.js
```

Add this content:
```javascript
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  return result.rows[0] || null;
};

export const createUser = async (name, email, passwordHash) => {
  const result = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [name, email.toLowerCase(), passwordHash]
  );
  return result.rows[0].id;
};

export const findUserById = async (id) => {
  const result = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

export default pool;
```

### Step 7: Install Dependencies

```bash
# Install all required packages
npm install pg dotenv helmet

# pg - PostgreSQL driver for database
# dotenv - Environment variable management
# helmet - Security headers middleware
```

### Step 8: Start Backend with PM2

```bash
# Start the server
pm2 start index.js --name pixiekat-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it gives you (copy and run it)

# Check status
pm2 status

# View logs
pm2 logs pixiekat-backend
```

### Step 9: Test Backend

```bash
# Get your EC2 public IP
curl http://169.254.169.254/latest/meta-data/public-ipv4

# Test the API
curl http://YOUR_EC2_PUBLIC_IP:3000/api/health
```

---

## Part 3: Frontend Deployment (S3 + CloudFront)

### Step 1: Build Frontend

On your local machine:

```powershell
# Navigate to project
cd "c:\The Creator\01.Projects\Pixie-Kat\main"

# Update API endpoint in your React app
# Edit src/config.js or wherever you store API URL
# Set it to: http://YOUR_EC2_PUBLIC_IP:3000

# Build production version
npm run build
```

### Step 2: Create S3 Bucket

1. **Go to S3 Console** → Click "Create bucket"
2. **Configuration:**
   - Bucket name: `pixiekat-app` (must be globally unique)
   - Region: Same as your EC2 (e.g., us-east-1)
   - Uncheck "Block all public access"
   - Acknowledge the warning
   - Enable bucket versioning: Yes
   - Click "Create bucket"

### Step 3: Configure S3 for Static Hosting

1. Click on your bucket → **Properties** tab
2. Scroll to **Static website hosting** → Click "Edit"
3. **Configuration:**
   - Enable: Yes
   - Hosting type: Host a static website
   - Index document: `index.html`
   - Error document: `index.html` (for React Router)
4. **Save changes**
5. **Note the endpoint URL** (e.g., `http://pixiekat-app.s3-website-us-east-1.amazonaws.com`)

### Step 4: Set Bucket Policy

1. Go to **Permissions** tab
2. Scroll to **Bucket policy** → Click "Edit"
3. Add this policy (replace `pixiekat-app` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pixiekat-app/*"
    }
  ]
}
```

4. **Save changes**

### Step 5: Upload Build Files

**Option A: AWS Console**
1. Go to **Objects** tab → Click "Upload"
2. Drag and drop all files from `dist` folder
3. Click "Upload"

**Option B: AWS CLI (Faster)**
```powershell
# Configure AWS CLI (first time only)
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1 (or your region)
# Output format: json

# Upload files
aws s3 sync dist/ s3://pixiekat-app --delete
```

### Step 6: Create CloudFront Distribution

1. **Go to CloudFront Console** → Click "Create distribution"
2. **Configuration:**
   - Origin domain: Select your S3 bucket
   - Origin path: Leave empty
   - Name: pixiekat-origin
   - Enable Origin Shield: No
   
3. **Default cache behavior:**
   - Viewer protocol policy: Redirect HTTP to HTTPS
   - Allowed HTTP methods: GET, HEAD, OPTIONS
   - Cache policy: CachingOptimized
   
4. **Settings:**
   - Price class: Use all edge locations (best performance)
   - Alternate domain name (CNAME): (leave empty for now)
   - Custom SSL certificate: Default CloudFront certificate
   - Default root object: `index.html`
   
5. **Click "Create distribution"** (takes 10-15 minutes to deploy)

### Step 7: Configure Error Pages for React Router

1. Click on your distribution → **Error pages** tab
2. **Create custom error response:**
   - HTTP error code: 403
   - Customize error response: Yes
   - Response page path: `/index.html`
   - HTTP response code: 200
3. **Create another:**
   - HTTP error code: 404
   - Customize error response: Yes
   - Response page path: `/index.html`
   - HTTP response code: 200

### Step 8: Update Backend CORS

1. SSH back into your EC2 instance
2. Edit `.env` file:
```bash
nano .env
```

3. Update CORS_ORIGIN:
```env
CORS_ORIGIN=https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net
```

4. Restart backend:
```bash
pm2 restart pixiekat-backend
```

---

## Part 4: Testing & Verification

### Test Backend
```bash
# Health check
curl http://YOUR_EC2_PUBLIC_IP:3000/api/health

# Test registration
curl -X POST http://YOUR_EC2_PUBLIC_IP:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123!","confirmPassword":"Test123!"}'

# Test login
curl -X POST http://YOUR_EC2_PUBLIC_IP:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Test security headers
curl -I http://YOUR_EC2_PUBLIC_IP:3000/api/health
# Should see X-Frame-Options, X-Content-Type-Options, etc.

# Test rate limiting (try 6 times quickly)
for i in {1..6}; do 
  curl -X POST http://YOUR_EC2_PUBLIC_IP:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}';
done
# Should get rate limit error on 6th attempt
```

### Test Frontend
1. Open CloudFront URL in browser
2. Test navigation
3. Test authentication (login/register)
4. Check browser console for errors

---

## Part 5: Security Hardening

### Security Features Already Implemented

Your backend includes these security measures out of the box:

✅ **Helmet.js** - Security headers (XSS, clickjacking protection)
✅ **Global Rate Limiting** - 100 requests per 15 minutes per IP
✅ **Auth Rate Limiting** - 5 login/signup attempts per 15 minutes
✅ **Parameterized Queries** - SQL injection protection
✅ **Secure Cookies** - HttpOnly, SameSite, Secure flags
✅ **Email Normalization** - Lowercase storage and lookup
✅ **Password Hashing** - bcrypt with salt rounds

### 1. Restrict Database Access
1. Go to EC2 → Security Groups → `pixiekat-db-sg`
2. Edit inbound rules
3. Change PostgreSQL source from `0.0.0.0/0` to your EC2 security group ID

### 2. Setup HTTPS for Backend (Optional but Recommended)

**Option A: Use Nginx as Reverse Proxy with Let's Encrypt**
```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx
sudo nano /etc/nginx/sites-available/pixiekat
```

Add:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pixiekat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# If you have a domain, get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

### 3. Setup Environment Variables Securely
- Never commit `.env` to Git
- Use AWS Secrets Manager for production secrets (optional)

---

## Part 6: Monitoring & Maintenance

### Monitor Backend
```bash
# View logs
pm2 logs pixiekat-backend

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart pixiekat-backend
```

### Monitor Database
1. Go to RDS Console → Your database
2. Check **Monitoring** tab for CPU, connections, storage

### Update Frontend
```powershell
# Build new version
npm run build

# Upload to S3
aws s3 sync dist/ s3://pixiekat-app --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Update Backend
```bash
# SSH to EC2
ssh -i pixiekat-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

# Pull latest code
cd ~/pixiekat-backend/server
git pull

# Install new dependencies
npm install

# Restart
pm2 restart pixiekat-backend
```

---

## Cost Monitoring

### Free Tier Limits (12 months)
- **EC2**: 750 hours/month of t2.micro
- **RDS**: 750 hours/month of db.t3.micro, 20GB storage
- **S3**: 5GB storage, 20,000 GET requests
- **CloudFront**: 1TB data transfer out, 10,000,000 requests
- **Data Transfer**: 100GB out per month

### Monitor Usage
1. Go to **AWS Billing Dashboard**
2. Enable **Free Tier Usage Alerts**
3. Set up **Budget Alerts** (recommended: $5 threshold)

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs pixiekat-backend

# Check if port is in use
sudo netstat -tulpn | grep 3000

# Test database connection
psql -h YOUR_DB_ENDPOINT -U pixiekat_admin -d pixiekat_auth
```

### Frontend shows blank page
1. Check browser console for errors
2. Verify API endpoint in frontend code
3. Check CORS configuration
4. Verify CloudFront error pages are configured

### Database connection fails
1. Check security group allows EC2 IP
2. Verify credentials in `.env`
3. Test connection: `psql -h YOUR_DB_ENDPOINT -U pixiekat_admin -d pixiekat_auth`

---

## Next Steps

1. **Custom Domain** (Optional)
   - Register domain (Route 53, Namecheap, etc.)
   - Add to CloudFront as alternate domain
   - Get SSL certificate via ACM
   - Update DNS records

2. **CI/CD Pipeline** (Optional)
   - Setup GitHub Actions
   - Auto-deploy on push to main branch

3. **Monitoring** (Optional)
   - Setup CloudWatch alarms
   - Configure application monitoring (New Relic, DataDog)

---

## Support Resources

- AWS Free Tier: https://aws.amazon.com/free/
- AWS Documentation: https://docs.aws.amazon.com/
- AWS Support: https://console.aws.amazon.com/support/

---

**Estimated Setup Time**: 2-3 hours for first-time deployment

Good luck with your deployment! 🚀
