import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { createHash, sign as nodeSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateKeyPair, createPrivateKeyObject } from '../src/keygen';
import { createSelfDid, createOrgDid, createAgentDid, parseTrailDid } from '../src/did';
import { createDidDocument, rotateKey, SPEC_VERSION } from '../src/document';
import { TrailResolver } from '../src/resolver';
import { createProof, verifyProof, isSupportedCryptosuite, DEFAULT_CRYPTOSUITE } from '../src/proof';
import { SUPPORTED_CRYPTOSUITES } from '../src/types';
import { createSelfSignedCredential, verifyCredential, createBindingProofCredential, verifyBindingProof } from '../src/credential';
import type { VerifyBindingProofInput } from '../src/credential';
import type { DidDocument, StatusList2021Entry, BindingProofCredential } from '../src/types';
import { encode, decode, encodeMultibase, decodeMultibase } from '../src/base58';
import { jcsCanonicalizeToString, jcsCanonicalizeToBuffer } from '../src/jcs';

function sha256Hex(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}

describe('JCS (RFC 8785)', () => {
  it('sorts object keys by UTF-16 code unit order', () => {
    const input = { z: 1, a: 2, m: 3 };
    assert.strictEqual(jcsCanonicalizeToString(input), '{"a":2,"m":3,"z":1}');
  });

  it('handles nested objects', () => {
    const input = { b: { d: 1, c: 2 }, a: 3 };
    assert.strictEqual(jcsCanonicalizeToString(input), '{"a":3,"b":{"c":2,"d":1}}');
  });

  it('handles arrays (preserves order)', () => {
    const input = [3, 1, 2];
    assert.strictEqual(jcsCanonicalizeToString(input), '[3,1,2]');
  });

  it('handles null and booleans', () => {
    assert.strictEqual(jcsCanonicalizeToString(null), 'null');
    assert.strictEqual(jcsCanonicalizeToString(true), 'true');
    assert.strictEqual(jcsCanonicalizeToString(false), 'false');
  });

  it('handles -0 as 0', () => {
    assert.strictEqual(jcsCanonicalizeToString(-0), '0');
  });

  it('escapes control characters in strings', () => {
    assert.strictEqual(jcsCanonicalizeToString('a\nb'), '"a\\nb"');
    assert.strictEqual(jcsCanonicalizeToString('a\tb'), '"a\\tb"');
  });

  it('skips undefined properties', () => {
    const input = { a: 1, b: undefined, c: 3 };
    assert.strictEqual(jcsCanonicalizeToString(input), '{"a":1,"c":3}');
  });

  it('rejects NaN and Infinity', () => {
    assert.throws(() => jcsCanonicalizeToString(NaN), /NaN/);
    assert.throws(() => jcsCanonicalizeToString(Infinity), /Infinity/);
  });

  it('matches spec §14.4 JCS canonicalization test vector', () => {
    const input = {
      id: 'did:trail:self:z3KMQXnVKR9qMzkJFfoo9WAYb1A7rdUbEkDCwNWTp6uJX',
      '@context': ['https://www.w3.org/ns/did/v1'],
    };
    const expectedJcs =
      '{"@context":["https://www.w3.org/ns/did/v1"],"id":"did:trail:self:z3KMQXnVKR9qMzkJFfoo9WAYb1A7rdUbEkDCwNWTp6uJX"}';
    assert.strictEqual(jcsCanonicalizeToString(input), expectedJcs);
    // §14.4 SHA-256 (hex) of the JCS output, as published in the spec.
    assert.strictEqual(
      sha256Hex(jcsCanonicalizeToBuffer(input)),
      '4c882a71d1796fabe2aa94748f6035c1e7581f984f3785291d403090b36ed208'
    );
  });

  it('matches spec §14.5 numeric canonicalization test vector', () => {
    const input = { 'trail:trailTrustTier': 0, threshold: 2 };
    const expectedJcs = '{"threshold":2,"trail:trailTrustTier":0}';
    assert.strictEqual(jcsCanonicalizeToString(input), expectedJcs);
    // §14.5 SHA-256 (hex) of the JCS output, as published in the spec.
    assert.strictEqual(
      sha256Hex(jcsCanonicalizeToBuffer(input)),
      'db373549d7bc7aafab4c890b8ef07bff9ef28bc85a21edbcde917c2095168af0'
    );
  });

  it('§14.5 verifier roundtrip conformance: canonicalize → parse → canonicalize is byte-identical', () => {
    const input = { 'trail:trailTrustTier': 0, threshold: 2 };
    const once = jcsCanonicalizeToString(input);
    const roundtripped = jcsCanonicalizeToString(JSON.parse(once));
    assert.strictEqual(once, roundtripped);
  });

  it('§14.5 numeric edge cases: 1.0 collapses to 1, -0 normalizes to 0', () => {
    assert.strictEqual(jcsCanonicalizeToString(JSON.parse('{"x":1.0}')), '{"x":1}');
    assert.strictEqual(jcsCanonicalizeToString(JSON.parse('{"x":-0}')), '{"x":0}');
  });

  it('produces stable output for DID documents', () => {
    const doc = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:trail:self:z6MkTest',
      verificationMethod: [{ id: '#key-1', type: 'JsonWebKey2020' }],
    };
    const result1 = jcsCanonicalizeToString(doc);
    const result2 = jcsCanonicalizeToString(doc);
    assert.strictEqual(result1, result2);
    // Keys should be sorted: @context < id < verificationMethod
    assert.ok(result1.indexOf('"@context"') < result1.indexOf('"id"'));
    assert.ok(result1.indexOf('"id"') < result1.indexOf('"verificationMethod"'));
  });
});

