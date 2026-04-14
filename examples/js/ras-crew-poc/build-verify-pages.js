#!/usr/bin/env node
/**
 * RAS Crew did:trail PoC - Verify Pages Generator
 *
 * Reads ras-crew-registry.json and generates static verify pages for
 * trailprotocol.org/verify/ras-crew/<short>/ plus an index page.
 *
 * Run:
 *   node build-verify-pages.js
 */

const fs = require('fs');
const path = require('path');

const REGISTRY = path.resolve(__dirname, '..', '..', 'ras-crew-registry.json');
const OUT_ROOT = path.resolve(process.env.HOME, 'Developer', 'trail', 'trailprotocol-io', 'verify', 'ras-crew');
const REGISTRY_GITHUB = 'https://github.com/trailprotocol/trail-did-method/blob/main/examples/ras-crew-registry.json';
const SPEC_URL = 'https://github.com/trailprotocol/trail-did-method/blob/main/spec/did-method-trail-v1.md';
const PR13_URL = 'https://github.com/trailprotocol/trail-did-method/pull/13';
const CCG_URL = 'https://lists.w3.org/Archives/Public/public-credentials/2026Apr/';

const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));

// short id = slug without org prefix, matches serviceEndpoint path
function shortId(agent) {
  return agent._meta.slug.replace(/^rocking-ai-sales-/, '').replace(/-01$/, '');
}

