#!/usr/bin/env node
/**
 * RAS Crew did:trail PoC - Local Resolver
 *
 * Resolves did:trail identifiers from the local ras-crew-registry.json,
 * verifies the registry's ed25519 proof, and returns the matching DID Document.
 *
 * Usage:
 *   node resolve-ras-crew.js did:trail:agent:rocking-ai-sales-recherche-01-<hash>
 *   node resolve-ras-crew.js --list
 *   node resolve-ras-crew.js --test   (runs positive + negative tests)
 *
 * Spec refs:
 *  - §3   Resolution: resolver returns DID Document + metadata
 *  - §3.3.1 Registry Discovery: TrailRegistryService endpoint REQUIRED
 *  - §4.5.2 trail-hash verification
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.resolve(__dirname, '..', 'ras-crew-registry.json');

// ---------- base58btc decode (for multibase z-prefix) ----------
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58btcDecode(str) {
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = ALPHABET.indexOf(str[i]);
    if (c < 0) throw new Error('Invalid base58btc char: ' + str[i]);
    let carry = c;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (let k = 0; k < str.length && str[k] === '1'; k++) bytes.push(0);
  return Buffer.from(bytes.reverse());
}

function multibaseToRawEd25519(mb) {
  if (!mb.startsWith('z')) throw new Error('Not a base58btc multibase value: ' + mb);
  const decoded = base58btcDecode(mb.slice(1));
  if (decoded[0] !== 0xed || decoded[1] !== 0x01) {
    throw new Error('Not an Ed25519 multibase key (expected 0xed01 prefix)');
  }
  return decoded.slice(2);
}

function rawEd25519ToSpkiPem(raw32) {
  // SPKI prefix for Ed25519: 302a300506032b6570032100
  const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw32]);
  const b64 = spki.toString('base64').match(/.{1,64}/g).join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----\n`;
}

// ---------- canonical JSON (must match build-registry.js) ----------
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}

// ---------- trail-hash per §4.5.2 ----------
function trailHash(slug, publicKeyMultibase) {
  return crypto.createHash('sha256').update(slug + ':' + publicKeyMultibase).digest('hex').slice(0, 16);
}

// ---------- load + verify registry ----------
function loadRegistry(registryJsonOrPath) {
  const raw = typeof registryJsonOrPath === 'string'
    ? JSON.parse(fs.readFileSync(registryJsonOrPath, 'utf8'))
    : registryJsonOrPath;
  return raw;
}

function verifyRegistryProof(registry) {
  const { proof, ...body } = registry;
  if (!proof) throw new Error('Registry has no proof');
  if (proof.verificationMethod !== registry.signingKey.id) {
    throw new Error(`Proof references unknown signing key: ${proof.verificationMethod}`);
  }
  const pubRaw = multibaseToRawEd25519(registry.signingKey.publicKeyMultibase);
  const pubKey = crypto.createPublicKey({ key: rawEd25519ToSpkiPem(pubRaw), format: 'pem' });
  const canonical = canonicalize(body);
  const sig = base58btcDecode(proof.proofValue.slice(1));
  const ok = crypto.verify(null, Buffer.from(canonical), pubKey, sig);
  if (!ok) throw new Error('Registry signature verification FAILED');
  return true;
}

// ---------- resolve ----------
function resolve(did, registryPath = REGISTRY_PATH) {
  const registry = loadRegistry(registryPath);
  verifyRegistryProof(registry);
  const doc = registry.didDocuments.find(d => d.id === did);
  if (!doc) {
    return {
      didDocument: null,
      didResolutionMetadata: { error: 'notFound', contentType: 'application/did+ld+json' },
      didDocumentMetadata: {},
    };
  }
  // Verify trail-hash matches slug + key (§4.5.2)
  const slug = doc._meta?.slug || doc.id.split(':').slice(3).join(':').replace(/-[0-9a-f]{16}$/, '');
  const expectedHash = trailHash(slug, registry.signingKey.publicKeyMultibase);
  const actualHash = doc.id.slice(-16);
  if (expectedHash !== actualHash) {
    throw new Error(`trail-hash mismatch for ${did}: expected ${expectedHash}, got ${actualHash}`);
  }
  return {
    didDocument: doc,
    didResolutionMetadata: {
      contentType: 'application/did+ld+json',
      registrySource: 'local:ras-crew-registry.json',
      registryVerified: true,
      trailHashVerified: true,
    },
    didDocumentMetadata: { trailMode: doc['trail:trailMode'] },
  };
}

// ---------- CLI ----------
const arg = process.argv[2];
if (!arg || arg === '--help' || arg === '-h') {
  console.log('Usage:');
  console.log('  resolve-ras-crew.js <did:trail:...>');
  console.log('  resolve-ras-crew.js --list');
  console.log('  resolve-ras-crew.js --test');
  process.exit(arg ? 0 : 1);
}

if (arg === '--list') {
  const reg = loadRegistry(REGISTRY_PATH);
  verifyRegistryProof(reg);
  console.log('Registry verified. Contents:');
  reg.didDocuments.forEach(d => {
    const tag = d['trail:trailMode'] === 'org' ? '[ORG]  ' : '[AGENT]';
    console.log(`  ${tag} ${d.id}${d['trail:displayName'] ? ' · ' + d['trail:displayName'] : ''}`);
  });
  process.exit(0);
}

if (arg === '--test') {
  let pass = 0, fail = 0;
  const reg = loadRegistry(REGISTRY_PATH);

  // Test 1: valid signature
  try {
    verifyRegistryProof(reg);
    console.log('PASS  registry signature verifies');
    pass++;
  } catch (e) {
    console.log('FAIL  registry signature:', e.message);
    fail++;
  }

  // Test 2: resolve all 6 DIDs
  for (const d of reg.didDocuments) {
    try {
      const r = resolve(d.id);
      if (r.didDocument?.id === d.id) {
        console.log(`PASS  resolve ${d.id.slice(0, 50)}...`);
        pass++;
      } else {
        console.log(`FAIL  resolve ${d.id}: not found`);
        fail++;
      }
    } catch (e) {
      console.log(`FAIL  resolve ${d.id}: ${e.message}`);
      fail++;
    }
  }

  // Test 3: unknown DID returns notFound
  const bogus = resolve('did:trail:agent:does-not-exist-0000000000000000');
  if (bogus.didResolutionMetadata.error === 'notFound') {
    console.log('PASS  unknown DID returns notFound');
    pass++;
  } else {
    console.log('FAIL  unknown DID should return notFound');
    fail++;
  }

  // Test 4: tampered registry fails verification
  try {
    const tampered = JSON.parse(JSON.stringify(reg));
    tampered.didDocuments[0]['trail:displayName'] = 'TAMPERED';
    verifyRegistryProof(tampered);
    console.log('FAIL  tampered registry should NOT verify');
    fail++;
  } catch (e) {
    console.log('PASS  tampered registry rejected:', e.message);
    pass++;
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

// Resolve single DID
try {
  const result = resolve(arg);
  if (!result.didDocument) {
    console.error('Not found:', arg);
    process.exit(2);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error('Resolution failed:', e.message);
  process.exit(1);
}
