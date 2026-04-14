#!/usr/bin/env node
/**
 * RAS Crew did:trail PoC - Registry Builder
 *
 * Generates one ed25519 keypair, computes spec-conformant did:trail identifiers
 * for 1 org (Rocking.AI.Sales) + 5 agents (AI Sales Crew), writes a signed
 * registry JSON and exports the public key.
 *
 * Spec refs:
 *  - §4.1  ABNF: only self/org/agent modes allowed
 *  - §4.5.1 slug normalization + agent slug = <org-slug>-<role>-<instance>
 *  - §4.5.2 trail-hash = SHA-256(slug + ":" + publicKeyMultibase)[0:16]
 *  - §3.3.1 TrailRegistryService endpoint REQUIRED
 *
 * Run:
 *   node build-registry.js
 *
 * Outputs:
 *   ../../ras-crew-registry.json        (registry with 6 DID Documents + proof)
 *   ../../keys/ras-crew-poc.pub         (public key: multibase + JWK)
 *   ~/.config/ras-crew-poc-signing.json (PRIVATE key - outside repo, never commit)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ---------- base58btc (for multibase z-prefix) ----------
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58btcEncode(bytes) {
  if (bytes.length === 0) return '';
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let zeros = 0;
  for (let k = 0; k < bytes.length && bytes[k] === 0; k++) zeros++;
  return '1'.repeat(zeros) + digits.reverse().map(d => ALPHABET[d]).join('');
}

// Multibase Ed25519 public key: 0xed01 prefix + 32-byte raw key, base58btc, 'z' prefix
function ed25519ToMultibase(raw32) {
  const prefixed = Buffer.concat([Buffer.from([0xed, 0x01]), raw32]);
  return 'z' + base58btcEncode(prefixed);
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
}

// ---------- trail-hash per §4.5.2 ----------
function trailHash(slug, publicKeyMultibase) {
  return crypto.createHash('sha256').update(slug + ':' + publicKeyMultibase).digest('hex').slice(0, 16);
}

// ---------- canonical JSON (RFC 8785 subset: sorted keys, no whitespace) ----------
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

// ---------- main ----------
const ORG_SLUG = 'rocking-ai-sales';
const AGENTS = [
  { slug: 'rocking-ai-sales-recherche-01',      name: 'Recherche-Agent',        role: 'Research / ICP scoring' },
  { slug: 'rocking-ai-sales-erstkontakt-01',    name: 'Erstkontakt-Agent',      role: 'Outreach drafting' },
  { slug: 'rocking-ai-sales-qualifizierung-01', name: 'Qualifizierungs-Agent',  role: 'PRISM qualification' },
  { slug: 'rocking-ai-sales-vorbereitung-01',   name: 'Vorbereitungs-Agent',    role: 'Meeting prep' },
  { slug: 'rocking-ai-sales-nachfass-01',       name: 'Nachfass-Agent',         role: 'Follow-up / action items' },
];

// Generate ONE ed25519 keypair (PoC: all 6 DIDs share the same key)
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = publicKey.export({ format: 'der', type: 'spki' }).slice(-32);
const rawPriv = privateKey.export({ format: 'der', type: 'pkcs8' }).slice(-32);
const pubMultibase = ed25519ToMultibase(rawPub);
const pubJwk = { kty: 'OKP', crv: 'Ed25519', x: base64url(rawPub) };

// Compute DIDs
const orgHash = trailHash(ORG_SLUG, pubMultibase);
const orgDid = `did:trail:org:${ORG_SLUG}-${orgHash}`;

const agentDocs = AGENTS.map(a => {
  const h = trailHash(a.slug, pubMultibase);
  const did = `did:trail:agent:${a.slug}-${h}`;
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://trailprotocol.org/ns/did/v1',
    ],
    id: did,
    controller: orgDid,
    'trail:trailMode': 'agent',
    'trail:aiSystemType': 'agent',
    'trail:euAiActRiskClass': 'minimal',
    'trail:parentOrganization': orgDid,
    'trail:displayName': a.name,
    'trail:description': `Rocking.AI.Sales Crew - ${a.role}`,
    'trail:humanOversight': {
      name: 'Christian Hommrich',
      email: 'christian.hommrich@rockingaisales.de',
      role: 'Founder / Operator',
    },
    verificationMethod: [{
      id: `${did}#key-1`,
      type: 'JsonWebKey2020',
      controller: did,
      publicKeyJwk: pubJwk,
    }],
    authentication: [`${did}#key-1`],
    assertionMethod: [`${did}#key-1`],
    service: [{
      id: `${did}#trail-registry`,
      type: 'TrailRegistryService',
      serviceEndpoint: `https://trailprotocol.org/verify/ras-crew/${a.slug.replace(/^rocking-ai-sales-/, '')}/`,
    }],
    _meta: { slug: a.slug, displayName: a.name },
  };
});

const orgDoc = {
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://trailprotocol.org/ns/did/v1',
  ],
  id: orgDid,
  controller: orgDid,
  'trail:trailMode': 'org',
  'trail:displayName': 'Rocking.AI.Sales',
  'trail:legalName': 'Rocking.AI.Sales (pre-incorporation, Christian Hommrich)',
  'trail:jurisdiction': 'DE',
  verificationMethod: [{
    id: `${orgDid}#key-1`,
    type: 'JsonWebKey2020',
    controller: orgDid,
    publicKeyJwk: pubJwk,
  }],
  authentication: [`${orgDid}#key-1`],
  assertionMethod: [`${orgDid}#key-1`],
  service: [{
    id: `${orgDid}#trail-registry`,
    type: 'TrailRegistryService',
    serviceEndpoint: 'https://trailprotocol.org/verify/ras-crew/',
  }],
};

// Registry body (without proof)
const body = {
  '@context': 'https://trailprotocol.org/ns/registry/v1',
  name: 'RAS Crew PoC Registry',
  description: 'First production reference for did:trail - the Rocking.AI.Sales AI Sales Crew (1 org + 5 agents).',
  version: '0.1.0',
  created: new Date().toISOString(),
  notice: 'POC-KEY-NOT-FOR-PRODUCTION. All identifiers in this registry are signed with a single ed25519 test key. Do not trust for real transactions.',
  signingKey: {
    id: 'ras-crew-poc',
    type: 'Ed25519VerificationKey2020',
    publicKeyMultibase: pubMultibase,
    publicKeyJwk: pubJwk,
  },
  didDocuments: [orgDoc, ...agentDocs],
};

// Sign canonical body with the same ed25519 key
const canonical = canonicalize(body);
const sig = crypto.sign(null, Buffer.from(canonical), privateKey);
const proof = {
  type: 'Ed25519Signature2020',
  created: new Date().toISOString(),
  verificationMethod: 'ras-crew-poc',
  proofPurpose: 'assertionMethod',
  proofValue: 'z' + base58btcEncode(sig),
};

const registry = { ...body, proof };

// ---------- write files ----------
const repoRoot = path.resolve(__dirname, '..', '..', '..'); // trail-did-method/
const examplesDir = path.join(repoRoot, 'examples');
const registryPath = path.join(examplesDir, 'ras-crew-registry.json');
const pubKeyPath = path.join(examplesDir, 'keys', 'ras-crew-poc.pub');
const privKeyPath = path.join(os.homedir(), '.config', 'ras-crew-poc-signing.json');

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');

fs.writeFileSync(pubKeyPath, JSON.stringify({
  id: 'ras-crew-poc',
  type: 'Ed25519VerificationKey2020',
  note: 'POC-KEY-NOT-FOR-PRODUCTION - RAS Crew did:trail PoC registry signing key',
  created: new Date().toISOString().slice(0, 10),
  publicKeyMultibase: pubMultibase,
  publicKeyJwk: pubJwk,
}, null, 2) + '\n');

fs.mkdirSync(path.dirname(privKeyPath), { recursive: true });
fs.writeFileSync(privKeyPath, JSON.stringify({
  id: 'ras-crew-poc',
  note: 'PRIVATE KEY - NEVER COMMIT. Move to macOS Keychain (entry: ras-crew-poc-signing) when convenient.',
  created: new Date().toISOString().slice(0, 10),
  privateKeyPem: privateKey.export({ format: 'pem', type: 'pkcs8' }),
  publicKeyMultibase: pubMultibase,
}, null, 2) + '\n', { mode: 0o600 });

console.log('=== RAS Crew PoC Registry built ===');
console.log('Org DID:', orgDid);
agentDocs.forEach(d => console.log('Agent:  ', d.id, '·', d._meta.displayName));
console.log();
console.log('Registry: ', registryPath);
console.log('Pub key:  ', pubKeyPath);
console.log('Priv key: ', privKeyPath, '(gitignored, move to Keychain)');
console.log('Proof:    ', proof.proofValue.slice(0, 40) + '...');
