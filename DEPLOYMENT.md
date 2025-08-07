# ACE CRM - Deployment Guide

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ace-crm.git
cd ace-crm

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Start with Docker Compose
docker-compose up -d

# 4. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api
# MongoDB: mongodb://localhost:27017
```

### Manual Setup (Without Docker)

#### Backend Setup
```bash
# 1. Install dependencies
npm install

# 2. Set up MongoDB
# Make sure MongoDB is running on localhost:27017

# 3. Configure environment
cp .env.example .env
# Edit .env with your MongoDB connection string

# 4. Build and start backend
npm run build
npm start
```

#### Frontend Setup
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

# 3. Build and start frontend
npm run build
npm start
```

## 🐳 Docker Deployment

### Development with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (clean install)
docker-compose down -v
```

### Production Docker Build

```bash
# Build images
docker build -t ace-crm-backend -f Dockerfile.backend .
docker build -t ace-crm-frontend -f frontend/Dockerfile ./frontend

# Run containers
docker run -d -p 5000:5000 --env-file .env ace-crm-backend
docker run -d -p 3000:3000 ace-crm-frontend
```

## ☁️ Cloud Deployment

### AWS EC2 / DigitalOcean Droplet

1. **Provision Server**
   - Ubuntu 22.04 LTS
   - Minimum 2GB RAM, 2 vCPUs
   - Open ports: 80, 443, 22

2. **Install Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

3. **Install Docker Compose**
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

4. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/yourusername/ace-crm.git
cd ace-crm

# Configure environment
cp .env.example .env
nano .env  # Edit with production values

# Start services
docker-compose -f docker-compose.yml up -d
```

### Kubernetes Deployment

```yaml
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

### Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd frontend
vercel --prod
```

### Heroku

```bash
# Create Heroku app
heroku create ace-crm-app

# Add MongoDB addon
heroku addons:create mongolab

# Deploy
git push heroku main
```

## 🔒 SSL/TLS Setup

### Using Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Using Cloudflare

1. Add site to Cloudflare
2. Update DNS records
3. Enable "Full (strict)" SSL mode
4. Configure Page Rules for caching

## 📊 Monitoring & Logging

### Setup Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  loki:
    image: grafana/loki
    ports:
      - "3100:3100"
```

### Application Metrics

```javascript
// Add to backend
const prometheus = require('prom-client');
const register = new prometheus.Registry();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions

The repository includes a complete CI/CD pipeline:

1. **On Push to Main:**
   - Run tests
   - Build Docker images
   - Push to registry
   - Deploy to production

2. **On Pull Request:**
   - Run linting
   - Run tests
   - Build verification

### Setup Secrets in GitHub

```
DOCKER_USERNAME
DOCKER_PASSWORD
DEPLOY_HOST
DEPLOY_USER
DEPLOY_KEY
```

## 🔧 Environment Variables

### Required Variables

```env
# Backend
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://username:password@host:27017/database
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Optional Variables

```env
# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_BUCKET_NAME=ace-crm-files

# Analytics
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## 🚨 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MongoDB is running
   - Verify connection string
   - Check firewall rules

2. **Frontend Can't Connect to API**
   - Verify NEXT_PUBLIC_API_URL
   - Check CORS settings
   - Ensure backend is running

3. **Docker Build Fails**
   - Clear Docker cache: `docker system prune -a`
   - Check available disk space
   - Verify Dockerfile syntax

### Health Checks

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost:3000

# Check MongoDB
docker exec ace-crm-mongodb mongosh --eval "db.adminCommand('ping')"
```

## 📈 Scaling

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

### Database Scaling

1. **MongoDB Replica Set**
```javascript
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})
```

2. **Connection Pooling**
```javascript
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 10000
});
```

## 🔐 Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Enable rate limiting
- [ ] Implement CORS properly
- [ ] Use environment variables
- [ ] Regular backups
- [ ] Monitor access logs
- [ ] Use non-root users in Docker

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Best Practices](https://docs.mongodb.com/manual/administration/production-notes/)
- [Node.js Production Guide](https://nodejs.org/en/docs/guides/)

## 💡 Support

For deployment issues, please:
1. Check the troubleshooting section
2. Review application logs
3. Open an issue on GitHub
4. Contact support team

---

**Last Updated:** January 2025
**Version:** 1.0.0