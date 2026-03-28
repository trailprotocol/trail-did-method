#!/usr/bin/env node

/**
 * TRAIL Protocol - DID Resolution Example
 *
 * Demonstrates how to:
 * 1. Generate an Ed25519 keypair
 * 2. Create did:trail DIDs (self, org, agent)
 * 3. Build DID Documents
 * 4. Resolve a did:trail DID offline (self-mode)
 *
 * Prerequisites:
 *   npm install @trailprotocol/core
 *
 * Run:
 *   node did-resolution.js
 */

const {
  generateKeyPair,
  createSelfDid,
  createOrgDid,
  createAgentDid,
  createDidDocument,
  TrailResolver,
} = require('@trailprotocol/core');

async function main() {
  // -------------------------------------------------------
  // Step 1: Generate an Ed25519 keypair
  // -------------------------------------------------------
  const keys = generateKeyPair();
  console.log('=== Key Generation ===');
  console.log('Public key (multibase):', keys.publicKeyMultibase);
  console.log('Public key (JWK):', JSON.stringify(keys.publicKeyJwk, null, 2));
  console.log();

  // -------------------------------------------------------
  // Step 2: Create DIDs in all three modes
  // -------------------------------------------------------

  // Self DID (Tier 0) - no registry needed, local trust only
  const selfDid = createSelfDid(keys.publicKeyMultibase);
  console.log('=== DID Creation ===');
  console.log('Self DID: ', selfDid);

  // Org DID (Tier 1) - for organizations with KYB attestation
  const orgDid = createOrgDid('Acme Corporation', keys.publicKeyMultibase);
  console.log('Org DID:  ', orgDid);

  // Agent DID (Tier 2) - for AI agents with full trust chain
  const agentDid = createAgentDid('Sales Assistant', keys.publicKeyMultibase);
  console.log('Agent DID:', agentDid);
  console.log();

  // -------------------------------------------------------
  // Step 3: Build DID Documents
  // -------------------------------------------------------
  console.log('=== DID Documents ===');

  // Self DID Document - simplest form
  const selfDoc = createDidDocument(selfDid, keys, { mode: 'self' });
  console.log('Self DID Document:');
  console.log(JSON.stringify(selfDoc, null, 2));
  console.log();

  // Agent DID Document - with parent organization reference
  const agentDoc = createDidDocument(agentDid, keys, {
    mode: 'agent',
    parentOrganization: orgDid,
    aiSystemType: 'agent',
  });
  console.log('Agent DID Document:');
  console.log(JSON.stringify(agentDoc, null, 2));
  console.log();

  // -------------------------------------------------------
  // Step 4: Resolve a self DID (offline resolution)
  // -------------------------------------------------------
  // Self-mode DIDs can be resolved without a registry because
  // the public key is embedded in the DID itself.
  console.log('=== DID Resolution ===');
  const resolver = new TrailResolver();
  const result = await resolver.resolve(selfDid);

  console.log('Resolution result:');
  console.log('  DID:', result.didDocument.id);
  console.log('  Content-Type:', result.didResolutionMetadata.contentType);
  console.log('  Verification Method:', result.didDocument.verificationMethod[0].type);
  console.log('  Trust Tier:', result.didDocument['trail:trailTrustTier']);
  console.log();

  // TODO: Add registry-based resolution for org/agent DIDs
  // (requires a running TRAIL Registry instance)

  console.log('Done. All examples completed successfully.');
}

main().catch(console.error);
