# GameHub — 111 Free Browser Games

A standalone web application featuring 111 browser games across 9 categories, all running client-side with zero backend required.

## Features

- **111 Games** across 9 categories: Board, Card, Puzzle, Arcade, Sports, Party, Strategy, Music, Idle
- **Zero backend** — all games run entirely in the browser
- **Code-split loading** — each game loads on demand via dynamic import
- **Recently played** tracking (localStorage)
- **High scores** saved locally per game
- **Fullscreen mode** for immersive gameplay
- **Search & filter** by category
- **Mobile responsive** — touch controls on all games

## Games Include

- Chess, Checkers, Ludo, Snakes & Ladders, Carrom
- Solitaire, Blackjack, Poker, Memory Match
- Sudoku, Minesweeper, 2048, Word Guess
- Snake, Tetris-style Block Stack, Bubble Shooter
- Cricket, Basketball, Bowling, Archery
- Trivia, Hangman, Typing Speed
- Tower Defense, Dungeon Crawler
- And 90+ more...

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS (dark theme)
- React Router v6
- Canvas API for game rendering
- Web Audio API for sound effects
- No backend, no database, no API calls

## Setup

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Build

```bash
npm run build
# Output in dist/ — serve with any static file server
```

## Deploy

Can be deployed as a static site (Vercel, Netlify, nginx) or via Docker:

```bash
docker build -t game-hub .
docker run -p 3000:3000 game-hub
```


## Deployment

### Docker Compose (Easiest)

```bash
# Clone the repository
git clone https://github.com/humanoidmaker/game-hub.git
cd game-hub

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### PM2 (Production Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Install dependencies
cd backend && pip install -r requirements.txt && cd ..


# Start all services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs

# Stop all
pm2 stop all

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/backend-deployment.yaml

kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods -n game-hub

# View logs
kubectl logs -f deployment/backend -n game-hub

# Scale
kubectl scale deployment/backend --replicas=3 -n game-hub
```

### Manual Setup

**1. Database:**
```bash
# Start MongoDB
mongod --dbpath /data/db
```

**2. Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv/Scripts/activate  # Windows
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database URL and secrets


uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**3. Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**4. Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## License

MIT License — Copyright (c) 2026 Humanoid Maker (www.humanoidmaker.com)
