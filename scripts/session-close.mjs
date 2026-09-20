import fs from 'node:fs'
const status = JSON.parse(fs.readFileSync('project-status.json', 'utf8'))
const progress = fs.readFileSync('docs/PROGRESS.md', 'utf8')
const missing = []
if (!progress.includes(status.activeMilestone)) missing.push('PROGRESS.md does not mention active milestone')
if (!status.lastSession?.nextActions?.length) missing.push('project-status.json lastSession.nextActions is empty')
if (missing.length) {
  console.error('Session close check failed:')
  for (const m of missing) console.error(`- ${m}`)
  process.exit(1)
}
console.log('Session handoff metadata is present. Run tests/build and record the actual results in PROGRESS.md before ending the session.')
