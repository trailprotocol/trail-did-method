<!-- Sync Impact Report
Version change: 1.0.0 → 1.1.0
Added: IV. Federation as First-Class Operation, V. Cross-Method Binding via alsoKnownAs, VI. Backward-Compatible Versioning
Templates requiring updates: ✅ constitution.md
Follow-up TODOs: ratification date requires founder confirmation
-->

# TRAIL DID Method Constitution

## Core Principles

### I. W3C Conformance (NON-NEGOTIABLE)

TRAIL DIDs MUST be W3C DID Core 1.0 compliant at all times.

- Every did:trail DID Document MUST pass W3C DID Core 1.0 validation
- The `id`, `verificationMethod`, `authentication`, and `assertionMethod` fields MUST follow W3C DID Core
- No custom fields may override or shadow W3C-defined fields
- Spec changes that break W3C conformance MUST NOT be merged without a constitution amendment

### II. Public Vocabulary Boundary (NON-NEGOTIABLE)

TRAIL DIDs MUST NOT expose internal vocabulary in public artifacts.

- Commit messages, spec texts, Registry YAML, and npm-published packages MUST use W3C/DIF/public terminology only
- Internal identifiers (Eisenhower-Task-IDs, private roadmap filenames, company-internal framing, private email addresses, local file paths) MUST NOT appear in any git-tracked file on a public remote
- The `preflight-public-commit.sh` script enforces this at push time as Gate 1
- Violations discovered post-publish require immediate revert + audit cascade

### III. Spec-First Development

Spec changes MUST precede code changes for all protocol-level modifications.

- Any change to did:trail resolution logic, key formats, or trust anchors MUST be specified in `spec/` first
- A spec PR MUST be reviewed before the corresponding implementation PR is opened
- The TRAIL Projektgedaechtnis MUST be read at the start of every spec-edit session (Gate 2)

### IV. Federation as First-Class Operation

TRAIL federation assertions MUST include a verifiable trust chain from issuer to subject.

- Federation is a first-class protocol operation; it MUST NOT be implemented as an extension
- Every federation assertion MUST carry a `trustChain` field linking issuer DID to subject DID
- Federation semantics MUST be specified before any implementation PR is opened

### V. Cross-Method Binding via alsoKnownAs

Cross-method DID binding MUST use the W3C DID Core `alsoKnownAs` property exclusively.

- The TRAIL protocol MUST NOT introduce dependencies on specific third-party DID methods for binding resolution
- External method references in `alsoKnownAs` MUST be publicly resolvable DIDs
- Cross-method binding MUST NOT require proprietary resolvers

### VI. Backward-Compatible Versioning

TRAIL spec changes to resolution logic, key formats, or trust anchors MUST be backward-compatible within a MAJOR version.

- Breaking changes MUST increment the MAJOR version and be documented in `CHANGELOG.md`
- Non-breaking additions (new optional fields, new DID operations) MAY increment the MINOR version
- Patch versions are reserved for editorial corrections with no semantic change

## Security Constraints

- Ed25519 keys MUST be used for all verification methods in the current version
- Recovery keys MUST be stored in a separate, offline-accessible vault (Keeper or equivalent)
- Revocation endpoints MUST respond within the defined cache TTL (1 hour maximum)
- Key fingerprints MUST be documented in the infrastructure audit trail

## Governance

- This constitution supersedes all other TRAIL development practices
- Amendments require: (1) documented rationale, (2) version bump, (3) TRAIL Projektgedaechtnis entry
- All spec PRs and public commits are subject to Gate 1 (preflight script) and Gate 2 (this constitution)
- Complexity MUST be justified against the W3C DID Core spec or EU AI Act compliance requirements
- Runtime development guidance: `CONTRIBUTING.md` and `TRAIL Projektgedaechtnis`

**Version**: 1.1.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm founding date | **Last Amended**: 2026-04-25
