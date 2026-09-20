import fs from 'node:fs'
const s = JSON.parse(fs.readFileSync('project-status.json', 'utf8'))
console.log('\nNEURAL CITY LAB — SESSION OPEN')
console.log('================================')
console.log(`Active: ${s.activeMilestone} — ${s.activeMilestoneTitle}`)
console.log('\nNext actions:')
for (const action of s.lastSession.nextActions) console.log(`- ${action}`)
console.log('\nBefore editing, read AI_START_HERE.md and the active milestone section in docs/MILESTONES.md.\n')
