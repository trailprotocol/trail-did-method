import { sign, verify, createHash } from 'node:crypto';
import { encodeMultibase, decodeMultibase } from './base58';
import { createPrivateKeyObject, createPublicKeyObject } from './keygen';
import { jcsCanonicalizeToBuffer } from './jcs';
import type { DataIntegrityProof, SupportedCryptosuite } from './types';
import { SUPPORTED_CRYPTOSUITES } from './types';

/**
 * Default cryptosuite used when none is specified.
 */
export const DEFAULT_CRYPTOSUITE: SupportedCryptosuite = 'eddsa-jcs-2023';

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
 * Recursively assert that every numeric value is a safe-range integer, per the
 * §14.5 normative constraint:
 *
 *   "TRAIL signed payloads MUST use integer numeric values within the IEEE-754
 *    safe integer range (|n| <= 2^53 - 1). Fractional and exponential numbers
 *    MUST NOT appear in a payload that is canonicalized for signing."
 *
 * The constraint governs which *values* may be signed, not how canonicalization
 * serializes them — `jcs.ts` remains a faithful RFC 8785 implementation, which
 * matters now that §14.5 is deliberately stricter than 8785.
 *
 * Exponential notation needs no separate check: ES2015 `Number.toString()` only
 * emits it for magnitudes at or above 1e21 (or for fractional values), and both
 * are already rejected by the safe-range and integer checks respectively.
 *
 * `path` is threaded through so the error names the offending field rather than
 * leaving the caller to hunt for it.
 */
function assertSignableNumerics(value: unknown, path: string): void {
  if (typeof value === 'number') {
    const at = path || '(root)';
    if (!Number.isFinite(value)) {
      throw new RangeError(
        `§14.5: non-finite number at "${at}"; NaN and Infinity are not valid JSON`
      );
    }
    if (!Number.isInteger(value)) {
      throw new RangeError(
        `§14.5: fractional number ${value} at "${at}"; signed payloads must use integer values`
      );
    }
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(
        `§14.5: ${value} at "${at}" is outside the IEEE-754 safe integer range (|n| <= 2^53 - 1)`
      );
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, i) => assertSignableNumerics(item, `${path}[${i}]`));
    return;
  }

  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      assertSignableNumerics(child, path ? `${path}.${key}` : key);
    }
  }
}

/**
 * Enforce §14.5 over a document about to be signed.
 *
 * Scoped to the document, deliberately: the proof configuration is entirely
 * strings, so validating it would be surface without benefit.
 *
 * Sign-side only. `verifyProof` does not call this — enforcing on the verify
 * path would reject previously-issued payloads, which is a compatibility break
 * in principle, and 0.3.0 already spent one this cycle.
 */
function assertSignableDocument(document: object): void {
  for (const [key, value] of Object.entries(document as Record<string, unknown>)) {
    if (key === 'proof') continue;
    assertSignableNumerics(value, key);
  }
}

/**
 * Compute the "hash data" that gets signed (createProof) / re-derived
 * (verifyProof) for the eddsa-jcs-2023 cryptosuite.
 *
 * Conformance fix: per the W3C Data Integrity EdDSA cryptosuite
 * algorithm (VC-DI-EDDSA §3.3 "eddsa-jcs-2023" — Transformation §3.3.3,
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
 * @param cryptosuite - Cryptosuite to use (default: eddsa-jcs-2023). Enables crypto agility.
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

  // §14.5: signed payloads carry safe-range integers only. Enforced here, at
  // the point the payload is assembled for signing, rather than inside
  // canonicalization — see the note on assertSignableDocument.
  assertSignableDocument(document);

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
