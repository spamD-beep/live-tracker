# Dashboard setup

Copy `dashboard/.env.example` to `dashboard/.env`. `VITE_API_URL` must end in `/api`; `VITE_SOCKET_URL` is the API origin. Run the root development command and open port 5173.

The dashboard uses TanStack Query for server state, Zustand for the authenticated session, Axios token refresh, Socket.IO for event-driven invalidation, and Leaflet/OpenStreetMap for maps. It keeps cached query data visible across temporary socket disconnects and refreshes after reconnection.
