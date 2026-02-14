# BattleBrain Production Deployment

This guide deploys BattleBrain under `https://uofa.ink/battlebrain/...` with:
- frontend served by Nginx at `/battlebrain`
- backend running on a dedicated local port (`4300`, no conflict with existing apps)
- GitHub Actions auto-deploy on every push to `main`

## 1. Server prerequisites (one-time)

```bash
sudo apt update
sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Clone your repo to a fixed path (example):

```bash
mkdir -p /home/ubuntu/projects
cd /home/ubuntu/projects
git clone <your-repo-url> BattleBrain
cd BattleBrain
```

## 2. Create production env files on server

Create `backend/.env` (manual upload is fine):

```env
PORT=4300
NODE_ENV=production
OPENROUTER_API_KEY=your-key
MONGODB_URI=your-mongodb-uri
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://uofa.ink
LOG_LEVEL=info
ENABLE_BOT=true
PRESENCE_HEARTBEAT_INTERVAL_MS=30000
PRESENCE_TIMEOUT_MS=60000
SWIPE_DECK_SIZE=20
```

Create `frontend/.env.production`:

```env
VITE_BASE_PATH=/battlebrain/
VITE_API_BASE_URL=/battlebrain
VITE_SOCKET_URL=https://uofa.ink
VITE_SOCKET_PATH=/battlebrain/socket.io
VITE_APP_NAME=BattleBrain
VITE_USE_MOCK_SOCKET=false
VITE_USE_MOCK_API=false
```

## 3. Nginx config update (same `server {}` for `uofa.ink`)

Add these `location` blocks into your existing `server {}` (inside `listen 443 ssl;` block), and place them before your generic `location /`:

```nginx
# BattleBrain: /battlebrain -> /battlebrain/
location = /battlebrain {
    return 301 /battlebrain/;
}

# BattleBrain API -> backend:4300/api/*
location ^~ /battlebrain/api/ {
    rewrite ^/battlebrain/api/(.*)$ /api/$1 break;
    proxy_pass http://127.0.0.1:4300;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;
}

# BattleBrain health endpoint
location = /battlebrain/health {
    proxy_pass http://127.0.0.1:4300/health;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# BattleBrain Socket.IO
location ^~ /battlebrain/socket.io/ {
    proxy_pass http://127.0.0.1:4300/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;
}

# BattleBrain frontend SPA
location /battlebrain/ {
    alias /home/ubuntu/projects/BattleBrain/frontend/dist/;
    try_files $uri $uri/ /battlebrain/index.html;
}
```

Then validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. First-time app start on server

```bash
cd /home/ubuntu/projects/BattleBrain/backend
npm ci --omit=dev
cd ../frontend
npm ci
npm run build
cd ..
pm2 restart battlebrain-backend --update-env || pm2 start npm --name "battlebrain-backend" --cwd "/home/ubuntu/projects/BattleBrain/backend" -- start
pm2 save
pm2 startup
```

Check port usage:

```bash
sudo lsof -iTCP -sTCP:LISTEN -P | grep -E ':4273|:4274|:4300'
```

## 5. Enable GitHub Actions auto-deploy on `main`

Workflow file is already added at:
- `.github/workflows/deploy-main.yml`

Set these GitHub repository secrets:
- `SERVER_HOST` (example: `uofa.ink` or server IP)
- `SERVER_USER` (example: `ubuntu`)
- `SERVER_SSH_KEY` (private key content)
- `SERVER_SSH_PORT` (usually `22`)
- `SERVER_PROJECT_PATH` (example: `/home/ubuntu/projects/BattleBrain`)

On each push to `main`, workflow will:
1. SSH into server
2. `git pull` latest `main`
3. install backend/frontend dependencies
4. build frontend with `frontend/.env.production`
5. restart backend via PM2

## 6. Verify deployment

Open:
- `https://uofa.ink/battlebrain/`
- `https://uofa.ink/battlebrain/leaderboard`
- `https://uofa.ink/battlebrain/health`

If API/socket fails, check:

```bash
pm2 logs battlebrain-backend --lines 100
sudo tail -n 100 /var/log/nginx/error.log
```
