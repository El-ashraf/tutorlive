## Sandbox runtime notes
- The development runtime installs OpenSSL before Prisma client generation; `node:22-slim` alone cannot reliably detect the engine's OpenSSL version.
- Source is bind-mounted; the runtime Dockerfile deliberately contains no application source or dependencies. Startup runs `npm ci` against the checkout's lockfile.
- Verify both Compose services are healthy and `/` returns HTTP 200. If investigating stale compilation errors, stop the web service before deleting `.next`; deleting it while running triggers an additional recovery error.
