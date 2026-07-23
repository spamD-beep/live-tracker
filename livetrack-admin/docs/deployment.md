# Production deployment

Build the API on Node.js 22 and serve the dashboard static output from Nginx, Vercel, or Netlify. Use managed PostgreSQL with encrypted connections, backups, point-in-time recovery, and a least-privilege user.

Terminate HTTPS at a trusted load balancer or reverse proxy. Forward WebSocket upgrade headers for `/socket.io`, set the exact HTTPS dashboard origin in `CLIENT_URL`, rotate both JWT secrets, and run Prisma deploy as a controlled release step.

Run at least two API instances only with a Socket.IO adapter such as Redis so broadcasts reach every connection. Add centralized logs, uptime and error monitoring, database metrics, and alerts for elevated authentication failures.
