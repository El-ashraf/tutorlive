import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping automatic Prisma migrations outside the Vercel production environment.')
  process.exit(0)
}

const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js')
execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], { stdio: 'inherit' })
