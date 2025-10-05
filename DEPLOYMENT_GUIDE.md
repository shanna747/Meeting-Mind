# Meeting Mind - Production Deployment Guide

## Overview
This guide will help you deploy Meeting Mind to production with answerly.ai domain.

## Prerequisites
- MongoDB Atlas account (already configured)
- AWS account for S3 storage
- Domain: answerly.ai
- Hosting platform account (Vercel, Heroku, Railway, etc.)

---

## Step 1: AWS S3 Setup (File Storage)

### 1.1 Create S3 Bucket
1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. **Bucket name**: `meeting-mind-uploads` (or your preferred name)
4. **Region**: `us-east-1` (or closest to your users)
5. **Block Public Access**: Keep all blocked (we'll use signed URLs)
6. Click "Create bucket"

### 1.2 Configure CORS for S3
1. Open your bucket
2. Go to "Permissions" tab
3. Scroll to "Cross-origin resource sharing (CORS)"
4. Add this configuration:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://answerly.ai", "https://www.answerly.ai"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 1.3 Create IAM User for S3 Access
1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Add user"
3. **Username**: `meeting-mind-s3-user`
4. **Access type**: Programmatic access
5. **Permissions**: Attach policy "AmazonS3FullAccess" (or create custom policy)
6. **Save the Access Key ID and Secret Access Key** (you'll need these)

---

## Step 2: MongoDB Configuration

### 2.1 Update Database Name
Your MongoDB URI currently uses the default database. Update it:

**Current**:
```
mongodb+srv://727smorris:Margie74!@answerly.gwtbbs9.mongodb.net/?retryWrites=true&w=majority&appName=Answerly
```

**Updated** (add `/meeting-mind` before `?`):
```
mongodb+srv://727smorris:Margie74!@answerly.gwtbbs9.mongodb.net/meeting-mind?retryWrites=true&w=majority&appName=Answerly
```

### 2.2 Whitelist Production IPs
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Navigate to: Network Access → IP Access List
3. Add your production server IP (or use `0.0.0.0/0` to allow all - less secure)

---

## Step 3: Environment Variables for Production

Create a `.env.production` file with these values:

```env
# Server
PORT=3000
NODE_ENV=production

# File Storage - S3 (ENABLE IN PRODUCTION)
USE_S3=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your_aws_access_key>
AWS_SECRET_ACCESS_KEY=<your_aws_secret_key>
AWS_S3_BUCKET=meeting-mind-uploads

# CORS Configuration
ALLOWED_ORIGINS=https://answerly.ai,https://www.answerly.ai

# MongoDB
MONGODB_URI=mongodb+srv://727smorris:Margie74!@answerly.gwtbbs9.mongodb.net/meeting-mind?retryWrites=true&w=majority&appName=Answerly

# Pinecone Configuration
PINECONE_API_KEY=<your_pinecone_key>
PINECONE_ENVIRONMENT=<your_pinecone_environment>
PINECONE_INDEX_NAME=meeting-mind

# OpenAI Configuration
OPENAI_API_KEY=<your_openai_key>
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Vector Search Configuration
VECTOR_DIMENSION=1536
TOP_K_RESULTS=5

# Security (add these for production)
PASSWORD_SALT=<generate_random_salt>
SESSION_SECRET=<generate_random_secret>
```

---

## Step 4: Choose a Hosting Platform

### Option A: Vercel (Recommended for Node.js)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Create `vercel.json`**:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

3. **Deploy**:
```bash
vercel --prod
```

4. **Add environment variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all variables from `.env.production`

### Option B: Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repository
4. Add environment variables in the Variables tab
5. Deploy automatically

### Option C: Heroku

1. **Install Heroku CLI**:
```bash
brew install heroku/brew/heroku
```

2. **Login and create app**:
```bash
heroku login
heroku create meeting-mind-app
```

3. **Add environment variables**:
```bash
heroku config:set NODE_ENV=production
heroku config:set USE_S3=true
heroku config:set AWS_ACCESS_KEY_ID=<your_key>
# ... add all other variables
```

4. **Deploy**:
```bash
git push heroku main
```

---

## Step 5: Domain Configuration (answerly.ai)

### 5.1 Get Your Production URL
After deploying, you'll get a URL like:
- Vercel: `meeting-mind.vercel.app`
- Railway: `meeting-mind.up.railway.app`
- Heroku: `meeting-mind-app.herokuapp.com`

### 5.2 Configure DNS
1. Go to your domain registrar (where you bought answerly.ai)
2. Add DNS records:

**For root domain (answerly.ai):**
```
Type: A
Name: @
Value: <your_server_ip>
```
OR
```
Type: CNAME
Name: @
Value: <your_vercel_url>
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: <your_vercel_url>
```

### 5.3 Add Custom Domain in Vercel/Railway/Heroku
- **Vercel**: Settings → Domains → Add answerly.ai
- **Railway**: Settings → Domains → Add Custom Domain
- **Heroku**: Settings → Domains → Add Domain

---

## Step 6: SSL Certificate

Most hosting platforms (Vercel, Railway, Heroku) automatically provide SSL certificates for custom domains. If not:

1. Use [Let's Encrypt](https://letsencrypt.org/) for free SSL
2. Or use Cloudflare (free tier includes SSL)

---

## Step 7: Testing Production Deployment

1. **Test the API**:
```bash
curl https://answerly.ai/health
```

2. **Test Registration**:
```bash
curl -X POST https://answerly.ai/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"password123"}'
```

3. **Test Login**:
```bash
curl -X POST https://answerly.ai/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Step 8: Post-Deployment Checklist

- [ ] MongoDB connected and accessible
- [ ] S3 bucket created and configured
- [ ] AWS credentials added to environment variables
- [ ] `USE_S3=true` in production environment
- [ ] CORS configured for answerly.ai
- [ ] SSL certificate active (https://)
- [ ] Domain DNS pointing to production server
- [ ] All API endpoints tested
- [ ] File upload/download working
- [ ] Authentication working
- [ ] WebSocket connection working

---

## Architecture Summary

**Production Setup:**
```
User (Browser/App)
    ↓
answerly.ai (Your Domain)
    ↓
Vercel/Railway/Heroku (Node.js Server)
    ↓
    ├── MongoDB Atlas (User Data & Metadata)
    ├── AWS S3 (File Storage)
    ├── Pinecone (Vector Search)
    └── OpenAI API (AI Processing)
```

---

## Cost Estimates

- **MongoDB Atlas**: Free tier (512MB) → $0/month
- **AWS S3**: ~$0.023/GB → ~$2-10/month
- **Vercel/Railway**: Free tier available → $0-20/month
- **Domain (answerly.ai)**: Already owned
- **Total**: ~$2-30/month (depending on usage)

---

## Troubleshooting

### Files not uploading to S3
- Check AWS credentials in environment variables
- Verify `USE_S3=true` is set
- Check S3 bucket permissions

### CORS errors
- Verify `ALLOWED_ORIGINS` includes your domain
- Check S3 CORS configuration
- Ensure domain uses https://

### MongoDB connection failed
- Check if production IP is whitelisted in MongoDB Atlas
- Verify MongoDB URI is correct
- Check if password has special characters (URL encode them)

---

## Next Steps

1. Set up monitoring (e.g., Sentry, LogRocket)
2. Configure analytics (e.g., Google Analytics)
3. Set up backup strategy for MongoDB
4. Implement rate limiting
5. Add logging service

---

## Support

For issues or questions:
- GitHub Issues: [Your Repo]
- Email: support@answerly.ai
