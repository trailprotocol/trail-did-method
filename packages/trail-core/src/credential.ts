import { createProof, verifyProof } from './proof';
import type {
  VerifiableCredential,
  DataIntegrityProof,
  BindingProofCredential,
  StatusList2021Entry,
  DidDocument,
} from './types';

/**
 * Create a self-signed Verifiable Credential.
 * Self-signed VCs carry Trust Tier 0 (cryptographic proof only, no third-party verification).
 */
export function createSelfSignedCredential(
  issuerDid: string,
  subjectDid: string,
  claims: Record<string, unknown>,
  privateKeyBytes: Uint8Array
): VerifiableCredential {
  const vc: VerifiableCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://trailprotocol.org/ns/credentials/v1',
    ],
    type: ['VerifiableCredential', 'TrailIdentityCredential'],
    issuer: issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subjectDid,
      trailTrustTier: 0,
      ...claims,
    },
  };

  const proof = createProof(
    vc,
    privateKeyBytes,
    `${issuerDid}#key-1`,
    'assertionMethod'
  );

  return { ...vc, proof };
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Verify a Verifiable Credential's proof and structure.
 */
export function verifyCredential(
  vc: VerifiableCredential,
  publicKeyBytes: Uint8Array
): VerificationResult {
  const errors: string[] = [];

  // Check required fields
  if (!vc['@context'] || !Array.isArray(vc['@context'])) {
    errors.push('Missing or invalid @context');
  }
  if (!vc.type || !Array.isArray(vc.type)) {
    errors.push('Missing or invalid type');
  }
  if (!vc.type?.includes('VerifiableCredential')) {
    errors.push('type must include VerifiableCredential');
  }
  if (!vc.issuer) {
    errors.push('Missing issuer');
  }
  if (!vc.issuanceDate) {
    errors.push('Missing issuanceDate');
  }
  if (!vc.credentialSubject) {
    errors.push('Missing credentialSubject');
  }

  // Check proof
  if (!vc.proof) {
    errors.push('Missing proof');
    return { valid: false, errors };
  }

  const proofValid = verifyProof(vc, vc.proof as DataIntegrityProof, publicKeyBytes);
  if (!proofValid) {
    errors.push('Proof verification failed: signature invalid');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// BindingProofCredential (spec §5.4.5)
// ---------------------------------------------------------------------------

const VC_V2_CONTEXT = 'https://www.w3.org/ns/credentials/v2';
const TRAIL_CREDENTIALS_V2_CONTEXT = 'https://trailprotocol.org/ns/credentials/v2';

export interface CreateBindingProofOptions {
  /** DID signing (and asserting) this leg. Becomes issuer and binding.from. */
  issuerDid: string;
  /** Counterpart DID being bound to. Becomes credentialSubject.id and binding.to. */
  subjectDid: string;
  /** Ed25519 private key of the issuer. */
  privateKeyBytes: Uint8Array;
  /** StatusList2021 entry on the issuer's own status list (§8.7). */
  credentialStatus: StatusList2021Entry;
  /** ISO 8601 validity start. */
  validFrom: string;
  /** ISO 8601 validity end. SHOULD NOT exceed 12 months after validFrom. */
  validUntil: string;
  /** ISO 8601 attestation time. Defaults to validFrom if omitted. */
  boundAt?: string;
  /** Verification method fragment on the issuer DID. Defaults to '#key-1'. */
  keyFragment?: string;
}

/**
 * Create one leg of a BindingProofCredential (§5.4.5).
 *
 * Produces a single outbound credential from the issuer's perspective:
 * `binding.from == issuer` and `binding.to == credentialSubject.id`.
 * A verified cross-method binding requires TWO of these — one signed by
 * each controller — which is the caller's responsibility to assemble.
 */
export function createBindingProofCredential(
  options: CreateBindingProofOptions
): BindingProofCredential {
  const boundAt = options.boundAt ?? options.validFrom;
  const keyFragment = options.keyFragment ?? '#key-1';

  const vc: Omit<BindingProofCredential, 'proof'> = {
    '@context': [VC_V2_CONTEXT, TRAIL_CREDENTIALS_V2_CONTEXT],
    type: ['VerifiableCredential', 'BindingProofCredential'],
    issuer: options.issuerDid,
    validFrom: options.validFrom,
    validUntil: options.validUntil,
    credentialSubject: {
      id: options.subjectDid,
      binding: {
        from: options.issuerDid,
        to: options.subjectDid,
        boundAt,
      },
    },
    credentialStatus: options.credentialStatus,
  };

  const proof = createProof(
    vc,
    options.privateKeyBytes,
    `${options.issuerDid}${keyFragment}`,
    'assertionMethod'
  );

  return { ...vc, proof };
}

/**
 * Inputs a caller must supply to verify a binding. Because trail-core does no
 * network IO, DID resolution and StatusList fetching are the caller's job
 * (consistent with the §5.4.5.3 verifier steps): the caller resolves both DID
 * Documents, extracts the signing public keys, and determines revocation state,
 * then passes the results here.
 */
export interface VerifyBindingProofInput {
  /** BindingProofCredential issued by the did:trail controller. */
  trailCredential: BindingProofCredential;
  /** Reciprocal BindingProofCredential issued by the foreign DID controller. */
  foreignCredential: BindingProofCredential;
  /** Resolved DID Document of the did:trail side. */
  trailDidDocument: DidDocument;
  /** Resolved DID Document of the foreign side. */
  foreignDidDocument: DidDocument;
  /** Ed25519 public key that signed trailCredential. */
  trailPublicKeyBytes: Uint8Array;
  /** Ed25519 public key that signed foreignCredential. */
  foreignPublicKeyBytes: Uint8Array;
  /**
   * Revocation state, determined by the caller from each issuer's StatusList
   * (§5.4.5.3 step 7 / §5.4.5.5). trail-core does not fetch status lists.
   */
  revocation: {
    trailCredentialRevoked: boolean;
    foreignCredentialRevoked: boolean;
  };
  /**
   * Signing-key revocation state at verification time (§5.4.5.3 step 5).
   * The stricter "key active at boundAt" check is deferred per the spec;
   * this is the scoped-down "not revoked now" check. Defaults to
   * { trail: false, foreign: false } when omitted.
   */
  keyRevocation?: {
    trailSigningKeyRevoked: boolean;
    foreignSigningKeyRevoked: boolean;
  };
  /** Verification-time instant (ISO 8601). Defaults to now. Used for the validity window. */
  now?: string;
}

export interface BindingProofVerificationResult {
  /** True only if the binding is cryptographically verified per all §5.4.5.3 steps. */
  verified: boolean;
  /** Human-readable failure reasons, keyed loosely to the §5.4.5.3 step that failed. */
  errors: string[];
}

/**
 * Verify a cross-method binding is cryptographically verified per §5.4.5.3.
 *
 * Pure function: no network IO. The caller resolves DID Documents, extracts
 * signing keys, and supplies revocation state. Returns `verified: true` only
 * when every applicable step passes for BOTH reciprocal credentials.
 *
 * Note on the §5.4.2 alsoKnownAs precondition (step 1): this function checks
 * the bidirectional alsoKnownAs references on the two supplied DID Documents.
 * The stricter "key was active at boundAt" part of step 5 is deferred per the
 * spec; boundAt is validated for shape but not used as a point-in-time key
 * check.
 */
export function verifyBindingProof(
  input: VerifyBindingProofInput
): BindingProofVerificationResult {
  const errors: string[] = [];
  const now = input.now ?? new Date().toISOString();
  const keyRevocation = input.keyRevocation ?? {
    trailSigningKeyRevoked: false,
    foreignSigningKeyRevoked: false,
  };

  const trailDid = input.trailDidDocument.id;
  const foreignDid = input.foreignDidDocument.id;

  // Step 1 — §5.4.2 bidirectional alsoKnownAs on both DID Documents.
  const trailAka = input.trailDidDocument.alsoKnownAs ?? [];
  const foreignAka = input.foreignDidDocument.alsoKnownAs ?? [];
  if (!trailAka.includes(foreignDid)) {
    errors.push(
      `Step 1: did:trail document does not list foreign DID in alsoKnownAs (${foreignDid})`
    );
  }
  if (!foreignAka.includes(trailDid)) {
    errors.push(
      `Step 1: foreign document does not list did:trail DID in alsoKnownAs (${trailDid})`
    );
  }

  // Steps 2 & 3 — reciprocal credentials exist with correct issuer/binding orientation.
  const t = input.trailCredential;
  const f = input.foreignCredential;

  if (!isBindingProofShape(t)) {
    errors.push('Step 2: trailCredential is not a well-formed BindingProofCredential');
  }
  if (!isBindingProofShape(f)) {
    errors.push('Step 3: foreignCredential is not a well-formed BindingProofCredential');
  }

  // Only continue orientation checks if the basic shape held, to avoid
  // dereferencing undefined fields.
  if (isBindingProofShape(t)) {
    // trail leg: issuer == trailDid, binding.from == issuer, binding.to == foreignDid
    if (t.issuer !== trailDid) {
      errors.push(`Step 2: trailCredential.issuer (${t.issuer}) does not match resolved did:trail DID (${trailDid})`);
    }
    if (t.credentialSubject.binding.from !== t.issuer) {
      errors.push('Step 2: trailCredential binding.from does not equal issuer');
    }
    if (t.credentialSubject.id !== t.credentialSubject.binding.to) {
      errors.push('Step 2: trailCredential credentialSubject.id does not equal binding.to');
    }
    if (t.credentialSubject.binding.to !== foreignDid) {
      errors.push(`Step 2: trailCredential binding.to (${t.credentialSubject.binding.to}) does not match foreign DID (${foreignDid})`);
    }
  }

  if (isBindingProofShape(f)) {
    if (f.issuer !== foreignDid) {
      errors.push(`Step 3: foreignCredential.issuer (${f.issuer}) does not match resolved foreign DID (${foreignDid})`);
    }
    if (f.credentialSubject.binding.from !== f.issuer) {
      errors.push('Step 3: foreignCredential binding.from does not equal issuer');
    }
    if (f.credentialSubject.id !== f.credentialSubject.binding.to) {
      errors.push('Step 3: foreignCredential credentialSubject.id does not equal binding.to');
    }
    if (f.credentialSubject.binding.to !== trailDid) {
      errors.push(`Step 3: foreignCredential binding.to (${f.credentialSubject.binding.to}) does not match did:trail DID (${trailDid})`);
    }
  }

  // Step 4 — proofs verify against a key in the issuer's assertionMethod set.
  // We check both that the verificationMethod is listed in assertionMethod AND
  // that the signature verifies against the supplied public key.
  verifyLegProof(t, input.trailDidDocument, input.trailPublicKeyBytes, 'Step 4 (trail)', errors);
  verifyLegProof(f, input.foreignDidDocument, input.foreignPublicKeyBytes, 'Step 4 (foreign)', errors);

  // Step 5 — signing key not revoked at verification time (scoped; "active at
  // boundAt" deferred per spec).
  if (keyRevocation.trailSigningKeyRevoked) {
    errors.push('Step 5: trail signing key is revoked at verification time');
  }
  if (keyRevocation.foreignSigningKeyRevoked) {
    errors.push('Step 5: foreign signing key is revoked at verification time');
  }

  // Step 6 — both credentials within validFrom / validUntil at `now`.
  checkValidityWindow(t, now, 'Step 6 (trail)', errors);
  checkValidityWindow(f, now, 'Step 6 (foreign)', errors);

  // Step 7 — neither credential revoked per its credentialStatus.
  if (input.revocation.trailCredentialRevoked) {
    errors.push('Step 7: trailCredential is revoked per its credentialStatus');
  }
  if (input.revocation.foreignCredentialRevoked) {
    errors.push('Step 7: foreignCredential is revoked per its credentialStatus');
  }

  return { verified: errors.length === 0, errors };
}

/** Structural guard: does this object have the required BindingProofCredential shape? */
function isBindingProofShape(vc: VerifiableCredential): vc is BindingProofCredential {
  const cs = vc.credentialSubject as Record<string, unknown> | undefined;
  const binding = cs?.['binding'] as Record<string, unknown> | undefined;
  return (
    Array.isArray(vc.type) &&
    vc.type.includes('BindingProofCredential') &&
    typeof vc.issuer === 'string' &&
    typeof vc.validFrom === 'string' &&
    typeof vc.validUntil === 'string' &&
    !!vc.credentialStatus &&
    !!cs &&
    typeof cs['id'] === 'string' &&
    !!binding &&
    typeof binding['from'] === 'string' &&
    typeof binding['to'] === 'string' &&
    typeof binding['boundAt'] === 'string'
  );
}

/** Verify one leg's proof: assertionMethod membership + signature. */
function verifyLegProof(
  vc: BindingProofCredential,
  didDoc: DidDocument,
  publicKeyBytes: Uint8Array,
  label: string,
  errors: string[]
): void {
  if (!vc.proof) {
    errors.push(`${label}: credential has no proof`);
    return;
  }
  const vm = vc.proof.verificationMethod;
  if (!didDoc.assertionMethod?.includes(vm)) {
    errors.push(`${label}: proof verificationMethod (${vm}) is not in issuer assertionMethod set`);
    return;
  }
  const ok = verifyProof(vc, vc.proof as DataIntegrityProof, publicKeyBytes);
  if (!ok) {
    errors.push(`${label}: signature verification failed`);
  }
}

/** Check `now` falls within [validFrom, validUntil]. */
function checkValidityWindow(
  vc: BindingProofCredential,
  now: string,
  label: string,
  errors: string[]
): void {
  const nowMs = Date.parse(now);
  const fromMs = Date.parse(vc.validFrom);
  const untilMs = Date.parse(vc.validUntil);
  if (Number.isNaN(fromMs) || Number.isNaN(untilMs)) {
    errors.push(`${label}: validFrom/validUntil not parseable`);
    return;
  }
  if (nowMs < fromMs) {
    errors.push(`${label}: current time is before validFrom`);
  }
  if (nowMs > untilMs) {
    errors.push(`${label}: current time is after validUntil`);
  }
}
