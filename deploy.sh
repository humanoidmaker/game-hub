#!/bin/bash
set -e
echo "[deploy.sh] Starting deployment of $APP_NAME..."

cd "$APP_DIR"
npm install -q 2>&1 | tail -3

# Vite config
cat > "$APP_DIR/vite.config.ts" << VEOF
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: $FRONTEND_PORT, host: '0.0.0.0', allowedHosts: true },
});
VEOF

# PM2
cat > "$APP_DIR/ecosystem.config.js" << PMEOF
module.exports = { apps: [{
  name: "${PM2_PREFIX}-app",
  cwd: "$APP_DIR",
  script: "npx",
  args: "vite",
  max_restarts: 10,
}]};
PMEOF

pm2 start ecosystem.config.js 2>&1
pm2 save 2>/dev/null || true
echo "[deploy.sh] Done!"
