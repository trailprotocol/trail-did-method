# TRAIL Protocol — did:trail DID Method

**Trust Registry for AI Identity Layer**

[![W3C DID Core 1.0](https://img.shields.io/badge/W3C-DID%20Core%201.0-blue)](https://www.w3.org/TR/did-core/)
[![VC Data Model 2.0](https://img.shields.io/badge/W3C-VC%202.0-blue)](https://www.w3.org/TR/vc-data-model-2.0/)
[![DIF Contributor](https://img.shields.io/badge/DIF-Contributor-blue)](https://identity.foundation)
[![W3C CCG Member](https://img.shields.io/badge/W3C%20CCG-Member-blue)](https://www.w3.org/community/credentials/)
[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![License: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Status: Draft](https://img.shields.io/badge/Spec-v1.1.0--draft-orange)](https://github.com/trailprotocol/trail-did-method/issues)

---

## What is TRAIL?

TRAIL (Trust Registry for AI Identity Layer) is an open cryptographic trust protocol for AI systems and autonomous agents operating in B2B commerce environments.

As AI agents increasingly act on behalf of organizations — negotiating contracts, providing advice, executing decisions — there is no infrastructure to answer the fundamental question: **"Can I trust this AI system?"**

TRAIL solves this by providing:
- **Decentralized Identifiers** (`did:trail`) for AI systems and the organizations behind them
- **Verifiable Credentials** attesting to AI identity, policy, and behavior standards
- **Revocation mechanisms** that create real economic consequences for misuse
- **3-Tier Trust Model** — from local self-signed verification to fully audited registry credentials
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

---

## Repository Structure

```
trail-did-method/
├── README.md                    <- This file
├── LICENSE                      <- CC BY 4.0 (spec) + MIT (code)
├── CONTRIBUTING.md              <- How to contribute
├── CODE_OF_CONDUCT.md           <- Community standards + AI-specific ethics
├── ETHICS.md                    <- Ethical principles guiding protocol design
├── GOVERNANCE.md                <- Decision-making, roles, dispute resolution
├── spec/
│   └── did-method-trail-v1.md  <- Complete DID Method Specification (v1.1.0-draft)
├── packages/
│   └── trail-core/            <- @trailprotocol/core — reference implementation
│       ├── src/               <- TypeScript source (zero runtime dependencies)
│       ├── bin/               <- CLI tool
│       └── test/              <- End-to-end tests
├── methods/
│   └── trail.json             <- W3C DID Registry submission file
├── examples/
│   ├── org-did-document.json  <- Example org DID Document
│   ├── agent-did-document.json <- Example agent DID Document
│   └── self-did-document.json <- Example self-signed DID Document
└── .github/
    └── ISSUE_TEMPLATE/        <- Issue templates
```

---

## Documentation

### Technical Whitepaper

The full TRAIL Protocol Technical Whitepaper v1.0 is available at [trailprotocol.org/whitepaper](https://trailprotocol.org/whitepaper) (CC BY 4.0). It covers the complete architecture, cryptographic design, CA infrastructure, Trust Badge widget, and EU AI Act compliance mapping.

### DID Method Specification

The full `did:trail` DID Method Specification v1.1.0-draft is available in [`spec/did-method-trail-v1.md`](spec/did-method-trail-v1.md).

Key sections:
- [DID Method Syntax](spec/did-method-trail-v1.md#4-did-method-syntax) — including content-addressable hash suffixes
- [DID Document Structure](spec/did-method-trail-v1.md#5-did-document-structure)
- [CRUD Operations](spec/did-method-trail-v1.md#6-method-operations) — with DID-based authentication
- [Trust Extensions](spec/did-method-trail-v1.md#7-trail-trust-extensions) — 3-Tier Trust Model, transparent Trust Score
- [Security Considerations](spec/did-method-trail-v1.md#8-security-considerations) — including Key Recovery
- [Governance](spec/did-method-trail-v1.md#11-governance) — dispute resolution, registry operator requirements

---

## Community & Governance

TRAIL is being developed as an open community standard in coordination with:

- **[Decentralized Identity Foundation (DIF)](https://identity.foundation)** - TRAIL is presented in the [Trusted AI Agents Working Group (TAAWG)](https://identity.foundation) for peer review and alignment with the broader DID ecosystem.
- **[W3C Credentials Community Group (CCG)](https://www.w3.org/community/credentials/)** - Discussion of `did:trail` in the context of W3C standards. Mailing list: [public-credentials@w3.org](mailto:public-credentials@w3.org)

We welcome critique, co-maintainers, and interoperability proposals from both communities.

---

## W3C Registry Submission

The `methods/trail.json` file in this repository is submitted for inclusion in the [W3C DID Extensions](https://github.com/w3c/did-extensions).

**Status:** PR [#669](https://github.com/w3c/did-extensions/pull/669) submitted

---

## Design Principles

1. **Open Protocol** — The protocol itself is free and open. Trust comes from transparency.
2. **Standards-based** — Built on W3C DID Core 1.0, VC 2.0, Ed25519 — no proprietary dependencies.
3. **Vendor-neutral** — Registry infrastructure supports federation; no single operator lock-in.
4. **Regulation-ready** — Designed to support organizational EU AI Act (2027) and eIDAS 2.0 compliance.
5. **Graduated trust** — Start with `did:trail:self:` (Tier 0) without any registry. Graduate to full registration when ready.

---

## Prior Art & Related Work

| Standard | Relationship |
|----------|-------------|
| W3C DID Core 1.0 | Foundation — did:trail IS a DID method |
| W3C VC 2.0 | TRAIL issues VCs conforming to this standard |
| OpenID4VC (OID4VC) | Complementary — OID4VC handles credential exchange; TRAIL provides trust layer |
| eIDAS 2.0 / EUDIW | Future integration target — TRAIL credentials can be embedded in EUDIW-compatible wallets |
| EU AI Act (2024/1689) | Regulatory driver — TRAIL supports compliance with Art. 13, 14, 26, 49, 52 |

---

## Roadmap

- [x] v1.0 — Specification draft
- [x] v1.0 — W3C DID Registry submission (PR #669)
- [x] v1.1 — Reference implementation (`@trailprotocol/core`) with CLI
- [x] v1.1 — Specification v1.1.0-draft (9 critical improvements)
- [ ] v1.2 — TRAIL Registry alpha (Early Adopter Program)
- [ ] v2.0 — Production registry + independent security audit
- [ ] v2.1 — Universal Resolver driver
- [ ] v3.0 — EUDIW integration + B2C extension

---

## Contribute

We welcome contributions, questions, and challenges. If you find a flaw in the specification - that's exactly what we want to know.

- **Open an issue** for specification questions, security concerns, or improvement suggestions
- **Submit a PR** - see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, branch naming, and review process
- **Join DIF Discord** - connect with contributors in the [DIF Discord](https://discord.gg/decentralized-identity) (#did-methods, TAAWG channels)
- **Join W3C CCG** - discuss `did:trail` on the mailing list: [public-credentials@w3.org](mailto:public-credentials@w3.org)
- **Contact the author:** christian.hommrich@trailprotocol.org

### Open RFCs — looking for expert review

Three design questions are currently open and would benefit most from external critique:

- **[#1 Federation Model Architecture Review](https://github.com/trailprotocol/trail-did-method/issues/1)** — How independent trust registries federate without a single root of trust
- **[#2 Trust Score Algorithm](https://github.com/trailprotocol/trail-did-method/issues/2)** — Gameability, decay function, EU AI Act explainability
- **[#3 Key Rotation Security Audit](https://github.com/trailprotocol/trail-did-method/issues/3)** — Threat-model review of rotation semantics

If you have expertise in DID/SSI, cryptographic protocols, or trust systems — even a single comment moves these forward. Harsh critique is the most useful kind.

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
