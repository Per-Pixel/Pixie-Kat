# Last Summary

## Session: Start All Dev Servers

- Stopped the standalone backend process and started all services via `npm run dev:all` in `main/`.
- Running concurrently:
  - Frontend: `http://localhost:5173/`
  - Backend: `http://0.0.0.0:3001/`
  - Admin: `http://localhost:5174/`
- Razorpay routes remain available within the backend process.