describe('Base58', () => {
  it('round-trips bytes', () => {
    const original = new Uint8Array([0, 0, 1, 2, 3, 255]);
    const encoded = encode(original);
    const decoded = decode(encoded);
    assert.deepStrictEqual(decoded, original);
  });

  it('handles empty input', () => {
    assert.strictEqual(encode(new Uint8Array(0)), '');
    assert.deepStrictEqual(decode(''), new Uint8Array(0));
  });

  it('multibase round-trips', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const mb = encodeMultibase(bytes);
    assert.ok(mb.startsWith('z'));
    const decoded = decodeMultibase(mb);
    assert.deepStrictEqual(decoded, bytes);
  });

  it('rejects non-z multibase prefix', () => {
    assert.throws(() => decodeMultibase('m123'), /base58btc/);
  });
});

describe('Key Generation', () => {
  it('generates Ed25519 keypair', () => {
    const keys = generateKeyPair();
    assert.strictEqual(keys.publicKeyBytes.length, 32);
    assert.strictEqual(keys.privateKeyBytes.length, 32);
    assert.ok(keys.publicKeyMultibase.startsWith('z'));
    assert.strictEqual(keys.publicKeyJwk.kty, 'OKP');
    assert.strictEqual(keys.publicKeyJwk.crv, 'Ed25519');
  });

  it('generates unique keys each time', () => {
    const k1 = generateKeyPair();
    const k2 = generateKeyPair();
    assert.notDeepStrictEqual(k1.publicKeyBytes, k2.publicKeyBytes);
  });
});

describe('DID Construction', () => {
  it('creates self DID from multibase', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    assert.ok(did.startsWith('did:trail:self:z'));
    assert.strictEqual(did, `did:trail:self:${keys.publicKeyMultibase}`);
  });

  it('creates org DID with hash suffix', () => {
    const keys = generateKeyPair();
    const did = createOrgDid('ACME Corporation GmbH', keys.publicKeyMultibase);
    // normalizeSlug removes "GmbH" and "Corporation" as legal suffixes → "acme"
    assert.ok(did.startsWith('did:trail:org:acme-'));
    // Hash suffix is 16 hex chars (64-bit, collision-safe to ~4.3B DIDs)
    const parts = did.split(':');
    const subject = parts[3];
    const hashPart = subject.split('-').pop()!;
    assert.strictEqual(hashPart.length, 16);
    assert.ok(/^[0-9a-f]{16}$/.test(hashPart));
  });

  it('creates agent DID with hash suffix', () => {
    const keys = generateKeyPair();
    const did = createAgentDid('Sales Bot', keys.publicKeyMultibase);
    assert.ok(did.startsWith('did:trail:agent:sales-bot-'));
  });

  it('normalizes slugs consistently', () => {
    const keys = generateKeyPair();
    const d1 = createOrgDid('ACME Corp GmbH', keys.publicKeyMultibase);
    const d2 = createOrgDid('acme corp gmbh', keys.publicKeyMultibase);
    assert.strictEqual(d1, d2);
  });

  it('parses self DID', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const parsed = parseTrailDid(did);
    assert.strictEqual(parsed.mode, 'self');
    assert.strictEqual(parsed.subject, keys.publicKeyMultibase);
  });

  it('parses org DID', () => {
    const keys = generateKeyPair();
    const did = createOrgDid('Test Org', keys.publicKeyMultibase);
    const parsed = parseTrailDid(did);
    assert.strictEqual(parsed.mode, 'org');
    assert.ok(parsed.slug);
    assert.ok(parsed.hash);
    assert.strictEqual(parsed.hash!.length, 16);
  });

  it('rejects invalid DID format', () => {
    assert.throws(() => parseTrailDid('did:web:example.com'), /must start with/i);
    assert.throws(() => parseTrailDid('did:trail:unknown:abc'), /invalid trail did mode/i);
  });
});

describe('DID Document', () => {
  it('creates self DID document', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = createDidDocument(did, keys, { mode: 'self' });

    assert.strictEqual(doc.id, did);
    assert.ok(doc['@context'].includes('https://www.w3.org/ns/did/v1'));
    assert.strictEqual(doc.verificationMethod.length, 1);
    assert.strictEqual(doc.verificationMethod[0].type, 'JsonWebKey2020');
    assert.deepStrictEqual(doc.verificationMethod[0].publicKeyJwk, keys.publicKeyJwk);
    assert.strictEqual(doc['trail:trailMode'], 'self');  // mode string, not 'self-signed'
    assert.strictEqual(doc['trail:trailTrustTier'], 0);  // Tier 0 for self mode
  });

  it('creates org DID document with service endpoint', () => {
    const keys = generateKeyPair();
    const did = createOrgDid('Test Corp', keys.publicKeyMultibase);
    const doc = createDidDocument(did, keys, { mode: 'org' });

    assert.strictEqual(doc['trail:trailMode'], 'org');
    assert.ok(doc.service && doc.service.length > 0);
  });

  it('creates agent DID document with parent reference', () => {
    const keys = generateKeyPair();
    const did = createAgentDid('Bot', keys.publicKeyMultibase);
    const parentDid = 'did:trail:org:parent-corp-abcd1234e5f6a7b8';
    const doc = createDidDocument(did, keys, {
      mode: 'agent',
      parentOrganization: parentDid,
      aiSystemType: 'agent',
    });

    assert.strictEqual(doc['trail:trailMode'], 'agent');
    assert.strictEqual(doc['trail:parentOrganization'], parentDid);
    assert.strictEqual(doc['trail:aiSystemType'], 'agent');
  });
});

