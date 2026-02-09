import { NextRequest, NextResponse } from 'next/server'

/**
 * TEMPORARY DIAGNOSTIC ENDPOINT
 * Returns a zero-JS HTML page with all request information.
 * Works even if React/Next.js client code is completely broken.
 *
 * Visit: /api/diag from iPhone to see what the server sees.
 * Remove after debugging is complete.
 */
export async function GET(request: NextRequest) {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  const cookies = request.cookies.getAll().map(c => ({
    name: c.name,
    value: c.value.substring(0, 50) + (c.value.length > 50 ? '...' : ''),
  }))

  const url = new URL(request.url)

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Exit OSx Diagnostics</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; font-size: 14px; }
    h1 { font-size: 18px; }
    h2 { font-size: 15px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 4px 8px; border: 1px solid #ddd; text-align: left; word-break: break-all; font-size: 12px; }
    th { background: #f5f5f5; width: 30%; }
    .ok { color: green; }
    .warn { color: orange; }
    .err { color: red; }
    #js-test { color: red; }
    #fetch-test { color: gray; }
    pre { background: #f5f5f5; padding: 8px; overflow-x: auto; font-size: 11px; }
  </style>
</head>
<body>
  <h1>Exit OSx - iPhone Diagnostics</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <h2>1. JavaScript Test</h2>
  <p id="js-test">JS NOT WORKING - if you see this in red, JavaScript failed to execute</p>
  <script>
    document.getElementById('js-test').textContent = 'JS is working';
    document.getElementById('js-test').style.color = 'green';
  </script>

  <h2>2. Request Info</h2>
  <table>
    <tr><th>URL</th><td>${url.toString()}</td></tr>
    <tr><th>Hostname</th><td>${url.hostname}</td></tr>
    <tr><th>Pathname</th><td>${url.pathname}</td></tr>
    <tr><th>Protocol</th><td>${url.protocol}</td></tr>
    <tr><th>Method</th><td>${request.method}</td></tr>
  </table>

  <h2>3. Headers</h2>
  <table>
    ${Object.entries(headers).map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('\n    ')}
  </table>

  <h2>4. Cookies (${cookies.length})</h2>
  ${cookies.length === 0 ? '<p>No cookies</p>' : `<table>
    ${cookies.map(c => `<tr><th>${escapeHtml(c.name)}</th><td>${escapeHtml(c.value)}</td></tr>`).join('\n    ')}
  </table>`}

  <h2>5. Fetch Test - /api/health</h2>
  <p id="fetch-test">Testing fetch to /api/health...</p>
  <script>
    (async function() {
      var el = document.getElementById('fetch-test');
      try {
        var start = Date.now();
        var res = await fetch('/api/health');
        var ms = Date.now() - start;
        var text = await res.text();
        el.textContent = 'Fetch OK: ' + res.status + ' in ' + ms + 'ms - ' + text.substring(0, 100);
        el.style.color = res.ok ? 'green' : 'orange';
      } catch(e) {
        el.textContent = 'Fetch FAILED: ' + e.message;
        el.style.color = 'red';
      }
    })();
  </script>

  <h2>5b. Fetch Test - /api/companies (THE KEY TEST)</h2>
  <p id="companies-test">Testing fetch to /api/companies...</p>
  <pre id="companies-body" style="max-height:300px;overflow:auto;">waiting...</pre>
  <script>
    (async function() {
      var el = document.getElementById('companies-test');
      var bodyEl = document.getElementById('companies-body');
      try {
        var start = Date.now();
        var res = await fetch('/api/companies');
        var ms = Date.now() - start;
        var text = await res.text();
        el.textContent = '/api/companies: ' + res.status + ' ' + res.statusText + ' in ' + ms + 'ms';
        el.style.color = res.ok ? 'green' : 'red';
        try {
          bodyEl.textContent = JSON.stringify(JSON.parse(text), null, 2);
        } catch(e2) {
          bodyEl.textContent = text.substring(0, 2000);
        }
      } catch(e) {
        el.textContent = '/api/companies FAILED: ' + e.message;
        el.style.color = 'red';
        bodyEl.textContent = e.stack || e.message;
      }
    })();
  </script>

  <h2>6. Navigation Test Links</h2>
  <ul>
    <li><a href="/test">Minimal test page (/test)</a></li>
    <li><a href="/login">Login page (/login)</a></li>
    <li><a href="/api/health">Health check API (/api/health)</a></li>
  </ul>

  <h2>7. Client Info (JS-populated)</h2>
  <div id="client-info">Requires JavaScript...</div>
  <script>
    var ci = document.getElementById('client-info');
    ci.innerHTML = '<table>' +
      '<tr><th>User Agent</th><td>' + navigator.userAgent + '</td></tr>' +
      '<tr><th>Platform</th><td>' + navigator.platform + '</td></tr>' +
      '<tr><th>Cookies Enabled</th><td>' + navigator.cookieEnabled + '</td></tr>' +
      '<tr><th>Language</th><td>' + navigator.language + '</td></tr>' +
      '<tr><th>Screen</th><td>' + screen.width + 'x' + screen.height + ' @' + devicePixelRatio + 'x</td></tr>' +
      '<tr><th>localStorage</th><td>' + (function(){ try { localStorage.setItem('_diag','1'); localStorage.removeItem('_diag'); return 'OK'; } catch(e) { return 'BLOCKED: ' + e.message; } })() + '</td></tr>' +
      '<tr><th>Cookie Consent</th><td>' + (localStorage.getItem('exitosx-cookie-consent') || 'NOT SET') + '</td></tr>' +
      '</table>';
  </script>

  <h2>8. Console Errors</h2>
  <div id="console-errors" style="color: gray;">Capturing errors...</div>
  <script>
    var errors = [];
    window.onerror = function(msg, src, line, col, err) {
      errors.push(msg + ' at ' + src + ':' + line + ':' + col);
      document.getElementById('console-errors').innerHTML = errors.map(function(e) { return '<p style="color:red">' + e + '</p>'; }).join('');
    };
    window.addEventListener('unhandledrejection', function(e) {
      errors.push('Unhandled rejection: ' + e.reason);
      document.getElementById('console-errors').innerHTML = errors.map(function(e) { return '<p style="color:red">' + e + '</p>'; }).join('');
    });
    setTimeout(function() {
      if (errors.length === 0) {
        document.getElementById('console-errors').textContent = 'No errors captured (good)';
        document.getElementById('console-errors').style.color = 'green';
      }
    }, 3000);
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Override the restrictive API CSP so inline scripts work in this diagnostic page
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self';",
    },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