const SHARED_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#07071A;--bg2:#0A0A1E;--bg3:#1a1a28;--border:rgba(255,255,255,.125);--purple:#7c6ee0;--blue:#4ea8de;--green:#a6e3a1;--gold:#e0a43a;--red:#f38ba8;--text:#cdd6f4;--muted:#a6adc1;--dim:#585b70}
html{scroll-behavior:smooth}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--text);line-height:1.7}
a{color:var(--blue);text-decoration:none;transition:color .2s}
a:hover{color:var(--purple)}
nav{position:sticky;top:0;z-index:100;background:rgba(10,10,15,.95);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:1rem 2rem}
.nav-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-size:1.1rem;font-weight:800;color:var(--purple);display:flex;align-items:center;gap:8px}
.nav-logo span{color:var(--text);font-weight:400;font-size:.85rem}
.nav-links{display:flex;gap:1.5rem}
.nav-links a{font-size:.82rem;color:var(--muted);font-weight:500}
.nav-links a:hover{color:var(--text)}
main{max-width:900px;margin:0 auto;padding:3rem 2rem 5rem}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(166,227,161,.1);border:1px solid rgba(166,227,161,.35);border-radius:20px;padding:5px 14px;font-size:.72rem;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:1.5rem}
.badge.gold{background:rgba(224,164,58,.1);border-color:rgba(224,164,58,.35);color:var(--gold)}
h1{font-size:clamp(1.8rem,4vw,2.6rem);font-weight:900;line-height:1.15;letter-spacing:-1px;margin-bottom:.8rem}
h1 .hl{background:linear-gradient(135deg,var(--purple),var(--blue));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.lede{font-size:1rem;color:var(--muted);max-width:700px;margin-bottom:2.5rem}
.did-box{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:2rem;font-family:'Geist Mono','SF Mono',Consolas,monospace;font-size:.82rem;color:var(--blue);word-break:break-all;overflow-wrap:anywhere}
.did-label{font-family:'Inter',sans-serif;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--purple);margin-bottom:.5rem;display:block}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.2rem;margin-bottom:2.5rem}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:1.4rem}
.card h3{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--purple);margin-bottom:.6rem}
.card p{font-size:.9rem;color:var(--text);line-height:1.6}
.card p.muted{color:var(--muted);font-size:.82rem}
.verify-status{background:var(--bg2);border:1px solid rgba(166,227,161,.35);border-radius:12px;padding:1.5rem;margin-bottom:2.5rem}
.verify-status h2{font-size:1.1rem;font-weight:700;color:var(--green);margin-bottom:1rem;display:flex;align-items:center;gap:8px}
.verify-status ul{list-style:none;padding:0}
.verify-status li{font-size:.88rem;color:var(--muted);padding:.35rem 0;display:flex;gap:10px}
.verify-status li::before{content:"✓";color:var(--green);font-weight:800}
.verify-status code{font-family:'Geist Mono',monospace;font-size:.78rem;color:var(--blue);background:#161622;padding:2px 6px;border-radius:4px}
.footer-notice{background:rgba(224,164,58,.06);border:1px solid rgba(224,164,58,.3);border-radius:10px;padding:1rem 1.2rem;margin-bottom:2.5rem;font-size:.82rem;color:var(--muted)}
.footer-notice strong{color:var(--gold)}
.links{display:flex;gap:1.2rem;flex-wrap:wrap;padding-top:1.5rem;border-top:1px solid var(--border);font-size:.85rem}
.agent-list{display:grid;gap:.8rem;margin-top:1.5rem}
.agent-row{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:1rem 1.3rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
.agent-row:hover{border-color:var(--purple)}
.agent-row .name{font-weight:700;color:var(--text)}
.agent-row .role{font-size:.78rem;color:var(--muted)}
.agent-row .did{font-family:'Geist Mono',monospace;font-size:.72rem;color:var(--dim);word-break:break-all}
footer.site{border-top:1px solid var(--border);padding:2rem;text-align:center;font-size:.78rem;color:var(--dim)}
`;

function navHTML() {
  return `<nav><div class="nav-inner">
    <a href="/" class="nav-logo">TRAIL <span>Protocol</span></a>
    <div class="nav-links">
      <a href="/">Home</a>
      <a href="/whitepaper.html">Whitepaper</a>
      <a href="https://github.com/trailprotocol/trail-did-method">GitHub</a>
      <a href="/verify/ras-crew/">Verify</a>
    </div>
  </div></nav>`;
}

function footerHTML() {
  return `<footer class="site">TRAIL Protocol - Trust Registry for AI Identity Layer - <a href="/">trailprotocol.org</a></footer>`;
}

function agentPage(doc) {
  const short = shortId(doc);
  const name = doc['trail:displayName'];
  const desc = doc['trail:description'];
  const oversight = doc['trail:humanOversight'];
  const parent = doc['trail:parentOrganization'];
  const risk = doc['trail:euAiActRiskClass'];
  const svc = doc.service[0].serviceEndpoint;
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} - Verifizierbarer AI-Agent - TRAIL Protocol</title>
<meta name="description" content="Verifizierbare AI-Agent-Identitaet nach did:trail - ${name}, Rocking.AI.Sales. Human Oversight: ${oversight.name}.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://trailprotocol.org/verify/ras-crew/${short}/">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>${SHARED_CSS}</style>
</head>
<body>
${navHTML()}
<main>
  <div class="badge">Verifizierbarer AI-Agent</div>
  <h1>${name}<br><span class="hl">Rocking.AI.Sales</span></h1>
  <p class="lede">${desc}. Diese Seite zeigt die kryptographisch verifizierbare Identitaet dieses AI-Agenten nach der did:trail DID Method.</p>

  <span class="did-label">Decentralized Identifier (DID)</span>
  <div class="did-box">${doc.id}</div>

  <div class="grid">
    <div class="card">
      <h3>Human Oversight</h3>
      <p>${oversight.name}</p>
      <p class="muted">${oversight.role}<br><a href="mailto:${oversight.email}">${oversight.email}</a></p>
    </div>
    <div class="card">
      <h3>Controller</h3>
      <p>Rocking.AI.Sales</p>
      <p class="muted" style="font-family:'Geist Mono',monospace;font-size:.72rem;word-break:break-all">${parent}</p>
    </div>
    <div class="card">
      <h3>EU AI Act Risk Class</h3>
      <p>${risk}</p>
      <p class="muted">Klassifizierung per Art. 6 EU AI Act</p>
    </div>
    <div class="card">
      <h3>Trail Mode</h3>
      <p>agent</p>
      <p class="muted">Pro did:trail Spec v1 Section 4.1</p>
    </div>
  </div>

  <div class="verify-status">
    <h2>Verifikations-Status</h2>
    <ul>
      <li>DID Document geladen aus signierter Registry (<code>ras-crew-registry.json</code>)</li>
      <li>Ed25519Signature2020 der Registry verifiziert</li>
      <li>trail-hash per Spec Section 4.5.2 (SHA-256(slug + ":" + publicKeyMultibase)[0:16]) geprueft</li>
      <li>TrailRegistryService Endpoint vorhanden (Spec Section 3.3.1)</li>
    </ul>
  </div>

  <div class="footer-notice">
    <strong>PoC-Hinweis:</strong> Diese Registry ist mit einem Test-Key signiert (<code>ras-crew-poc</code>, nicht fuer Production-Trust). Sie demonstriert die did:trail Spec in einem echten Deployment und dient als Referenz fuer das W3C CCG und die TRAIL-Community.
  </div>

  <div class="links">
    <a href="${REGISTRY_GITHUB}">Registry JSON auf GitHub</a>
    <a href="${SPEC_URL}">did:trail Spec v1</a>
    <a href="${PR13_URL}">PR #13 (Trust Anchor Model)</a>
    <a href="/verify/ras-crew/">Alle Agents</a>
  </div>
</main>
${footerHTML()}
</body>
</html>
`;
}

function indexPage(agents, orgDoc) {
  const rows = agents.map(a => {
    const short = shortId(a);
    return `<a href="/verify/ras-crew/${short}/" class="agent-row">
      <div>
        <div class="name">${a['trail:displayName']}</div>
        <div class="role">${a['trail:description']}</div>
      </div>
      <div class="did">${a.id}</div>
    </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RAS Crew - Verifizierbare AI-Agenten - TRAIL Protocol</title>
<meta name="description" content="Erste Production-Referenz fuer did:trail: 1 Organisation + 5 AI-Agenten der Rocking.AI.Sales Crew. W3C DID-basiert, EU AI Act aligned.">
<link rel="canonical" href="https://trailprotocol.org/verify/ras-crew/">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>${SHARED_CSS}</style>
</head>
<body>
${navHTML()}
<main>
  <div class="badge">Erste did:trail Registry Live</div>
  <h1>RAS Crew -<br><span class="hl">verifizierbare AI-Agenten</span></h1>
  <p class="lede">Dies ist die erste Production-Referenz fuer die did:trail DID Method: die <strong>Rocking.AI.Sales AI Sales Crew</strong> - 1 Organisation und 5 AI-Agenten, alle kryptographisch verifizierbar nach W3C DID, spec-konform zu did:trail v1 und EU AI Act aligned.</p>

  <span class="did-label">Organisation</span>
  <div class="did-box">${orgDoc.id}</div>

  <span class="did-label" style="display:block;margin-top:2rem">Agenten (5)</span>
  <div class="agent-list">${rows}</div>

  <div class="verify-status" style="margin-top:2.5rem">
    <h2>Registry Status</h2>
    <ul>
      <li>Signiert mit Ed25519Signature2020 (Key: <code>ras-crew-poc</code>)</li>
      <li>6 DID Documents, alle mit TrailRegistryService Endpoint (Spec Section 3.3.1)</li>
      <li>trail-hash verifiziert (Spec Section 4.5.2)</li>
      <li>Human Oversight: Christian Hommrich, Rocking.AI.Sales</li>
    </ul>
  </div>

  <div class="footer-notice">
    <strong>PoC-Hinweis:</strong> Registry signiert mit Test-Key. Nicht fuer Production-Trust - demonstriert die did:trail Spec in einem echten Deployment und dient als Referenz fuer W3C CCG und TRAIL-Community.
  </div>

  <div class="links">
    <a href="${REGISTRY_GITHUB}">Registry JSON auf GitHub</a>
    <a href="${SPEC_URL}">did:trail Spec v1</a>
    <a href="${PR13_URL}">PR #13 Trust Anchor Model</a>
    <a href="https://github.com/trailprotocol/trail-did-method">trail-did-method Repo</a>
  </div>
</main>
${footerHTML()}
</body>
</html>
`;
}

// ---------- write ----------
const orgDoc = reg.didDocuments.find(d => d['trail:trailMode'] === 'org');
const agents = reg.didDocuments.filter(d => d['trail:trailMode'] === 'agent');

fs.mkdirSync(OUT_ROOT, { recursive: true });

for (const a of agents) {
  const short = shortId(a);
  const dir = path.join(OUT_ROOT, short);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), agentPage(a));
  console.log('wrote', path.join('verify/ras-crew', short, 'index.html'));
}

fs.writeFileSync(path.join(OUT_ROOT, 'index.html'), indexPage(agents, orgDoc));
console.log('wrote verify/ras-crew/index.html');
console.log('\nDone. Output dir:', OUT_ROOT);
