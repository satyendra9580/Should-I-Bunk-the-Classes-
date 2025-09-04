# 🚀 Complete Deployment Guide - Should I Bunk?

## 📋 Project Structure
```
should/
├── client/          # React Frontend
├── server/          # Node.js Backend
├── ml-service/      # Python Flask ML API
└── README.md
```

## 🌟 Recommended Deployment Stack

### Frontend: **Vercel** (Free)
### Backend: **Railway** (Free tier available)
### ML Service: **Render** (Free tier available)
### Database: **MongoDB Atlas** (Free tier)

---

## 📦 Step 1: Prepare Environment Variables

### 1.1 Backend (.env)
```env
NODE_ENV=production
PORT=5004
MONGO_URL=mongodb+srv://your-atlas-connection-string
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ML_SERVICE_URL=https://your-ml-service.onrender.com
GEMINI_API_KEY=your-gemini-api-key
```

### 1.2 ML Service (.env)
```env
FLASK_ENV=production
PORT=5000
```

### 1.3 Frontend (.env.production)
```env
REACT_APP_API_URL=https://your-backend.railway.app/api
```

---

## 🗄️ Step 2: Setup MongoDB Atlas (Database)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create free account & cluster
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow all)
5. Get connection string
6. Replace in backend .env

---

## 🤖 Step 3: Deploy ML Service (Render)

### 3.1 Create requirements.txt
```txt
Flask==2.3.3
Flask-CORS==4.0.0
scikit-learn==1.3.0
pandas==2.0.3
numpy==1.24.3
python-dotenv==1.0.0
gunicorn==21.2.0
```

### 3.2 Create Dockerfile (optional)
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

### 3.3 Deploy Steps:
1. Go to [Render](https://render.com)
2. Connect GitHub repo
3. Create **Web Service**
4. Settings:
   - **Root Directory**: `ml-service`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`
   - **Python Version**: 3.9
5. Add environment variables
6. Deploy!

---

## 🖥️ Step 4: Deploy Backend (Railway)

### 4.1 Create railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 4.2 Update package.json scripts
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "npm install"
  }
}
```

### 4.3 Deploy Steps:
1. Go to [Railway](https://railway.app)
2. Connect GitHub repo
3. Create **New Project** → **Deploy from GitHub**
4. Settings:
   - **Root Directory**: `server`
   - **Start Command**: `npm start`
5. Add all environment variables
6. Deploy!

---

## 🌐 Step 5: Deploy Frontend (Vercel)

### 5.1 Create vercel.json
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "s-maxage=31536000,immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 5.2 Update package.json
```json
{
  "scripts": {
    "build": "react-scripts build",
    "vercel-build": "npm run build"
  }
}
```

### 5.3 Deploy Steps:
1. Go to [Vercel](https://vercel.com)
2. Connect GitHub repo
3. Import project
4. Settings:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
5. Add environment variables
6. Deploy!

---

## 🔧 Step 6: Update API URLs

### 6.1 Update client axios baseURL
In `client/src/index.js` or create `client/src/config.js`:
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5004/api';

axios.defaults.baseURL = API_BASE_URL;
```

### 6.2 Update CORS in backend
In `server/server.js`:
```javascript
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-app.vercel.app',  // Add your Vercel URL
  ],
  credentials: true
};
```

---

## 🚀 Alternative: Single Platform Deployment (Railway)

Deploy everything on Railway with multiple services:

### Create railway.toml
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"

[[services]]
name = "backend"
source = "server"

[[services]]
name = "ml-service"
source = "ml-service"
startCommand = "gunicorn --bind 0.0.0.0:$PORT app:app"

[[services]]
name = "frontend"
source = "client"
startCommand = "npm run build && npx serve -s build -l $PORT"
```

---

## 🔍 Step 7: Testing Deployment

### 7.1 Test ML Service
```bash
curl https://your-ml-service.onrender.com/health
```

### 7.2 Test Backend
```bash
curl https://your-backend.railway.app/health
```

### 7.3 Test Frontend
Visit your Vercel URL and test all features

---

## 📝 Step 8: Domain & SSL (Optional)

1. **Custom Domain**: Add in Vercel settings
2. **SSL**: Automatic with all platforms
3. **Environment URLs**: Update all API references

---

## 🛠️ Troubleshooting

### Common Issues:
1. **CORS Errors**: Update backend CORS origins
2. **ML Service Timeout**: Increase timeout in backend
3. **Build Failures**: Check Node.js/Python versions
4. **Environment Variables**: Double-check all values

### Logs:
- **Vercel**: Function logs in dashboard
- **Railway**: Real-time logs in dashboard  
- **Render**: Logs in service dashboard

---

## 💰 Cost Estimate (Free Tiers)

- **Vercel**: Free (100GB bandwidth)
- **Railway**: Free ($5 credit monthly)
- **Render**: Free (750 hours/month)
- **MongoDB Atlas**: Free (512MB storage)

**Total**: FREE for development/small projects!

---

## 🎯 Quick Start Commands

```bash
# 1. Set up environment files
cp .env.example .env

# 2. Install dependencies
cd client && npm install
cd ../server && npm install  
cd ../ml-service && pip install -r requirements.txt

# 3. Build frontend
cd client && npm run build

# 4. Test locally
npm run dev  # Backend
npm start    # Frontend
python app.py  # ML Service
```

---

## 📞 Support

If you encounter issues:
1. Check platform-specific documentation
2. Review logs in deployment dashboards
3. Test API endpoints individually
4. Verify environment variables

**Happy Deploying! 🚀**
