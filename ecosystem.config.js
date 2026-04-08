module.exports = {
  apps: [
    {
      name: "game-hub",
      script: "npx",
      args: "serve dist -l 3000 -s",
      env: { PORT: 3000 },
      max_restarts: 10,
    },
  ],
};
