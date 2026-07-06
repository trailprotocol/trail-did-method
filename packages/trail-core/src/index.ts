// TRAIL Protocol Core SDK
// https://trailprotocol.org
// License: Apache-2.0

export { generateKeyPair, publicKeyFromMultibase } from './keygen';
export { createSelfDid, createOrgDid, createAgentDid, parseTrailDid, normalizeSlug, computeTrailHash } from './did';
export { createDidDocument, rotateKey, SPEC_VERSION } from './document';
export { TrailResolver, extractPublicKeyFromSelfDid } from './resolver';
export { createProof, verifyProof, isSupportedCryptosuite, DEFAULT_CRYPTOSUITE } from './proof';
export { createSelfSignedCredential, verifyCredential, createBindingProofCredential, verifyBindingProof } from './credential';
export type { CreateBindingProofOptions, VerifyBindingProofInput, BindingProofVerificationResult, VerificationResult } from './credential';
export { encodeMultibase, decodeMultibase } from './base58';
export { jcsCanonicalizeToString, jcsCanonicalizeToBuffer } from './jcs';

export type {
  TrailKeyPair,
  TrailMode,
  DidDocument,
  DidResolutionResult,
  VerificationMethod,
  ServiceEndpoint,
  DataIntegrityProof,
  VerifiableCredential,
  BindingProofCredential,
  BindingProofBinding,
  StatusList2021Entry,
  RecoveryPolicy,
  SupportedCryptosuite,
} from './types';

export { SUPPORTED_CRYPTOSUITES } from './types';
export type { KeyRotationMetadata } from './document';