describe('Self-Mode Resolution', () => {
  it('resolves self DID offline', async () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);

    const resolver = new TrailResolver();
    const result = await resolver.resolve(did);

    assert.strictEqual(result.didDocument.id, did);
    assert.strictEqual(result.didResolutionMetadata['contentType'], 'application/did+ld+json');
    assert.strictEqual(result.didDocument.verificationMethod[0].publicKeyJwk.crv, 'Ed25519');
    assert.strictEqual(result.didDocument['trail:trailTrustTier'], 0);
  });

  it('rejects invalid self DID multibase', async () => {
    const resolver = new TrailResolver();
    await assert.rejects(
      () => resolver.resolve('did:trail:self:invalidmultibase'),
      /multibase/i
    );
  });
});

describe('DataIntegrityProof', () => {
  it('creates and verifies proof', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = { id: did, name: 'Test Document' };

    const proof = createProof(
      doc,
      keys.privateKeyBytes,
      `${did}#key-0`,
      'assertionMethod'
    );

    assert.strictEqual(proof.type, 'DataIntegrityProof');
    assert.strictEqual(proof.cryptosuite, 'eddsa-jcs-2023');
    assert.strictEqual(proof.verificationMethod, `${did}#key-0`);
    assert.ok(proof.proofValue.startsWith('z'));

    const valid = verifyProof(doc, proof, keys.publicKeyBytes);
    assert.ok(valid);
  });

  it('rejects tampered document', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = { id: did, name: 'Original' };

    const proof = createProof(
      doc,
      keys.privateKeyBytes,
      `${did}#key-0`,
      'assertionMethod'
    );

    const tampered = { id: did, name: 'Tampered' };
    const valid = verifyProof(tampered, proof, keys.publicKeyBytes);
    assert.ok(!valid);
  });

  it('rejects wrong key', () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();
    const did = createSelfDid(keys1.publicKeyMultibase);
    const doc = { id: did, data: 'test' };

    const proof = createProof(
      doc,
      keys1.privateKeyBytes,
      `${did}#key-0`,
      'assertionMethod'
    );

    const valid = verifyProof(doc, proof, keys2.publicKeyBytes);
    assert.ok(!valid);
  });

  // eddsa-jcs-2023 W3C conformance fix. Per VC-DI-EDDSA §3.3
  // (Hashing §3.3.4 / Proof Configuration §3.3.5), the signature MUST bind
  // the proof's own metadata (verificationMethod, created, proofPurpose,
  // cryptosuite), not just the document. These tests pin that behavior down:
  // before the fix, all four mutations below verified successfully because
  // only the document bytes were hashed and signed.

  it('rejects a proof whose verificationMethod was swapped post-signing', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = { id: did, name: 'Test Document' };

    const proof = createProof(doc, keys.privateKeyBytes, `${did}#key-0`, 'assertionMethod');
    const tamperedProof = { ...proof, verificationMethod: `${did}#key-9` };

    assert.ok(!verifyProof(doc, tamperedProof, keys.publicKeyBytes));
  });

  it('rejects a proof whose created timestamp was swapped post-signing', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = { id: did, name: 'Test Document' };

    const proof = createProof(doc, keys.privateKeyBytes, `${did}#key-0`, 'assertionMethod');
    const tamperedProof = { ...proof, created: '2000-01-01T00:00:00.000Z' };

    assert.ok(!verifyProof(doc, tamperedProof, keys.publicKeyBytes));
  });

  it('rejects a proof whose proofPurpose was swapped post-signing', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = { id: did, name: 'Test Document' };

    const proof = createProof(doc, keys.privateKeyBytes, `${did}#key-0`, 'assertionMethod');
    const tamperedProof = { ...proof, proofPurpose: 'capabilityInvocation' };

    assert.ok(!verifyProof(doc, tamperedProof, keys.publicKeyBytes));
  });

  it('signs proof-config and document as separate concatenated hashes (proofConfigHash || documentHash)', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = { id: did, name: 'Hash order check' };

    const proof = createProof(doc, keys.privateKeyBytes, `${did}#key-0`, 'assertionMethod');
    const { proofValue, ...proofConfig } = proof;

    const proofConfigHash = createHash('sha256').update(jcsCanonicalizeToBuffer(proofConfig)).digest();
    const documentHash = createHash('sha256').update(jcsCanonicalizeToBuffer(doc)).digest();
    const hashData = Buffer.concat([proofConfigHash, documentHash]);

    const signature = decodeMultibase(proofValue);
    const { verify } = require('node:crypto') as typeof import('node:crypto');
    const { createPublicKeyObject } = require('../src/keygen') as typeof import('../src/keygen');
    const publicKey = createPublicKeyObject(keys.publicKeyBytes);

    assert.ok(verify(null, hashData, publicKey, Buffer.from(signature)));
    // Concatenation order is normative: swapping it must NOT verify.
    const swapped = Buffer.concat([documentHash, proofConfigHash]);
    assert.ok(!verify(null, swapped, publicKey, Buffer.from(signature)));
  });
});

