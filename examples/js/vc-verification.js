#!/usr/bin/env node

/**
 * TRAIL Protocol - Verifiable Credential Example
 *
 * Demonstrates how to:
 * 1. Create a self-signed Verifiable Credential (VC 2.0)
 * 2. Inspect the DataIntegrityProof (eddsa-jcs-2023)
 * 3. Verify the credential cryptographically
 * 4. Detect tampering (negative test)
 *
 * Prerequisites:
 *   npm install @trailprotocol/core
 *
 * Run:
 *   node vc-verification.js
 */

const {
  generateKeyPair,
  createSelfDid,
  createSelfSignedCredential,
  verifyCredential,
} = require('@trailprotocol/core');

async function main() {
  // -------------------------------------------------------
  // Step 1: Setup - generate keys and create a DID
  // -------------------------------------------------------
  const issuerKeys = generateKeyPair();
  const issuerDid = createSelfDid(issuerKeys.publicKeyMultibase);

  console.log('=== Setup ===');
  console.log('Issuer DID:', issuerDid);
  console.log();

  // -------------------------------------------------------
  // Step 2: Issue a self-signed Verifiable Credential
  // -------------------------------------------------------
  // createSelfSignedCredential(issuerDid, subjectDid, claims, privateKeyBytes)
  //
  // This creates a VC 2.0 credential with a DataIntegrityProof
  // using the eddsa-jcs-2023 cryptosuite (Ed25519 + JCS RFC 8785).
  // For self-signed VCs, issuer and subject are the same DID.
  const credential = createSelfSignedCredential(
    issuerDid,
    issuerDid, // subject = issuer (self-signed)
    {
      type: 'TrailTrustAttestation',
      aiSystemType: 'agent',
      capabilities: ['text-generation', 'tool-use'],
    },
    issuerKeys.privateKeyBytes
  );

  console.log('=== Issued Credential ===');
  console.log(JSON.stringify(credential, null, 2));
  console.log();

  // -------------------------------------------------------
  // Step 3: Inspect the proof
  // -------------------------------------------------------
  console.log('=== Proof Details ===');
  console.log('  Type:', credential.proof.type);
  console.log('  Cryptosuite:', credential.proof.cryptosuite);
  console.log('  Verification Method:', credential.proof.verificationMethod);
  console.log('  Created:', credential.proof.created);
  console.log('  Proof Purpose:', credential.proof.proofPurpose);
  console.log('  Proof Value (first 40 chars):', credential.proof.proofValue.substring(0, 40) + '...');
  console.log();

  // -------------------------------------------------------
  // Step 4: Verify the credential
  // -------------------------------------------------------
  // verifyCredential(vc, publicKeyBytes) checks:
  // - Required VC fields (@context, type, issuer, issuanceDate, credentialSubject)
  // - DataIntegrityProof signature validity
  console.log('=== Verification ===');
  const result = verifyCredential(credential, issuerKeys.publicKeyBytes);
  console.log('Credential valid:', result.valid);
  console.log('Errors:', result.errors.length === 0 ? 'none' : result.errors);
  console.log();

  // -------------------------------------------------------
  // Step 5: Tamper detection (negative test)
  // -------------------------------------------------------
  // Modify the credential and verify again - should fail
  // because the signature no longer matches the content.
  console.log('=== Tamper Detection ===');
  const tampered = JSON.parse(JSON.stringify(credential));
  tampered.credentialSubject.trailTrustTier = 2; // Attacker tries to upgrade trust tier

  const tamperedResult = verifyCredential(tampered, issuerKeys.publicKeyBytes);
  console.log('Tampered credential valid:', tamperedResult.valid, '(expected: false)');
  console.log('Errors:', tamperedResult.errors);
  console.log();

  console.log('Done. All examples completed successfully.');
}

main().catch(console.error);
