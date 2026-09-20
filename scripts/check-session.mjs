import fs from 'node:fs'

const required = [
  'AI_START_HERE.md',
  'project-status.json',
  'docs/PROJECT_CHARTER.md',
  'docs/MILESTONES.md',
  'docs/PROGRESS.md',
  'docs/DECISIONS.md',
  'docs/DESIGN_SYSTEM.md',
  'docs/DATA_CONTRACTS.md',
]

let failed = false
for (const path of required) {
  if (!fs.existsSync(path)) {
    console.error(`Missing required project-governance file: ${path}`)
    failed = true
  }
}

if (!failed) {
  const status = JSON.parse(fs.readFileSync('project-status.json', 'utf8'))
  console.log(`Active milestone: ${status.activeMilestone} — ${status.activeMilestoneTitle}`)
  console.log('Locked features:')
  for (const [feature, milestone] of Object.entries(status.lockedUntil)) {
    console.log(`  - ${feature}: ${milestone}`)
  }
}

process.exit(failed ? 1 : 0)