describe('Verifiable Credentials', () => {
  it('creates and verifies self-signed credential', () => {
    const keys = generateKeyPair();
    const issuerDid = createSelfDid(keys.publicKeyMultibase);
    const subjectDid = createSelfDid(generateKeyPair().publicKeyMultibase);

    const vc = createSelfSignedCredential(
      issuerDid,
      subjectDid,
      { name: 'Test Agent', role: 'assistant' },
      keys.privateKeyBytes
    );

    assert.ok(vc['@context'].includes('https://www.w3.org/2018/credentials/v1'));
    assert.ok(vc.type.includes('VerifiableCredential'));
    assert.strictEqual(vc.issuer, issuerDid);
    assert.strictEqual(vc.credentialSubject['id'], subjectDid);
    assert.strictEqual(vc.credentialSubject['name'], 'Test Agent');
    assert.ok(vc.proof);

    const result = verifyCredential(vc, keys.publicKeyBytes);
    assert.ok(result.valid, `Verification failed: ${result.errors.join(', ')}`);
    assert.strictEqual(result.errors.length, 0);
  });

  it('detects missing proof', () => {
    const keys = generateKeyPair();
    const vc = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      issuer: 'did:trail:self:z6Mk...',
      issuanceDate: new Date().toISOString(),
      credentialSubject: { id: 'did:trail:self:z6Mk...' },
    };

    const result = verifyCredential(vc as any, keys.publicKeyBytes);
    assert.ok(!result.valid);
    assert.ok(result.errors.some(e => /proof/i.test(e)));
  });

  it('detects tampered claims', () => {
    const keys = generateKeyPair();
    const issuerDid = createSelfDid(keys.publicKeyMultibase);
    const subjectDid = createSelfDid(generateKeyPair().publicKeyMultibase);

    const vc = createSelfSignedCredential(
      issuerDid,
      subjectDid,
      { role: 'assistant' },
      keys.privateKeyBytes
    );

    // Tamper with credential
    vc.credentialSubject['role'] = 'admin';

    const result = verifyCredential(vc, keys.publicKeyBytes);
    assert.ok(!result.valid);
  });
});

describe('End-to-End Roundtrip', () => {
  it('keygen → DID → resolve → sign → verify', async () => {
    // Step 1: Generate keys
    const orgKeys = generateKeyPair();
    const agentKeys = generateKeyPair();

    // Step 2: Create DIDs
    const orgDid = createOrgDid('ACME Corporation', orgKeys.publicKeyMultibase);
    const agentDid = createAgentDid('Sales Assistant', agentKeys.publicKeyMultibase);
    const selfDid = createSelfDid(orgKeys.publicKeyMultibase);

    // Step 3: Create DID Documents
    const orgDoc = createDidDocument(orgDid, orgKeys, { mode: 'org' });
    const agentDoc = createDidDocument(agentDid, agentKeys, {
      mode: 'agent',
      parentOrganization: orgDid,
      aiSystemType: 'agent',
    });

    assert.strictEqual(orgDoc.id, orgDid);
    assert.strictEqual(agentDoc['trail:parentOrganization'], orgDid);

    // Step 4: Resolve self DID (offline)
    const resolver = new TrailResolver();
    const resolved = await resolver.resolve(selfDid);
    assert.strictEqual(resolved.didDocument.id, selfDid);

    // Step 5: Create a Verifiable Credential
    const vc = createSelfSignedCredential(
      selfDid,
      agentDid,
      {
        name: 'Sales Assistant',
        parentOrganization: orgDid,
        aiSystemType: 'conversational-agent',
      },
      orgKeys.privateKeyBytes
    );

    // Step 6: Verify the credential
    const verification = verifyCredential(vc, orgKeys.publicKeyBytes);
    assert.ok(verification.valid, `VC verification failed: ${verification.errors.join(', ')}`);

    // Step 7: Verify proof directly
    const proof = vc.proof!;
    const vcWithoutProof = { ...vc };
    delete (vcWithoutProof as any).proof;
    const proofValid = verifyProof(vcWithoutProof, proof, orgKeys.publicKeyBytes);
    assert.ok(proofValid);

    console.log('✓ Full roundtrip: keygen → DID → resolve → VC sign → VC verify');
  });
});

