<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:dev-server-lifetime -->
## Dev servers: do not leave them running

Never leave a dev server, file watcher, or background task running for more
than 2 hours. Stop it when the session ends, even if you expect to return
to it shortly.

Stale watchers are the specific risk. A wedged watcher will hold one CPU
core at 100% indefinitely while total system CPU still looks low, so it does
not stand out in Task Manager. An abandoned `expo start` once held a full
core for two and a half days and kept the laptop fan running.

- Before starting a dev server, check whether one is already running for
  this project.
- When you finish, terminate the process. Do not just close the terminal.
- Do not spawn a second copy of a server that is already up.
<!-- END:dev-server-lifetime -->