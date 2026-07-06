export interface TrailKeyPair {
  publicKeyBytes: Uint8Array;
  privateKeyBytes: Uint8Array;
  publicKeyJwk: JsonWebKey;
  publicKeyMultibase: string;
}

export type TrailMode = 'org' | 'agent' | 'self';

export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyJwk: JsonWebKey;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface RecoveryPolicy {
  type: string;
  threshold?: number;
  contacts?: string[];
}

export interface DidDocument {
  '@context': string[];
  id: string;
  controller?: string;
  alsoKnownAs?: string[];
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  service?: ServiceEndpoint[];
  'trail:aiSystemType'?: string;
  'trail:euAiActRiskClass'?: string;
  'trail:parentOrganization'?: string;
  'trail:trailMode'?: string;
  'trail:trailTrustTier'?: number;
  'trail:recoveryPolicy'?: RecoveryPolicy;
  'trail:specVersion'?: string;
  'trail:supportedCryptosuites'?: string[];
}

export interface DidResolutionResult {
  didDocument: DidDocument;
  didDocumentMetadata: Record<string, unknown>;
  didResolutionMetadata: Record<string, unknown>;
}

/**
 * Supported cryptosuites for DataIntegrityProof.
 * Currently only eddsa-jcs-2023 is implemented; this type enables crypto agility
 * by allowing future suites to be added without breaking changes.
 */
export type SupportedCryptosuite = 'eddsa-jcs-2023';

export interface DataIntegrityProof {
  type: 'DataIntegrityProof';
  cryptosuite: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue: string;
}

/**
 * Registry of supported cryptosuites and their metadata.
 * Used for crypto agility: implementations MUST support at least eddsa-jcs-2023,
 * and MAY support additional suites listed here.
 */
export const SUPPORTED_CRYPTOSUITES: ReadonlyArray<{
  id: SupportedCryptosuite;
  algorithm: string;
  canonicalization: string;
  keyType: string;
  status: 'active' | 'deprecated';
}> = [
  {
    id: 'eddsa-jcs-2023',
    algorithm: 'Ed25519',
    canonicalization: 'JCS (RFC 8785)',
    keyType: 'OKP',
    status: 'active',
  },
];

/**
 * StatusList2021Entry — credentialStatus entry per W3C VC Status List 2021.
 * Used for per-credential revocation. See spec §8.7.
 */
export interface StatusList2021Entry {
  id: string;
  type: 'StatusList2021Entry';
  statusPurpose: string;
  statusListIndex: string;
  statusListCredential: string;
}

export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  issuer: string;
  /**
   * VC 1.1 issuance date. Present on TrailIdentityCredential and other
   * VC 1.1-context credentials. Optional so VC 2.0 credentials
   * (validFrom/validUntil) can omit it.
   */
  issuanceDate?: string;
  /** VC 2.0 validity start (RFC 3339). */
  validFrom?: string;
  /** VC 2.0 validity end (RFC 3339). */
  validUntil?: string;
  credentialSubject: Record<string, unknown>;
  /** Revocation status entry (StatusList2021 per §8.7). */
  credentialStatus?: StatusList2021Entry;
  proof?: DataIntegrityProof;
}

/**
 * The signed `binding` object inside a BindingProofCredential's
 * credentialSubject. See spec §5.4.5.
 *
 * `from` MUST equal the credential's `issuer`.
 * `to`   MUST equal the credential's `credentialSubject.id`.
 * `direction` is intentionally absent — reserved for a future "inbound"
 * attestation type and fully determined by `from == issuer` for the
 * outbound case (§5.4.5.2).
 */
export interface BindingProofBinding {
  from: string;
  to: string;
  boundAt: string;
}

/**
 * BindingProofCredential — one leg of a reciprocal cross-method binding.
 * A verified binding requires two of these, one signed by each controller,
 * each outbound from its own issuer's perspective. See spec §5.4.5.
 *
 * This is a structural refinement of VerifiableCredential: it fixes the
 * VC 2.0 context/validity shape and requires credentialStatus + a
 * credentialSubject carrying { id, binding }.
 */
export interface BindingProofCredential extends VerifiableCredential {
  validFrom: string;
  validUntil: string;
  credentialStatus: StatusList2021Entry;
  credentialSubject: {
    id: string;
    binding: BindingProofBinding;
    [key: string]: unknown;
  };
}
