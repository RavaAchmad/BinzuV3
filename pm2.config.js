module.exports = {
  apps: [
    {
      name: "backend",
      script: "index.js",
      cwd: ".",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    },
    {
      name: "cloudflared",
      script: "./cloudflared",
      args: "tunnel --config ./config.yml run",
      cwd: ".",
      autorestart: true,
      watch: false
    }
  ]
};