describe('Crypto Agility', () => {
  it('DEFAULT_CRYPTOSUITE is eddsa-jcs-2023', () => {
    assert.strictEqual(DEFAULT_CRYPTOSUITE, 'eddsa-jcs-2023');
  });

  it('isSupportedCryptosuite validates known suites', () => {
    assert.ok(isSupportedCryptosuite('eddsa-jcs-2023'));
    assert.ok(!isSupportedCryptosuite('ecdsa-rdfc-2019'));
    assert.ok(!isSupportedCryptosuite('unknown-suite'));
    assert.ok(!isSupportedCryptosuite(''));
  });

  it('SUPPORTED_CRYPTOSUITES registry has required fields', () => {
    assert.ok(SUPPORTED_CRYPTOSUITES.length >= 1);
    for (const suite of SUPPORTED_CRYPTOSUITES) {
      assert.ok(suite.id);
      assert.ok(suite.algorithm);
      assert.ok(suite.canonicalization);
      assert.ok(suite.keyType);
      assert.ok(['active', 'deprecated'].includes(suite.status));
    }
  });

  it('createProof accepts explicit cryptosuite parameter', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = { id: did, data: 'test' };

    const proof = createProof(
      doc,
      keys.privateKeyBytes,
      `${did}#key-1`,
      'assertionMethod',
      'eddsa-jcs-2023'
    );

    assert.strictEqual(proof.cryptosuite, 'eddsa-jcs-2023');
    const valid = verifyProof(doc, proof, keys.publicKeyBytes);
    assert.ok(valid);
  });

  it('createProof rejects unsupported cryptosuite', () => {
    const keys = generateKeyPair();
    const doc = { id: 'test' };

    assert.throws(
      () => createProof(doc, keys.privateKeyBytes, 'test#key-1', 'assertionMethod', 'unknown-suite' as any),
      /Unsupported cryptosuite/
    );
  });

  it('DID document includes supportedCryptosuites', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = createDidDocument(did, keys, { mode: 'self' });

    assert.ok(doc['trail:supportedCryptosuites']);
    assert.ok(Array.isArray(doc['trail:supportedCryptosuites']));
    assert.ok(doc['trail:supportedCryptosuites']!.includes('eddsa-jcs-2023'));
  });
});

describe('Spec Version', () => {
  it('SPEC_VERSION is 1.1.0', () => {
    assert.strictEqual(SPEC_VERSION, '1.1.0');
  });

  it('DID document includes trail:specVersion', () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const doc = createDidDocument(did, keys, { mode: 'self' });

    assert.strictEqual(doc['trail:specVersion'], '1.1.0');
  });

  it('resolved self DID includes trail:specVersion', async () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const resolver = new TrailResolver();
    const result = await resolver.resolve(did);

    assert.strictEqual(result.didDocument['trail:specVersion'], '1.1.0');
  });

  it('resolved self DID includes supportedCryptosuites', async () => {
    const keys = generateKeyPair();
    const did = createSelfDid(keys.publicKeyMultibase);
    const resolver = new TrailResolver();
    const result = await resolver.resolve(did);

    assert.ok(result.didDocument['trail:supportedCryptosuites']);
    assert.ok(result.didDocument['trail:supportedCryptosuites']!.includes('eddsa-jcs-2023'));
  });
});

describe('Key Rotation', () => {
  it('rotates key for org DID', () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();
    const did = createOrgDid('Test Corp', keys1.publicKeyMultibase);
    const doc = createDidDocument(did, keys1, { mode: 'org' });

    const { document: rotated, rotationMetadata } = rotateKey(doc, keys2);

    // New key is added
    assert.strictEqual(rotated.verificationMethod.length, 2);
    assert.strictEqual(rotated.verificationMethod[1].id, `${did}#key-2`);
    assert.deepStrictEqual(rotated.verificationMethod[1].publicKeyJwk, keys2.publicKeyJwk);

    // Old key is retained
    assert.strictEqual(rotated.verificationMethod[0].id, `${did}#key-1`);
    assert.deepStrictEqual(rotated.verificationMethod[0].publicKeyJwk, keys1.publicKeyJwk);

    // Active key references updated
    assert.deepStrictEqual(rotated.authentication, [`${did}#key-2`]);
    assert.deepStrictEqual(rotated.assertionMethod, [`${did}#key-2`]);

    // Metadata
    assert.strictEqual(rotationMetadata.previousKeyId, `${did}#key-1`);
    assert.strictEqual(rotationMetadata.newKeyId, `${did}#key-2`);
    assert.ok(rotationMetadata.rotatedAt);
    assert.ok(rotationMetadata.previousKeyRetained);
  });

  it('rotates key for agent DID', () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();
    const did = createAgentDid('Sales Bot', keys1.publicKeyMultibase);
    const doc = createDidDocument(did, keys1, { mode: 'agent' });

    const { document: rotated } = rotateKey(doc, keys2);
    assert.strictEqual(rotated.verificationMethod.length, 2);
    assert.deepStrictEqual(rotated.authentication, [`${did}#key-2`]);
  });

  it('rejects key rotation for self DID', () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();
    const did = createSelfDid(keys1.publicKeyMultibase);
    const doc = createDidDocument(did, keys1, { mode: 'self' });

    assert.throws(
      () => rotateKey(doc, keys2),
      /not supported for self-mode/
    );
  });

  it('supports multiple rotations', () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();
    const keys3 = generateKeyPair();
    const did = createOrgDid('Multi Rotate Corp', keys1.publicKeyMultibase);
    const doc = createDidDocument(did, keys1, { mode: 'org' });

    const { document: rotated1 } = rotateKey(doc, keys2);
    const { document: rotated2, rotationMetadata } = rotateKey(rotated1, keys3);

    assert.strictEqual(rotated2.verificationMethod.length, 3);
    assert.deepStrictEqual(rotated2.authentication, [`${did}#key-3`]);
    assert.strictEqual(rotationMetadata.previousKeyId, `${did}#key-2`);
    assert.strictEqual(rotationMetadata.newKeyId, `${did}#key-3`);
  });

  it('proofs signed with new key verify after rotation', () => {
    const keys1 = generateKeyPair();
    const keys2 = generateKeyPair();
    const did = createOrgDid('Proof Rotate', keys1.publicKeyMultibase);
    const doc = createDidDocument(did, keys1, { mode: 'org' });

    const { document: rotated } = rotateKey(doc, keys2);
    const testDoc = { id: did, data: 'after rotation' };

    // Sign with new key
    const proof = createProof(testDoc, keys2.privateKeyBytes, `${did}#key-2`);
    assert.ok(verifyProof(testDoc, proof, keys2.publicKeyBytes));

    // Old key proofs still verify against old key
    const oldProof = createProof(testDoc, keys1.privateKeyBytes, `${did}#key-1`);
    assert.ok(verifyProof(testDoc, oldProof, keys1.publicKeyBytes));
  });
});

