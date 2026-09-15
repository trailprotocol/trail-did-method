# TRAIL Protocol — did:trail DID Method

**Trust Registry for AI Identity Layer**

[![W3C DID Core 1.0](https://img.shields.io/badge/W3C-DID%20Core%201.0-blue)](https://www.w3.org/TR/did-core/)
[![VC Data Model 2.0](https://img.shields.io/badge/W3C-VC%202.0-blue)](https://www.w3.org/TR/vc-data-model-2.0/)
[![DID Extensions Registry](https://img.shields.io/badge/W3C-Registered-brightgreen)](https://github.com/w3c/did-extensions)
[![DIF Contributor](https://img.shields.io/badge/DIF-Contributor-blue)](https://identity.foundation)
[![W3C CCG Member](https://img.shields.io/badge/W3C%20CCG-Member-blue)](https://www.w3.org/community/credentials/)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Status: Draft](https://img.shields.io/badge/Spec-v1.3.0--draft-orange)](https://github.com/trailprotocol/trail-did-method/issues)
[![GitHub stars](https://img.shields.io/github/stars/trailprotocol/trail-did-method?style=social)](https://github.com/trailprotocol/trail-did-method/stargazers)

> **If you believe AI agents need verifiable identity, star this repo** - it helps others discover the standard.

---

## What is TRAIL?

TRAIL (Trust Registry for AI Identity Layer) is an open cryptographic trust protocol for AI systems and autonomous agents operating in B2B commerce environments.

As AI agents increasingly act on behalf of organizations — negotiating contracts, providing advice, executing decisions — there is no infrastructure to answer the fundamental question: **"Can I trust this AI system?"**

TRAIL solves this by providing:
- **Decentralized Identifiers** (`did:trail`) for AI systems and the organizations behind them
- **Verifiable Credentials** attesting to AI identity, policy, and behavior standards
- **Cross-method binding** with cryptographic proof of mutual consent (§5.4.5)
- **Content provenance** binding AI-generated artifacts to an accountable organization (§8.13)
- **Revocation mechanisms** that create real economic consequences for misuse
- **3-Tier Trust Model** — from local self-signed verification to fully audited registry credentials
- **Federated trust anchors** — no single root of trust (§3.4)
- Support for organizational **EU AI Act compliance** alignment (Articles 13, 14, 26, 49, 52)

**TRAIL is not a blockchain.** It builds on established web infrastructure (W3C DID Core 1.0, VC 2.0, Ed25519) — the same standards that underpin Europe's eIDAS 2.0 digital identity infrastructure.

---

## Quick Start

```bash
# Install
npm install @trailprotocol/core

# Generate an Ed25519 keypair
npx @trailprotocol/core keygen

# Create a self-signed DID (works offline, no registry needed)
npx @trailprotocol/core did create --mode self

# Resolve a self-signed DID
npx @trailprotocol/core did resolve did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

CLI commands: `keygen`, `did create`, `did resolve`, `vc create`, `vc verify`.

### Programmatic Usage

```typescript
import {
  generateKeyPair,
  createSelfDid,
  createOrgDid,
  TrailResolver,
  createSelfSignedCredential,
  verifyCredential,
} from '@trailprotocol/core';

// Generate keys
const keys = generateKeyPair();

// Create DIDs
const selfDid = createSelfDid(keys.publicKeyMultibase);
const orgDid = createOrgDid('ACME Corporation', keys.publicKeyMultibase);

// Resolve (self-mode works offline)
const resolver = new TrailResolver();
const result = await resolver.resolve(selfDid);
console.log(result.didDocument);

// Create and verify a credential
const vc = createSelfSignedCredential(selfDid, orgDid, { role: 'operator' }, keys.privateKeyBytes);
const verification = verifyCredential(vc, keys.publicKeyBytes);
console.log(verification.valid); // true
```

### Cross-Method Binding (§5.4.5)

A `did:trail` DID can declare equivalence with DIDs from other methods via `alsoKnownAs`. On its own that is two unsigned declarations — either side could be added without the other's consent. `BindingProofCredential` upgrades it to cryptographically signed mutual consent: two reciprocal credentials, one signed by each controller.

```typescript
import {
  createBindingProofCredential,
  verifyBindingProof,
} from '@trailprotocol/core';

// Each controller signs its own outbound leg
const trailLeg = createBindingProofCredential({
  issuerDid: trailDid,
  subjectDid: foreignDid,
  privateKeyBytes: trailKeys.privateKeyBytes,
  credentialStatus: trailStatusEntry,
  validFrom: '2026-06-15T00:00:00Z',
  validUntil: '2027-06-15T00:00:00Z',
});

// Verification is a pure function — the caller resolves DID Documents
// and supplies revocation state; trail-core performs no network IO.
const result = verifyBindingProof({
  trailCredential: trailLeg,
  foreignCredential: foreignLeg,
  trailDidDocument,
  foreignDidDocument,
  trailPublicKeyBytes: trailKeys.publicKeyBytes,
  foreignPublicKeyBytes: foreignKeys.publicKeyBytes,
  revocation: { trailCredentialRevoked: false, foreignCredentialRevoked: false },
});

console.log(result.verified); // true
console.log(result.errors);   // [] — errors cite the §5.4.5.3 step that failed
```

A verified pair proves both controllers **consented** to the binding. It does not prove they are two distinct entities — a single party holding both keys can produce a valid pair. That limitation is stated normatively in §5.4.5.4; identity assurance is a separate trust-anchor concern.

---

## DID Examples

```
did:trail:org:acme-corp-a7f3b2c1e9d04f5a
did:trail:agent:sales-assistant-e4d8f1a9b3c57d2e
did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

A `did:trail` DID uniquely identifies either:
- An **organization** (`org`) operating AI systems — with content-addressable hash suffix
- A specific **AI agent** (`agent`) operated by a registered organization — with hash suffix
- A **self-signed** identity (`self`) for local verification — using the public key as identifier

### Trust Tiers

| Tier | Mode | Verification | Use Case |
|------|------|-------------|----------|
| 0 | `self` | Cryptographic proof only | Development, testing, early adoption |
| 1 | `org`/`agent` | Registry + KYB verification | Production B2B |
| 2 | `org`/`agent` | Registry + KYB + independent audit | Regulated industries |

Verifiers select which Tier-1 roots they treat as authoritative via a local Trust List (§3.4.4) — trust anchoring is verifier policy, not protocol state.

---

## Repository Structure

```
trail-did-method/
├── README.md                       <- This file
├── LICENSE                         <- CC BY 4.0 (spec) + MIT (code)
├── CONTRIBUTING.md                 <- How to contribute
├── CODE_OF_CONDUCT.md              <- Community standards + AI-specific ethics
├── ETHICS.md                       <- Ethical principles guiding protocol design
├── GOVERNANCE.md                   <- Decision-making, roles, dispute resolution
├── spec/
│   ├── did-method-trail-v1.md      <- DID Method Specification (v1.3.0-draft)
│   ├── registry-api-v1.yaml        <- OpenAPI 3.0 contract for the §6 Registry API
│   └── key-rotation-security-audit.md
├── packages/
│   └── trail-core/                 <- @trailprotocol/core — reference implementation
│       ├── src/                    <- TypeScript source (zero runtime dependencies)
│       ├── bin/                    <- CLI tool
│       ├── test/                   <- Implementation test suite
│       └── CHANGELOG.md            <- Release history
├── tests/
│   └── conformance/                <- Spec-level vectors + dependency-free harness
├── validation/
│   ├── fixtures/                   <- Signed test vectors + DID Document fixtures
│   ├── did-document-validator.js   <- Structural validator
│   └── validate.js                 <- CLI entry point
├── specs/
│   └── 002-universal-resolver-driver/
├── methods/
│   └── trail.json                  <- W3C DID Extensions Registry entry
├── examples/
│   ├── js/                         <- Runnable resolution + VC verification examples
│   └── *.json                      <- Example DID Documents, RAS Crew PoC registry
├── scripts/
│   └── preflight-public-commit.sh  <- Public-vocabulary gate (Gate 1)
├── .specify/
│   └── memory/constitution.md      <- Project constitution (Gate 2)
└── .github/
    ├── ISSUE_TEMPLATE/             <- Bug, Security, Spec Challenge, DID Discussion, Feature
    └── workflows/                  <- CI (build + test) and preflight
```

---

## Testing & Conformance

Two independent layers.

**Implementation tests** — `packages/trail-core/test/`, run by CI on Node 18, 20 and 22. Covers JCS canonicalization against the §14.4/§14.5 spec vectors, Base58 and multibase round-trips, key generation, DID construction and documents, self-mode resolution, `DataIntegrityProof`, verifiable credentials, crypto agility, key rotation, and `BindingProofCredential` including its single-step failure vectors.

```bash
cd packages/trail-core && npm install && npm run build && npm test
```

**Conformance harness** — `tests/conformance/`, deliberately dependency-free. It re-implements spec rules rather than importing `trail-core`, so it validates the *specification* independently of the *implementation*. Scopes: DID creation, DID resolution, revocation, trust score.

```bash
node tests/conformance/harness.mjs
```

Signed test vectors live in `validation/fixtures/`. The BindingProof vectors record the version and hashing construction they were signed with, and each invalid vector fails exactly one verification step so downstream implementers can isolate behaviour.

---

## Documentation

### Technical Whitepaper

The full TRAIL Protocol Technical Whitepaper v1.0 is available at [trailprotocol.org/whitepaper](https://trailprotocol.org/whitepaper) (CC BY 4.0). It covers the complete architecture, cryptographic design, CA infrastructure, Trust Badge widget, and EU AI Act compliance mapping.

### DID Method Specification

The full `did:trail` DID Method Specification v1.3.0-draft is available in [`spec/did-method-trail-v1.md`](spec/did-method-trail-v1.md).

Key sections:
- [DID Method Syntax](spec/did-method-trail-v1.md#4-did-method-syntax) — including content-addressable hash suffixes
- [DID Document Structure](spec/did-method-trail-v1.md#5-did-document-structure) — including Cross-Method Binding (§5.4) and `BindingProofCredential` (§5.4.5)
- [CRUD Operations](spec/did-method-trail-v1.md#6-method-operations) — with DID-based authentication
- [Trust Extensions](spec/did-method-trail-v1.md#7-trail-trust-extensions) — 3-Tier Trust Model, transparent Trust Score, Platform Identity Binding (§7.5)
- [Security Considerations](spec/did-method-trail-v1.md#8-security-considerations) — Key Recovery, Revocation Propagation (§8.7), Agent Declaration in content signatures (§8.13)
- [Governance](spec/did-method-trail-v1.md#11-governance) — dispute resolution, registry operator requirements
- [Test Vectors](spec/did-method-trail-v1.md#14-appendix-c--test-vectors) — including numeric canonicalization and the integer constraint (§14.5)

### Registry API

[`spec/registry-api-v1.yaml`](spec/registry-api-v1.yaml) is the OpenAPI 3.0 contract a conformant TRAIL Registry must implement: registration, resolution, update, deactivation, Status List publication, and the raw trust-score inputs endpoint. Mandatory reading for third-party registry implementations. No registry server implementation exists yet — see the roadmap.

---

## Community & Governance

TRAIL is being developed as an open community standard in coordination with:

- **[Decentralized Identity Foundation (DIF)](https://identity.foundation)** - TRAIL is presented in the [Trusted AI Agents Working Group (TAAWG)](https://identity.foundation) for peer review and alignment with the broader DID ecosystem.
- **[W3C Credentials Community Group (CCG)](https://www.w3.org/community/credentials/)** - Discussion of `did:trail` in the context of W3C standards. Mailing list: [public-credentials@w3.org](mailto:public-credentials@w3.org)
- **W3C Agent Identity Community Group** - agent-identity-specific questions, resolution dependencies and trust profiles: [public-agent-identity@w3.org](mailto:public-agent-identity@w3.org)

We welcome critique, co-maintainers, and interoperability proposals from both communities.

---

## W3C Registry Status

`did:trail` is **registered** in the [W3C DID Extensions Registry](https://github.com/w3c/did-extensions/blob/main/methods/trail.json) — PR [#669](https://github.com/w3c/did-extensions/pull/669) merged.

---

## Design Principles

1. **Open Protocol** — The protocol itself is free and open. Trust comes from transparency.
2. **Standards-based** — Built on W3C DID Core 1.0, VC 2.0, Ed25519 — no proprietary dependencies.
3. **Vendor-neutral** — Registry infrastructure supports federation; no single operator lock-in.
4. **Regulation-ready** — Designed to support organizational EU AI Act (2027) and eIDAS 2.0 compliance.
5. **Graduated trust** — Start with `did:trail:self:` (Tier 0) without any registry. Graduate to full registration when ready.
6. **Spec-first** — Changes to resolution logic, key formats or trust anchors are specified before they are implemented.

---

## Prior Art & Related Work

| Standard | Relationship |
|----------|-------------|
| W3C DID Core 1.0 | Foundation — did:trail IS a DID method |
| W3C VC 2.0 | TRAIL issues VCs conforming to this standard |
| W3C Status List 2021 | Credential revocation mechanism (§8.7) |
| RFC 8785 (JCS) | Canonicalization for Data Integrity proofs (§14.4, §14.5) |
| RFC 9421 | HTTP Message Signatures for registry authentication (§6.5) |
| OpenID4VC (OID4VC) | Complementary — OID4VC handles credential exchange; TRAIL provides trust layer |
| eIDAS 2.0 / EUDIW | Future integration target — TRAIL credentials can be embedded in EUDIW-compatible wallets |
| EU AI Act (2024/1689) | Regulatory driver — TRAIL supports compliance with Art. 13, 14, 26, 49, 52 |

---

## Managed Agent Support (§4.2, §7.5)

Platform-hosted AI agents (Anthropic Managed Agents, Azure AI, Google Vertex) challenge a core assumption of early DID designs: that an agent has a stable, persistent identity and can directly create its own DID.

In practice, platform agents are **dynamically provisioned per session** — no persistent running instance, no direct registry access. The persistent entity is the *deployment* (a configuration), not the running instance.

### Agent Deployment Identity (`did:trail:agent:*`)

An identifier mode for agent deployments, registered by the deploying organization:

```
did:trail:agent:{slug}-{hash}
```

- Registered by the **deployer organization** (which holds a `did:trail:org:*` DID)
- Represents one deployment configuration across all its instances
- Lifecycle tied to the active deployment, not individual sessions
- Linked to the deployer's org DID via `trail:parentOrganization`

### Platform Identity Binding VC

A VC type (`PlatformIdentityBinding`) linking a platform's internal deployment ID to a `did:trail:agent` DID — **signed by the deployer, not the platform**.

```json
{
  "type": ["VerifiableCredential", "PlatformIdentityBinding"],
  "issuer": "did:trail:org:acme-corp-eu-a7f3b2c1e9d0",
  "credentialSubject": {
    "id": "did:trail:agent:acme-sales-agent-v2-de-3f8c",
    "platformIdentity": {
      "platform": "anthropic",
      "deploymentId": "managed-agent-deployment-abc",
      "attestedBy": "did:trail:org:acme-corp-eu-a7f3b2c1e9d0"
    }
  }
}
```

This design means **no platform cooperation is required** for external audit. A BaFin auditor verifying an EU AI Act Art. 12 audit trail does not need to contact Anthropic, Azure, or Google. The deploying organization attests the binding from its own accountability — consistent with the Tier 1 KYB model already in the spec.

The same pattern works across all platforms without platform-specific code in the spec. Normative in §7.5 as of v1.2.0. Originally [Issue #9](https://github.com/trailprotocol/trail-did-method/issues/9).

---

## Roadmap

**Shipped**

- [x] v1.0 — Specification draft
- [x] v1.0 — `did:trail` registered in the W3C DID Extensions Registry (PR #669 merged)
- [x] v1.1 — Reference implementation (`@trailprotocol/core`) with CLI
- [x] v1.1 — Crypto agility, key rotation, key recovery, spec versioning, governance framework
- [x] v1.2 — Managed Agent Support (`did:trail:agent:*` + `PlatformIdentityBinding`, §7.5)
- [x] v1.2 — Federation Trust Anchor Model (§3.4) + Revocation Propagation (§8.7)
- [x] v1.2 — Cross-Method Binding (§5.4) and Agent Declaration content signatures (§8.13)
- [x] v1.2 — Universal Resolver driver (Docker image on GHCR; DIF PR [#546](https://github.com/decentralized-identity/universal-resolver/pull/546))
- [x] v1.3 — `BindingProofCredential` specification (§5.4.5) and reference implementation
- [x] v1.3 — Registry API OpenAPI 3.0 specification (§6 endpoints)
- [x] v1.3 — Conformance test suite (spec-level vectors + harness, run in CI)
- [x] v1.3 — VC 2.0 JSON-LD context published (`trailprotocol.org/ns/credentials/v2`)

**In progress — v1.3**

- [ ] Verifier Trust List JSON Schema (§3.4.4) — required for verifier interoperability across Tier-1 registries
- [ ] Genesis Issuer Set — normative definition of the initial Tier-1 root set and bootstrap mechanism

**Planned — v2.0**

- [ ] TRAIL Registry Server — HTTP API for Tier 1/2 registration and resolution per §6 and the OpenAPI spec
- [ ] Trust Score Engine — 5-dimension computation with verifier-side recomputation endpoint
- [ ] Python and Go reference implementations — interoperability proof
- [ ] W3C DID Test Suite compliance
- [ ] Post-quantum cryptosuite migration path (§8.2 crypto agility framework)
- [ ] Intermediate CA onboarding — Tier-2 sub-registry operator program

**Planned — v3.0**

- [ ] EUDIW integration + B2C extension

Trust scoring and the registry service are specified but not implemented. Anything describing how a verifier scores trust over time, or how a registry operates beyond simple resolution, is design rather than code today.

---

## Contribute

We welcome contributions, questions, and challenges. If you find a flaw in the specification - that's exactly what we want to know.

- **Open an issue** — templates for bug reports, security concerns, specification challenges, feature requests, and DID method discussion are in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/)
- **Submit a PR** - see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, branch naming, and review process
- **Join DIF Discord** - connect with contributors in the [DIF Discord](https://discord.gg/decentralized-identity) (#did-methods, TAAWG channels)
- **Join W3C CCG** - discuss `did:trail` on the mailing list: [public-credentials@w3.org](mailto:public-credentials@w3.org)
- **Contact the author:** christian.hommrich@trailprotocol.org

Areas where external review is most valuable: cryptographic protocol review, threat modelling, trust-score gameability, and independent implementations in other languages.

This project follows our own [Code of Conduct](CODE_OF_CONDUCT.md) and [Ethical Principles](ETHICS.md). See [GOVERNANCE.md](GOVERNANCE.md) for how decisions are made.

---

## Author

**Christian Hommrich**
TRAIL Protocol Initiative
[https://trailprotocol.org](https://trailprotocol.org)

---

## License

- **Specification** (all `.md` files in `spec/`): [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Reference implementations** (all code in `packages/`): [MIT License](https://opensource.org/licenses/MIT)

---

*First committed: 2026-03-01 — establishing Prior Art for the `did:trail` namespace and TRAIL Protocol concept.*
*Spec v1.1.0-draft: 2026-03-04 — addressing 9 critical improvements based on expert review.*
*Spec v1.2.0-draft: 2026-04-10 — Managed Agent Identity Binding (PlatformIdentityBinding VC, §7.5); deployment vs. instance distinction normative.*
*Spec v1.2.0: 2026-04-21 — Trust Anchor Model (§3.4), Revocation Propagation (§8.7), Cross-Method Binding (§5.4), Agent Declaration (§8.13).*
*Spec v1.3.0-draft: 2026-07 — BindingProofCredential (§5.4.5); numeric canonicalization constraint and integer trust score (§14.5, §7.3).*