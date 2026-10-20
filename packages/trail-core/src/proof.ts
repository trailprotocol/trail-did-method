import { sign, verify, createHash } from 'node:crypto';
import { encodeMultibase, decodeMultibase } from './base58';
import { createPrivateKeyObject, createPublicKeyObject } from './keygen';
import { jcsCanonicalizeToBuffer } from './jcs';
import type { DataIntegrityProof, SupportedCryptosuite } from './types';
import { SUPPORTED_CRYPTOSUITES } from './types';

/**
 * Default cryptosuite used when none is specified.
 */
export const DEFAULT_CRYPTOSUITE: SupportedCryptosuite = 'eddsa-jcs-2022';

/**
 * Check whether a cryptosuite identifier is supported by this implementation.
 */
export function isSupportedCryptosuite(id: string): id is SupportedCryptosuite {
  return SUPPORTED_CRYPTOSUITES.some(s => s.id === id && s.status === 'active');
}

function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

/**
 * Compute the "hash data" that gets signed (createProof) / re-derived
 * (verifyProof) for the eddsa-jcs-2022 cryptosuite.
 *
 * Conformance fix: per the W3C Data Integrity EdDSA cryptosuite
 * algorithm (VC-DI-EDDSA §3.3 "eddsa-jcs-2022" — Transformation §3.3.3,
 * Proof Configuration §3.3.5, Hashing §3.3.4), the bytes that get signed are
 * NOT simply the canonicalized document. They are:
 *
 *   hashData = sha256(JCS(proofConfig)) || sha256(JCS(documentWithoutProof))
 *
 * i.e. the proof's own metadata (type, cryptosuite, created,
 * verificationMethod, proofPurpose — everything except proofValue, which
 * doesn't exist yet at signing time) is canonicalized and hashed
 * independently, then concatenated (proof-config hash first) with the hash
 * of the canonicalized document, and EdDSA signs that 64-byte concatenation
 * directly (Ed25519 takes the message as-is; no separate pre-hash step).
 *
 * The previous implementation skipped the proof-configuration hash entirely
 * and signed `JCS(document)` alone. That left every proof field
 * (verificationMethod, created, proofPurpose, cryptosuite) cryptographically
 * unbound from the signature: given one valid (document, proof) pair, an
 * attacker could swap in a different verificationMethod / created /
 * proofPurpose in the proof object and `verifyProof` would still accept it,
 * because those fields were never part of what was hashed and signed. This
 * function restores the mandated binding.
 */
function computeHashData(
  document: object,
  proofConfig: Omit<DataIntegrityProof, 'proofValue'>
): Buffer {
  // Remove proof from document for canonicalization (defensive: callers may
  // pass an already-proof-bearing document, e.g. when re-signing).
  const docWithoutProof = { ...document } as Record<string, unknown>;
  delete docWithoutProof['proof'];

  const proofConfigHash = sha256(jcsCanonicalizeToBuffer(proofConfig));
  const transformedDocumentHash = sha256(jcsCanonicalizeToBuffer(docWithoutProof));

  // Order matters and is normative: proof-config hash first, document hash second.
  return Buffer.concat([proofConfigHash, transformedDocumentHash]);
}

/**
 * Create a DataIntegrityProof for a document using Ed25519.
 *
 * @param document - The document to sign
 * @param privateKeyBytes - Ed25519 private key (32 bytes)
 * @param verificationMethod - DID URL of the verification method (e.g. did:trail:self:z6Mk...#key-1)
 * @param proofPurpose - Proof purpose (default: assertionMethod)
 * @param cryptosuite - Cryptosuite to use (default: eddsa-jcs-2022). Enables crypto agility.
 */
export function createProof(
  document: object,
  privateKeyBytes: Uint8Array,
  verificationMethod: string,
  proofPurpose: string = 'assertionMethod',
  cryptosuite: SupportedCryptosuite = DEFAULT_CRYPTOSUITE
): DataIntegrityProof {
  if (!isSupportedCryptosuite(cryptosuite)) {
    throw new Error(
      `Unsupported cryptosuite: "${cryptosuite}". ` +
      `Supported: ${SUPPORTED_CRYPTOSUITES.filter(s => s.status === 'active').map(s => s.id).join(', ')}`
    );
  }

  const proofConfig: Omit<DataIntegrityProof, 'proofValue'> = {
    type: 'DataIntegrityProof',
    cryptosuite,
    created: new Date().toISOString(),
    verificationMethod,
    proofPurpose,
  };

  const hashData = computeHashData(document, proofConfig);
  const privateKey = createPrivateKeyObject(privateKeyBytes);
  const signature = sign(null, hashData, privateKey);
  const proofValue = encodeMultibase(new Uint8Array(signature));

  return { ...proofConfig, proofValue };
}

/**
 * Verify a DataIntegrityProof against a document using Ed25519.
 *
 * Supports crypto agility: verifies any proof whose cryptosuite is in the
 * SUPPORTED_CRYPTOSUITES registry and has status 'active'.
 */
export function verifyProof(
  document: object,
  proof: DataIntegrityProof,
  publicKeyBytes: Uint8Array
): boolean {
  if (proof.type !== 'DataIntegrityProof') return false;
  if (!isSupportedCryptosuite(proof.cryptosuite)) return false;

  try {
    // The proof configuration is every proof field except proofValue —
    // reconstructing it here (rather than recomputing it from scratch) is
    // what makes tampering with verificationMethod/created/proofPurpose/
    // cryptosuite detectable: any change here changes proofConfigHash and
    // therefore hashData, so the signature no longer verifies.
    const { proofValue, ...proofConfig } = proof;

    const hashData = computeHashData(document, proofConfig);
    const signature = decodeMultibase(proofValue);
    const publicKey = createPublicKeyObject(publicKeyBytes);

    return verify(null, hashData, publicKey, Buffer.from(signature));
  } catch {
    return false;
  }
}