describe('BindingProofCredential (§5.4.5)', () => {
  // Helper: build a full valid reciprocal pair + both DID Documents + keys,
  // so each test can mutate one thing and assert the failure.
  function buildValidBinding() {
    const trailKeys = generateKeyPair();
    const foreignKeys = generateKeyPair();

    // Use org DIDs for both legs (foreign leg simulated with a second trail DID
    // is fine for the crypto — the function is method-agnostic on the foreign side).
    const trailDid = createOrgDid('Binding Trail Co', trailKeys.publicKeyMultibase);
    const foreignDid = createOrgDid('Binding Foreign Co', foreignKeys.publicKeyMultibase);

    const trailStatus: StatusList2021Entry = {
      id: 'https://registry.trailprotocol.org/1.0/status/2026-06#42',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '42',
      statusListCredential: 'https://registry.trailprotocol.org/1.0/status/2026-06',
    };
    const foreignStatus: StatusList2021Entry = {
      id: 'https://foreign.example/status/2026-06#7',
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: '7',
      statusListCredential: 'https://foreign.example/status/2026-06',
    };

    const validFrom = '2026-06-15T00:00:00Z';
    const validUntil = '2027-06-15T00:00:00Z';

    const trailCredential = createBindingProofCredential({
      issuerDid: trailDid,
      subjectDid: foreignDid,
      privateKeyBytes: trailKeys.privateKeyBytes,
      credentialStatus: trailStatus,
      validFrom,
      validUntil,
    });
    const foreignCredential = createBindingProofCredential({
      issuerDid: foreignDid,
      subjectDid: trailDid,
      privateKeyBytes: foreignKeys.privateKeyBytes,
      credentialStatus: foreignStatus,
      validFrom,
      validUntil,
    });

    // DID Documents WITH reciprocal alsoKnownAs (step 1 precondition).
    const trailDidDocument: DidDocument = {
      ...createDidDocument(trailDid, trailKeys, { mode: 'org' }),
      alsoKnownAs: [foreignDid],
    };
    const foreignDidDocument: DidDocument = {
      ...createDidDocument(foreignDid, foreignKeys, { mode: 'org' }),
      alsoKnownAs: [trailDid],
    };

    const input: VerifyBindingProofInput = {
      trailCredential,
      foreignCredential,
      trailDidDocument,
      foreignDidDocument,
      trailPublicKeyBytes: trailKeys.publicKeyBytes,
      foreignPublicKeyBytes: foreignKeys.publicKeyBytes,
      revocation: { trailCredentialRevoked: false, foreignCredentialRevoked: false },
      now: '2026-09-01T00:00:00Z',
    };

    return { input, trailKeys, foreignKeys, trailDid, foreignDid };
  }

  it('createBindingProofCredential produces a correctly-shaped outbound leg', () => {
    const { input, trailDid, foreignDid } = buildValidBinding();
    const c = input.trailCredential;
    assert.deepStrictEqual(c['@context'], [
      'https://www.w3.org/ns/credentials/v2',
      'https://trailprotocol.org/ns/credentials/v2',
    ]);
    assert.deepStrictEqual(c.type, ['VerifiableCredential', 'BindingProofCredential']);
    assert.strictEqual(c.issuer, trailDid);
    assert.strictEqual(c.credentialSubject.id, foreignDid);
    assert.strictEqual(c.credentialSubject.binding.from, trailDid);
    assert.strictEqual(c.credentialSubject.binding.to, foreignDid);
    // direction MUST NOT be present
    assert.strictEqual(
      Object.prototype.hasOwnProperty.call(c.credentialSubject.binding, 'direction'),
      false
    );
    assert.ok(c.proof, 'leg must carry a proof');
  });

  it('boundAt defaults to validFrom when omitted', () => {
    const { input } = buildValidBinding();
    assert.strictEqual(
      input.trailCredential.credentialSubject.binding.boundAt,
      input.trailCredential.validFrom
    );
  });

  it('verifies a complete valid reciprocal pair', () => {
    const { input } = buildValidBinding();
    const result = verifyBindingProof(input);
    assert.deepStrictEqual(result.errors, []);
    assert.strictEqual(result.verified, true);
  });

  it('fails when the trail leg has a tampered signature (step 4)', () => {
    const { input } = buildValidBinding();
    // Mutate credentialSubject after signing → JCS digest no longer matches proof.
    input.trailCredential.credentialSubject.binding.boundAt = '2099-01-01T00:00:00Z';
    const result = verifyBindingProof(input);
    assert.strictEqual(result.verified, false);
    assert.ok(result.errors.some(e => e.includes('Step 4')));
  });

  it('fails when the reciprocal back-reference is missing (step 1)', () => {
    const { input } = buildValidBinding();
    input.foreignDidDocument.alsoKnownAs = []; // drop the back-reference
    const result = verifyBindingProof(input);
    assert.strictEqual(result.verified, false);
    assert.ok(result.errors.some(e => e.includes('Step 1')));
  });

  it('fails when a credential is expired (step 6)', () => {
    const { input } = buildValidBinding();
    input.now = '2030-01-01T00:00:00Z'; // past validUntil
    const result = verifyBindingProof(input);
    assert.strictEqual(result.verified, false);
    assert.ok(result.errors.some(e => e.includes('Step 6')));
  });

  it('fails when a credential is revoked via credentialStatus (step 7)', () => {
    const { input } = buildValidBinding();
    input.revocation.foreignCredentialRevoked = true;
    const result = verifyBindingProof(input);
    assert.strictEqual(result.verified, false);
    assert.ok(result.errors.some(e => e.includes('Step 7')));
  });

  it('fails when the signing key is revoked at verification time (step 5)', () => {
    const { input } = buildValidBinding();
    input.keyRevocation = { trailSigningKeyRevoked: true, foreignSigningKeyRevoked: false };
    const result = verifyBindingProof(input);
    assert.strictEqual(result.verified, false);
    assert.ok(result.errors.some(e => e.includes('Step 5')));
  });

  it('fails when binding.to does not match the counterpart DID (step 2)', () => {
    const { input } = buildValidBinding();
    // Re-point the trail leg's binding.to at a bogus DID (breaks orientation).
    input.trailCredential.credentialSubject.binding.to = 'did:trail:org:not-the-foreign-did-0000000000000000';
    input.trailCredential.credentialSubject.id = 'did:trail:org:not-the-foreign-did-0000000000000000';
    const result = verifyBindingProof(input);
    assert.strictEqual(result.verified, false);
    assert.ok(result.errors.some(e => e.includes('Step 2')));
  });

  it('a single-party pair still verifies (documents the consent≠identity limitation, §5.4.5.4)', () => {
    // One key controls both legs: valid pair, but proves consent not distinctness.
    const soleKeys = generateKeyPair();
    const didA = createOrgDid('Sole Controller A', soleKeys.publicKeyMultibase);
    // Second DID from a different slug but SAME key material — a single party.
    const didB = createOrgDid('Sole Controller B', soleKeys.publicKeyMultibase);

    const status = (idx: string): StatusList2021Entry => ({
      id: `https://registry.trailprotocol.org/1.0/status/2026-06#${idx}`,
      type: 'StatusList2021Entry',
      statusPurpose: 'revocation',
      statusListIndex: idx,
      statusListCredential: 'https://registry.trailprotocol.org/1.0/status/2026-06',
    });

    const validFrom = '2026-06-15T00:00:00Z';
    const validUntil = '2027-06-15T00:00:00Z';

    const legA = createBindingProofCredential({
      issuerDid: didA, subjectDid: didB, privateKeyBytes: soleKeys.privateKeyBytes,
      credentialStatus: status('1'), validFrom, validUntil,
    });
    const legB = createBindingProofCredential({
      issuerDid: didB, subjectDid: didA, privateKeyBytes: soleKeys.privateKeyBytes,
      credentialStatus: status('2'), validFrom, validUntil,
    });

    const docA: DidDocument = { ...createDidDocument(didA, soleKeys, { mode: 'org' }), alsoKnownAs: [didB] };
    const docB: DidDocument = { ...createDidDocument(didB, soleKeys, { mode: 'org' }), alsoKnownAs: [didA] };

    const result = verifyBindingProof({
      trailCredential: legA, foreignCredential: legB,
      trailDidDocument: docA, foreignDidDocument: docB,
      trailPublicKeyBytes: soleKeys.publicKeyBytes,
      foreignPublicKeyBytes: soleKeys.publicKeyBytes,
      revocation: { trailCredentialRevoked: false, foreignCredentialRevoked: false },
      now: '2026-09-01T00:00:00Z',
    });

    // Cryptographically verified — this is exactly the §5.4.5.4 limitation.
    assert.strictEqual(result.verified, true);
  });
});

