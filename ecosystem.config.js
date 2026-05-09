// Configuración PM2 para producción.
// PM2 la lee desde /opt/secret-ads-academy/ecosystem.config.js.
//
// Arrancar la primera vez (en el VPS):
//   cd /opt/secret-ads-academy
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup    # (solo una vez por servidor — para que arranque al reboot)
//
// Logs:
//   pm2 logs secret-ads-academy --lines 50 --nostream

module.exports = {
  apps: [
    {
      name: "secret-ads-academy",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/opt/secret-ads-academy",
      // Caddy hace reverse_proxy a este puerto desde exam.secret-ads.com
      env: {
        NODE_ENV: "production",
        PORT: 3010,
      },
      // Restart policy
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
      // Logs locales (PM2 los rota automáticamente)
      out_file: "/var/log/pm2/secret-ads-academy-out.log",
      error_file: "/var/log/pm2/secret-ads-academy-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
