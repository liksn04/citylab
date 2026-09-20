import fs from 'node:fs'
const tokens = JSON.parse(fs.readFileSync('design-tokens.json', 'utf8'))
const css = fs.readFileSync('src/styles/tokens.css', 'utf8')
const groups = ['color', 'glass', 'radius', 'spacing', 'motion']
const missing = []
const mismatched = []
for (const group of groups) {
  for (const [name, value] of Object.entries(tokens[group])) {
    const marker = `--${name}: ${value};`
    if (!css.includes(`--${name}:`)) missing.push(name)
    else if (!css.includes(marker)) mismatched.push(`${name} expected ${value}`)
  }
}
if (missing.length || mismatched.length) {
  if (missing.length) console.error('Missing CSS tokens:', missing.join(', '))
  if (mismatched.length) console.error('Token value mismatch:', mismatched.join(', '))
  process.exit(1)
}
console.log('Design token JSON and CSS values are synchronized.')
