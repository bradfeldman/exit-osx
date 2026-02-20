#!/usr/bin/env node

/**
 * reskin-playbooks.js — Batch-migrate all 44 playbook HTML files
 * from the forest green / Georgia / dark sidebar design
 * to the Exit OSx app design system (blue / SF Pro / white sidebar).
 *
 * Usage: node scripts/reskin-playbooks.js
 *
 * Source: /Users/bradfeldman/Documents/playbooks/Playbook-*.html
 * Output: public/playbooks/ (in the Next.js app)
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

const SOURCE_DIR = path.resolve(__dirname, '../../../playbooks')
const OUTPUT_DIR = path.resolve(__dirname, '../public/playbooks')

// ── Token Replacement Map ──────────────────────────────────────────────
// Two source systems exist:
//   System A (PB-01): primary = #B87333 (burnt orange)
//   System B (PB-02+): primary = #2D5A3D (forest green)
// Both map to the same target tokens.

const ROOT_TOKEN_MAP = {
  // Background & surface
  '--color-bg: #FAFAF9':           '--color-bg: #F5F5F7',
  '--color-surface-alt: #F5F5F0':  '--color-surface-alt: #F2F2F7',

  // Borders
  '--color-border: #E8E5E0':       '--color-border: #E5E7EB',
  '--color-border-light: #F0EDE8': '--color-border-light: #F2F2F7',

  // Text
  '--color-text: #1A1917':           '--color-text: #1D1D1F',
  '--color-text-secondary: #6B6860': '--color-text-secondary: #6E6E73',
  '--color-text-tertiary: #9C9890':  '--color-text-tertiary: #8E8E93',

  // Primary — System B (forest green)
  '--color-primary: #2D5A3D':       '--color-primary: #0071E3',
  '--color-primary-light: #E8F0EB': '--color-primary-light: #EBF5FF',
  '--color-primary-hover: #234A31': '--color-primary-hover: #0051B3',

  // Primary — System A (burnt orange as primary)
  '--color-primary: #B87333':       '--color-primary: #0071E3',
  '--color-primary-light: #FFF3E8': '--color-primary-light: #EBF5FF',
  '--color-primary-hover: #A56628': '--color-primary-hover: #0051B3',

  // Accent (burnt orange → bright orange)
  '--color-accent: #B87333':       '--color-accent: #FF9500',
  '--color-accent-light: #FFF3E8': '--color-accent-light: #FFF6E8',

  // Score scale (warm → Apple system colors)
  '--color-score-1: #C53030': '--color-score-1: #FF3B30',
  '--color-score-2: #D97706': '--color-score-2: #FF9500',
  '--color-score-3: #C67F20': '--color-score-3: #FFCC00',
  '--color-score-4: #2D8A4E': '--color-score-4: #34C759',
  '--color-score-5: #1A6B35': '--color-score-5: #30D158',

  // Semantic (keep danger/warning similar, update success)
  '--color-danger: #C53030':      '--color-danger: #FF3B30',
  '--color-danger-light: #FFF0F0': '--color-danger-light: #FFEBEA',
  '--color-success: #2D8A4E':       '--color-success: #34C759',
  '--color-success-light: #E8F8EE': '--color-success-light: #E8F8ED',

  // Typography
  "--font-body: 'Segoe UI', system-ui, -apple-system, sans-serif":
    "--font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', sans-serif",
  "--font-display: Georgia, 'Times New Roman', serif":
    "--font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', sans-serif",
}

// ── Hardcoded Color Replacements ──────────────────────────────────────
// Scattered in callout text, btn-accent hover, inline gradients, etc.
const HARDCODED_COLORS = [
  // Callout text colors (warm tan → neutral gray or new accent)
  ['color: #8B5A20', 'color: #7C5500'],   // accent callout text
  ['color: #7C5A10', 'color: #7C5500'],   // olive callout text
  ['color: #854D0E', 'color: #7C5500'],   // burnt sienna text
  ['color: #7C2D12', 'color: #7C5500'],   // dark rust text

  // Button hover states
  ["background: #A56628", "background: #E68600"], // btn-accent hover
  ["background: #234A31", "background: #0051B3"], // btn hover (green)

  // SVG stroke in select dropdown (warm gray → cool gray)
  ["stroke='%236B6860'", "stroke='%236E6E73'"],

  // Inline gradient backgrounds (forest green → blue)
  ['#1A2E1F', '#003A70'],   // dark green in gradients → dark blue
  ['#2D5A3D', '#0071E3'],   // forest green remaining → blue

  // Hardcoded background colors referencing old light green
  ['background: #E8F0EB', 'background: #EBF5FF'],
  ['#E8F0EB', '#EBF5FF'],   // catch-all for remaining old primary-light

  // Hardcoded border/warm colors
  ['#E8E5E0', '#E5E7EB'],   // catch-all for remaining old border
  ['#F0EDE8', '#F2F2F7'],   // catch-all for remaining old border-light

  // System C variant: PB-09 uses #1B4D6E (dark teal/navy) as primary
  ['#1B4D6E', '#0071E3'],   // teal primary → blue
  ['#154060', '#0051B3'],   // teal primary hover → blue hover
  ['#E8F0F6', '#EBF5FF'],   // teal primary light → blue light
]

// ── Minified CSS Handling ──────────────────────────────────────────────
// Some playbooks (e.g., PB-09) have minified CSS with no spaces.
// These need separate replacement patterns.
const MINIFIED_TOKEN_MAP = {
  '--color-bg:#FAFAF9':           '--color-bg:#F5F5F7',
  '--color-surface-alt:#F5F5F0':  '--color-surface-alt:#F2F2F7',
  '--color-border:#E8E5E0':       '--color-border:#E5E7EB',
  '--color-border-light:#F0EDE8': '--color-border-light:#F2F2F7',
  '--color-text:#1A1917':           '--color-text:#1D1D1F',
  '--color-text-secondary:#6B6860': '--color-text-secondary:#6E6E73',
  '--color-text-tertiary:#9C9890':  '--color-text-tertiary:#8E8E93',
  '--color-primary:#2D5A3D':       '--color-primary:#0071E3',
  '--color-primary-light:#E8F0EB': '--color-primary-light:#EBF5FF',
  '--color-primary-hover:#234A31': '--color-primary-hover:#0051B3',
  '--color-primary:#B87333':       '--color-primary:#0071E3',
  '--color-primary-light:#FFF3E8': '--color-primary-light:#EBF5FF',
  '--color-primary-hover:#A56628': '--color-primary-hover:#0051B3',
  '--color-accent:#B87333':       '--color-accent:#FF9500',
  '--color-accent-light:#FFF3E8': '--color-accent-light:#FFF6E8',
  '--color-score-1:#C53030': '--color-score-1:#FF3B30',
  '--color-score-2:#D97706': '--color-score-2:#FF9500',
  '--color-score-3:#C67F20': '--color-score-3:#FFCC00',
  '--color-score-4:#2D8A4E': '--color-score-4:#34C759',
  '--color-score-5:#1A6B35': '--color-score-5:#30D158',
  '--color-danger:#C53030':      '--color-danger:#FF3B30',
  '--color-danger-light:#FFF0F0': '--color-danger-light:#FFEBEA',
  '--color-success:#2D8A4E':       '--color-success:#34C759',
  '--color-success-light:#E8F8EE': '--color-success-light:#E8F8ED',
  "--font-body:'Segoe UI',system-ui,-apple-system,sans-serif":
    "--font-body:-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Segoe UI',sans-serif",
  "--font-display:Georgia,'Times New Roman',serif":
    "--font-display:-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Segoe UI',sans-serif",
}

// ── Sidebar CSS Transformations ────────────────────────────────────────
// Convert dark sidebar (#1A1917 bg, white text) to white sidebar (white bg, dark text)

const SIDEBAR_REPLACEMENTS = [
  // Sidebar background: use var reference that's now #1D1D1F — replace with white
  ['.sidebar { width: 260px; min-width: 260px; background: var(--color-text);',
   '.sidebar { width: 260px; min-width: 260px; background: #FFFFFF; border-right: 1px solid var(--color-border);'],

  // Sidebar text defaults
  ['color: #fff; padding: var(--space-lg); display: flex;',
   'color: var(--color-text); padding: var(--space-lg); display: flex;'],

  // Brand label
  ["color: rgba(255,255,255,0.4); margin-bottom: var(--space-xs);",
   "color: var(--color-text-tertiary); margin-bottom: var(--space-xs);"],

  // Brand title
  [".sidebar-brand-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: #fff;",
   ".sidebar-brand-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--color-text);"],

  // Progress container
  ["background: rgba(255,255,255,0.06); border-radius: var(--radius-md);",
   "background: var(--color-surface-alt); border-radius: var(--radius-md);"],

  // Progress labels
  ["color: rgba(255,255,255,0.5); margin-bottom: var(--space-sm);",
   "color: var(--color-text-tertiary); margin-bottom: var(--space-sm);"],
  ["color: rgba(255,255,255,0.5); margin-top: var(--space-sm);",
   "color: var(--color-text-tertiary); margin-top: var(--space-sm);"],

  // Progress bar track
  ["background: rgba(255,255,255,0.12); border-radius: 2px;",
   "background: var(--color-border); border-radius: 2px;"],

  // Section labels
  ["color: rgba(255,255,255,0.3); padding: var(--space-md)",
   "color: var(--color-text-tertiary); padding: var(--space-md)"],

  // Nav items
  ["color: rgba(255,255,255,0.6); font-size: 14px;",
   "color: var(--color-text-secondary); font-size: 14px;"],

  // Nav hover
  [".nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }",
   ".nav-item:hover { background: var(--color-surface-alt); color: var(--color-text); }"],

  // Nav active
  [".nav-item.active { background: rgba(255,255,255,0.1); color: #fff; font-weight: 500; }",
   ".nav-item.active { background: var(--color-primary-light); color: var(--color-primary); font-weight: 500; border-left: 3px solid var(--color-primary); }"],

  // Nav locked
  [".nav-item.locked { opacity: 0.35; cursor: default; }",
   ".nav-item.locked { opacity: 0.4; cursor: default; }"],
  [".nav-item.locked:hover { background: none; color: rgba(255,255,255,0.35); }",
   ".nav-item.locked:hover { background: none; color: var(--color-text-tertiary); }"],

  // Score section
  ["border-top: 1px solid rgba(255,255,255,0.08);",
   "border-top: 1px solid var(--color-border);"],

  // Score label
  ["color: rgba(255,255,255,0.4); margin-bottom: var(--space-sm);",
   "color: var(--color-text-tertiary); margin-bottom: var(--space-sm);"],

  // Score value
  [".sidebar-score-value { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: #fff;",
   ".sidebar-score-value { font-family: var(--font-display); font-size: 28px; font-weight: 700; color: var(--color-text);"],

  // Score sub
  ["color: rgba(255,255,255,0.3); font-weight: 400;",
   "color: var(--color-text-tertiary); font-weight: 400;"],

  // Score desc
  [".sidebar-score-desc { font-size: 12px; color: rgba(255,255,255,0.4);",
   ".sidebar-score-desc { font-size: 12px; color: var(--color-text-secondary);"],

  // Footer
  ["border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: rgba(255,255,255,0.3);",
   "border-top: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-tertiary);"],
]

// ── Embedded Mode Script ───────────────────────────────────────────────
// Injected before </body> in each playbook. When loaded with ?embedded=true,
// hides the playbook's own sidebar/header and communicates via postMessage.

const EMBEDDED_SCRIPT = `
<script>
(function() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('embedded') === 'true') {
    // Hide playbook's own chrome
    var sidebar = document.querySelector('.sidebar');
    var overlay = document.querySelector('.sidebar-overlay');
    var mobileHeader = document.querySelector('.mobile-header');
    var mainContent = document.querySelector('.main-content');
    if (sidebar) sidebar.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (mobileHeader) mobileHeader.style.display = 'none';
    if (mainContent) {
      mainContent.style.marginLeft = '0';
      mainContent.style.minHeight = 'auto';
    }

    // Navigate to specific section if requested
    var section = params.get('section');
    if (section !== null) {
      var sectionIndex = parseInt(section, 10);
      if (typeof navigateToSection === 'function') {
        setTimeout(function() { navigateToSection(sectionIndex); }, 100);
      }
    }

    // Forward score updates to parent
    var origDispatch = window.dispatchEvent.bind(window);
    window.addEventListener('playbook:score-update', function(e) {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'playbook:score-update',
          detail: e.detail
        }, '*');
      }
    });

    // Forward section changes to parent
    window.addEventListener('playbook:section-change', function(e) {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'playbook:section-change',
          detail: e.detail
        }, '*');
      }
    });

    // Listen for commands from parent
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'navigate-section') {
        if (typeof navigateToSection === 'function') {
          navigateToSection(e.data.sectionIndex);
        }
      }
    });
  }
})();
</script>`

// ── Main Processing ────────────────────────────────────────────────────

function reskinPlaybook(html) {
  let result = html

  // 1. Apply :root token replacements (spaced format)
  for (const [from, to] of Object.entries(ROOT_TOKEN_MAP)) {
    result = result.split(from).join(to)
  }

  // 2. Apply :root token replacements (minified format)
  for (const [from, to] of Object.entries(MINIFIED_TOKEN_MAP)) {
    result = result.split(from).join(to)
  }

  // 3. Apply sidebar CSS replacements
  for (const [from, to] of SIDEBAR_REPLACEMENTS) {
    result = result.split(from).join(to)
  }

  // 4. Apply hardcoded color replacements
  for (const [from, to] of HARDCODED_COLORS) {
    result = result.split(from).join(to)
  }

  // 5. Inject embedded mode script before </body>
  if (!result.includes("params.get('embedded')")) {
    result = result.replace('</body>', EMBEDDED_SCRIPT + '\n</body>')
  }

  return result
}

function main() {
  // Find all playbook HTML files
  const sourceFiles = fs.readdirSync(SOURCE_DIR)
    .filter(f => f.startsWith('Playbook-') && f.endsWith('.html'))
    .sort()

  if (sourceFiles.length === 0) {
    console.error('No playbook files found in', SOURCE_DIR)
    process.exit(1)
  }

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log(`Processing ${sourceFiles.length} playbooks...`)
  console.log(`Source: ${SOURCE_DIR}`)
  console.log(`Output: ${OUTPUT_DIR}\n`)

  let processed = 0
  const issues = []

  for (const filename of sourceFiles) {
    const sourcePath = path.join(SOURCE_DIR, filename)
    const html = fs.readFileSync(sourcePath, 'utf8')

    // Extract slug from filename: Playbook-01-... → pb-01
    const match = filename.match(/Playbook-(\d+)/)
    if (!match) {
      issues.push(`Could not extract slug from: ${filename}`)
      continue
    }
    const slug = `pb-${match[1].padStart(2, '0')}`

    // Reskin
    const reskinned = reskinPlaybook(html)

    // Write output as slug.html (e.g., pb-01.html)
    const outPath = path.join(OUTPUT_DIR, `${slug}.html`)
    fs.writeFileSync(outPath, reskinned, 'utf8')

    // Verify no old colors remain
    const oldColors = ['#2D5A3D', '#234A31', '#E8F0EB', '#1A1917', '#6B6860', '#FAFAF9', '#E8E5E0']
    const remaining = oldColors.filter(c => reskinned.includes(c))
    if (remaining.length > 0) {
      // Check if it's just in the embedded script or comments
      const actualRemaining = remaining.filter(c => {
        const idx = reskinned.indexOf(c)
        const context = reskinned.substring(Math.max(0, idx - 50), idx + c.length + 50)
        return !context.includes('<!--') && !context.includes('embedded')
      })
      if (actualRemaining.length > 0) {
        issues.push(`${slug}: Old colors still present: ${actualRemaining.join(', ')}`)
      }
    }

    processed++
    process.stdout.write(`  ${slug} (${filename.substring(0, 50)}...) ✓\n`)
  }

  console.log(`\n${processed}/${sourceFiles.length} playbooks processed.`)

  if (issues.length > 0) {
    console.log(`\n⚠ Issues (${issues.length}):`)
    issues.forEach(i => console.log(`  - ${i}`))
  } else {
    console.log('\nAll playbooks reskinned cleanly.')
  }
}

main()