describe('Signed test vectors (validation/fixtures)', () => {
  // These fixtures are the cross-implementation contract for §5.4.5: they carry
  // real Ed25519 signatures produced by this package. Loading them here means a
  // change to the signing or canonicalization path (as in 0.3.0) fails loudly
  // instead of leaving stale vectors on disk that nothing executes.
  const FIXTURE_DIR = join(__dirname, '..', '..', '..', '..', 'validation', 'fixtures');

  interface BindingFixture {
    trailPublicKeyBase64: string;
    foreignPublicKeyBase64: string;
    verificationTime: string;
    trailDidDocument: DidDocument;
    foreignDidDocument: DidDocument;
    trailCredential: BindingProofCredential;
    foreignCredential: BindingProofCredential;
    callerRevocationInput?: VerifyBindingProofInput['revocation'];
    callerKeyRevocationInput?: VerifyBindingProofInput['keyRevocation'];
  }

  function loadFixture(name: string): BindingFixture {
    return JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8')) as BindingFixture;
  }

  function keyBytes(b64: string): Uint8Array {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }

  function inputFor(fx: BindingFixture): VerifyBindingProofInput {
    return {
      trailCredential: fx.trailCredential,
      foreignCredential: fx.foreignCredential,
      trailDidDocument: fx.trailDidDocument,
      foreignDidDocument: fx.foreignDidDocument,
      trailPublicKeyBytes: keyBytes(fx.trailPublicKeyBase64),
      foreignPublicKeyBytes: keyBytes(fx.foreignPublicKeyBase64),
      revocation: fx.callerRevocationInput ?? {
        trailCredentialRevoked: false,
        foreignCredentialRevoked: false,
      },
      keyRevocation: fx.callerKeyRevocationInput,
      now: fx.verificationTime,
    };
  }

  it('valid-binding-proof-pair verifies', () => {
    const result = verifyBindingProof(inputFor(loadFixture('valid-binding-proof-pair.json')));
    assert.deepStrictEqual(result.errors, []);
    assert.strictEqual(result.verified, true);
  });

  // Each invalid vector MUST fail on exactly one verification step. Asserting
  // isolation (not just "verified === false") is what makes these vectors useful
  // to downstream implementers — and what catches signature-path regressions,
  // which surface as an extra Step 4 error alongside the intended one.
  const invalidVectors: Array<[string, string]> = [
    ['invalid-binding-proof-bad-signature.json', 'Step 4'],
    ['invalid-binding-proof-expired.json', 'Step 6'],
    ['invalid-binding-proof-missing-reciprocal.json', 'Step 1'],
    ['invalid-binding-proof-credential-revoked.json', 'Step 7'],
    ['invalid-binding-proof-signing-key-revoked.json', 'Step 5'],
  ];

  for (const [file, step] of invalidVectors) {
    it(`${file} fails ${step} and only ${step}`, () => {
      const result = verifyBindingProof(inputFor(loadFixture(file)));
      assert.strictEqual(result.verified, false);
      assert.ok(result.errors.length > 0, 'expected at least one error');
      assert.ok(
        result.errors.every(e => e.startsWith(step)),
        `expected only ${step} errors, got: ${JSON.stringify(result.errors)}`
      );
    });
  }
});

