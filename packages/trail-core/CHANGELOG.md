# Changelog

All notable changes to `@trailprotocol/core` are documented in this file.

## Unreleased

### Fixed

- **Cryptosuite identifier corrected `eddsa-jcs-2023` → `eddsa-jcs-2022`
  (breaking).** The W3C Data Integrity EdDSA Cryptosuites specification
  defines only `eddsa-rdfc-2022` and `eddsa-jcs-2022`, and requires a proof's
  `cryptosuite` to be one of them. `eddsa-jcs-2023` does not exist, so
  conformant verifiers rejected every proof this package produced as an
  unknown suite. The hashing and signing algorithm already matched
  `eddsa-jcs-2022` and is unchanged. Only the identifier changes:
  `SupportedCryptosuite`, `SUPPORTED_CRYPTOSUITES`, `DEFAULT_CRYPTOSUITE`,
  and the `trail:supportedCryptosuites` value on generated and resolved DID
  Documents. Because `cryptosuite` is part of the signed proof
  configuration, proofs created by 0.3.0 and earlier do not verify under this
  version, and proofs created by this version do not verify under 0.3.0.
  The six `BindingProof` vectors in `validation/fixtures/` were re-signed
  under the corrected identifier. The original signing keys were not in the
  repository, so the vectors use new deterministic keys, and the DIDs derived
  from those keys change too. Spec: `did-method-trail-v1.md` §16 v1.3.0-draft
  row 7.

- Regenerated the six `BindingProof` test vectors in `validation/fixtures/`
  against the 0.3.0 hashing path. The 0.3.0 proof-config binding invalidated
  the previously signed vectors: the valid pair no longer verified, and four
  of the invalid vectors failed step 4 alongside their intended step, losing
  the single-step isolation that makes them useful to implementers. Each
  vector now records the version and construction it was signed with.

- The roundtrip suite now loads those vectors from disk and asserts
  single-step isolation rather than mere failure. Nothing previously executed
  them, so a change to the signing algorithm could not fail anything —
  asserting `verified === false` would have passed on the stale vectors.
  Suite goes 67 → 73 tests.

The two vector entries above are fixtures and tests only; nothing shipped in
`dist/` changed. Contributed by Amey Parle in [#26](https://github.com/trailprotocol/trail-did-method/pull/26).

## 0.3.0

**eddsa-jcs-2023 W3C conformance fix.**

### Fixed

- `createProof()` / `verifyProof()` (`src/proof.ts`) now implement the
  cryptosuite's mandated hashing algorithm instead of signing the
  canonicalized document alone. Per the W3C Data Integrity EdDSA cryptosuite
  algorithm for JCS-based suites (Transformation, Proof Configuration, and
  Hashing steps — the same family `eddsa-jcs-2023` belongs to; see
  `spec/did-method-trail-v1.md` §8.2 for the suite's normative registration
  in this specification), the bytes that get signed are:

  ```
  hashData = sha256(JCS(proofConfig)) || sha256(JCS(documentWithoutProof))
  ```

  where `proofConfig` is every proof field except `proofValue` (`type`,
  `cryptosuite`, `created`, `verificationMethod`, `proofPurpose`),
  canonicalized and hashed independently, then concatenated
  (proof-config hash first) with the document hash before signing.

  Previously, `createProof()` signed `JCS(document)` alone — the proof's own
  metadata was never part of what got hashed and signed. That meant
  `verificationMethod`, `created`, `proofPurpose`, and `cryptosuite` on an
  already-signed proof could be swapped out post-signing without breaking
  signature verification, since `verifyProof()` never checked them against
  anything the signature actually covered. This is now closed: any mutation
  to those fields changes `proofConfigHash` and therefore `hashData`, so the
  signature no longer verifies. See `test/roundtrip.test.ts` (`DataIntegrityProof`
  describe block) for regression tests pinning this down.

- No change to the JCS canonicalization algorithm itself (`src/jcs.ts`,
  RFC 8785) — that was already conformant per the §14.4/§14.5 test vectors.
  This release adds executable tests asserting `jcs.ts` output
  matches those spec test vectors byte-for-byte (previously only documented
  as prose in the spec appendix, not exercised by the test suite).

### Compatibility

- Breaking for byte-level signature compatibility: proofs created with
  0.2.0 and earlier will **not** verify under 0.3.0's `verifyProof()` (the
  signed byte sequence changed), and proofs created with 0.3.0 will not
  verify under 0.2.0's `verifyProof()`. There is no persisted TRAIL
  production data signed under the old scheme to migrate — this closes a
  conformance gap before any external verifier depends on the old,
  non-conformant byte sequence.
- No change to the `DataIntegrityProof` TypeScript type, the `cryptosuite`
  identifier (`eddsa-jcs-2023`), multibase/multikey encoding, or any public
  function signature in `src/proof.ts`. Callers do not need code changes.
- Deliberate scope decision: the proof configuration does **not** echo the
  document's `@context` (a nuance of the full W3C algorithm that mainly
  matters for JSON-LD/RDF dataset canonicalization suites). This
  implementation canonicalizes documents as plain JSON via JCS, not as RDF
  datasets, and `DataIntegrityProof` has no `@context` field — adding one
  would be a type/shape change, which is out of scope for a conformance
  patch release. Flagged here for visibility, not acted on.