describe('§14.5 numeric constraint (sign-side enforcement)', () => {
  const keys = generateKeyPair();
  const did = createSelfDid(keys.publicKeyMultibase);
  const vm = `${did}#key-1`;

  const sign = (doc: object) => createProof(doc, keys.privateKeyBytes, vm);

  it('accepts safe-range integers, including 0, negatives, and MAX_SAFE_INTEGER', () => {
    const doc = {
      id: did,
      tier: 0,
      offset: -42,
      max: Number.MAX_SAFE_INTEGER,
      min: -Number.MAX_SAFE_INTEGER,
      nested: { scores: [100, 0, 87] },
    };
    const proof = sign(doc);
    assert.ok(proof.proofValue);
    assert.strictEqual(verifyProof(doc, proof, keys.publicKeyBytes), true);
  });

  it('rejects a fractional value and names the field', () => {
    assert.throws(
      () => sign({ id: did, trustScore: { overall: 0.87 } }),
      (err: unknown) => {
        assert.ok(err instanceof RangeError);
        assert.match(err.message, /§14\.5/);
        assert.match(err.message, /fractional/);
        assert.match(err.message, /trustScore\.overall/);
        return true;
      }
    );
  });

  it('rejects a value outside the safe integer range', () => {
    assert.throws(
      () => sign({ id: did, counter: 2 ** 53 }),
      (err: unknown) => {
        assert.ok(err instanceof RangeError);
        assert.match(err.message, /safe integer range/);
        return true;
      }
    );
  });

  it('rejects NaN and Infinity with a §14.5 message', () => {
    assert.throws(() => sign({ id: did, x: NaN }), /§14\.5.*non-finite/);
    assert.throws(() => sign({ id: did, x: Infinity }), /§14\.5.*non-finite/);
  });

  it('walks arrays and reports the index', () => {
    assert.throws(
      () => sign({ id: did, weights: [25, 25, 20.5] }),
      /weights\[2\]/
    );
  });

  it('skips the proof block when re-signing a proof-bearing document', () => {
    // The proof config is all strings, so it is out of scope for §14.5 — but a
    // document passed back in for re-signing still carries its old proof, and
    // that must not trip the guard.
    const doc: Record<string, unknown> = { id: did, tier: 1 };
    doc['proof'] = sign(doc);
    assert.doesNotThrow(() => sign(doc));
  });

  it('does not enforce on the verify path (sign-side only)', () => {
    // A float-bearing payload can no longer be produced by createProof, so the
    // signature is constructed here the same way computeHashData does it:
    //   hashData = sha256(JCS(proofConfig)) || sha256(JCS(document))
    // verifyProof must still accept it — enforcing on verify would reject
    // previously-issued payloads, which is the compatibility break we deferred.
    const doc = { id: did, legacyScore: 0.87 };
    const proofConfig = {
      type: 'DataIntegrityProof' as const,
      cryptosuite: DEFAULT_CRYPTOSUITE,
      created: '2026-01-01T00:00:00.000Z',
      verificationMethod: vm,
      proofPurpose: 'assertionMethod',
    };

    const hashData = Buffer.concat([
      createHash('sha256').update(jcsCanonicalizeToBuffer(proofConfig)).digest(),
      createHash('sha256').update(jcsCanonicalizeToBuffer(doc)).digest(),
    ]);
    const signature = nodeSign(null, hashData, createPrivateKeyObject(keys.privateKeyBytes));
    const proof = { ...proofConfig, proofValue: encodeMultibase(new Uint8Array(signature)) };

    assert.strictEqual(verifyProof(doc, proof, keys.publicKeyBytes), true);
  });
});
