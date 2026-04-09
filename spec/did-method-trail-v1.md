# did:trail Method Specification

**Version:** 1.2.0-draft
**Status:** Draft
**Authors:** Christian Hommrich (TRAIL Protocol Initiative)
**Contact:** christian.hommrich@gmail.com
**Repository:** https://github.com/trailprotocol/trail-did-method
**Date:** 2026-03-04
**License:** CC BY 4.0

---

## Abstract

The `did:trail` DID method specifies how Decentralized Identifiers (DIDs) are created, resolved, updated, and deactivated within the TRAIL (Trust Registry for AI Identity Layer) protocol. TRAIL provides a vendor-neutral trust registry for artificial intelligence systems, autonomous agents, and AI-powered services operating in B2B commerce environments.

This specification defines the `did:trail` method conforming to the [W3C DID Core 1.0 specification](https://www.w3.org/TR/did-core/) and the [Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/). It enables organizations and AI agents to establish cryptographically verifiable identities, express their AI usage policies, and participate in a trust ecosystem designed to support organizational compliance with the EU AI Act (Articles 13, 14, 26, 49, 52) and aligned with eIDAS 2.0.

---

## Status of This Document

This document is a **Draft** specification submitted for registration in the [W3C DID Specification Registries](https://github.com/w3c/did-spec-registries). It is subject to change before finalization. Feedback is welcome via the [TRAIL GitHub repository](https://github.com/trailprotocol/trail-did-method/issues) or the W3C Credentials Community Group mailing list at public-credentials@w3.org.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Conformance](#2-conformance)
3. [The `did:trail` Method](#3-the-didtrail-method)
   - 3.1 [Method Name](#31-method-name)
   - 3.2 [Target System](#32-target-system)
   - 3.3 [Registry Federation](#33-registry-federation)
4. [DID Method Syntax](#4-did-method-syntax)
   - 4.1 [Method-Specific Identifier](#41-method-specific-identifier)
   - 4.2 [Identifier Modes](#42-identifier-modes)
   - 4.3 [Identifier Constraints](#43-identifier-constraints)
   - 4.4 [Example DIDs](#44-example-dids)
   - 4.5 [Identifier Normalization](#45-identifier-normalization)
5. [DID Document Structure](#5-did-document-structure)
   - 5.1 [Core DID Document](#51-core-did-document)
   - 5.2 [TRAIL-Specific Context Terms](#52-trail-specific-context-terms)
   - 5.3 [Extended DID Document (Full Example)](#53-extended-did-document-full-example)
6. [Method Operations](#6-method-operations)
   - 6.1 [Create (Register)](#61-create-register)
   - 6.2 [Read (Resolve)](#62-read-resolve)
   - 6.3 [Update](#63-update)
   - 6.4 [Deactivate (Revoke)](#64-deactivate-revoke)
   - 6.5 [Authentication](#65-authentication)
7. [TRAIL Trust Extensions](#7-trail-trust-extensions)
   - 7.1 [TRAIL Verifiable Credentials](#71-trail-verifiable-credentials)
   - 7.2 [Trust Tiers](#72-trust-tiers)
   - 7.3 [Trust Score](#73-trust-score)
   - 7.4 [EU AI Act Alignment](#74-eu-ai-act-alignment)
   - 7.5 [Platform Identity Binding (Managed Agent Support)](#75-platform-identity-binding-managed-agent-support)
8. [Security Considerations](#8-security-considerations)
   - 8.1 [Key Security](#81-key-security)
   - 8.2 [Crypto Agility](#82-crypto-agility)
   - 8.3 [Registry Availability](#83-registry-availability)
   - 8.4 [Replay Attack Prevention](#84-replay-attack-prevention)
   - 8.5 [Man-in-the-Middle Attacks](#85-man-in-the-middle-attacks)
   - 8.6 [Revocation Timeliness](#86-revocation-timeliness)
   - 8.7 [Key Recovery](#87-key-recovery)
   - 8.8 [Key Rotation Protocol](#88-key-rotation-protocol)
   - 8.9 [Specification Versioning](#89-specification-versioning)
   - 8.10 [Revocation Roadmap](#810-revocation-roadmap)
   - 8.11 [Protocol Roadmap](#811-protocol-roadmap)
9. [Privacy Considerations](#9-privacy-considerations)
10. [Reference Implementation](#10-reference-implementation)
11. [Governance](#11-governance)
    - 11.1 [Governance Evolution](#111-governance-evolution)
    - 11.2 [Dispute Resolution](#112-dispute-resolution)
    - 11.3 [Registry Operator Requirements](#113-registry-operator-requirements)
    - 11.4 [Change Management](#114-change-management)
12. [Appendix A — JSON Registry Entry](#12-appendix-a--json-registry-entry)
13. [Appendix B — Example DID Documents](#13-appendix-b--example-did-documents)
14. [Appendix C — Test Vectors](#14-appendix-c--test-vectors)
15. [Changelog](#15-changelog)
16. [References](#16-references)

---

## 1. Introduction

### 1.1 Motivation

Artificial intelligence systems increasingly act as autonomous agents in commercial contexts — drafting contracts, negotiating terms, providing advice, and executing decisions on behalf of organizations. Unlike human actors, AI agents cannot rely on social trust signals (reputation, body language, professional history) that humans use to establish credibility.

TRAIL addresses this gap by providing a **vendor-neutral trust registry** where AI-powered systems can register cryptographically verifiable identities, disclose their operational policies, and obtain tamper-proof credentials attesting to their identity and behavior standards.

The `did:trail` method provides the identity foundation for this ecosystem.

### 1.2 Design Goals

The `did:trail` method is designed to:

- **Be interoperable** with W3C DID Core 1.0 and Verifiable Credentials 2.0
- **Support EU AI Act compliance** — provide the technical infrastructure that organizations can use to meet transparency and traceability requirements under the EU AI Act (Articles 13, 14, 26, 49, 52)
- **Enable selective disclosure** — organizations can publish AI identity information without revealing proprietary implementation details
- **Provide revocation** — trust certificates can be revoked with economic consequences for non-compliant actors
- **Scale across B2B commerce** — from SMEs to enterprise deployments
- **Work without a dedicated blockchain** — the TRAIL registry uses established web infrastructure with cryptographic anchoring
- **Support federation** — enable multiple independent registries to interoperate, preventing vendor lock-in and enabling jurisdictional deployments

### 1.3 Relationship to Other DID Methods

`did:trail` is complementary to, not competitive with, existing DID methods:

| Method | Focus | Relationship to did:trail |
|--------|-------|--------------------------|
| `did:web` | Domain-based identity | did:trail can delegate to did:web for DID Document hosting |
| `did:key` | Ephemeral/self-sovereign keys | did:key can be used for self-signed mode (see §7.2) |
| `did:ethr` | Ethereum-based registry | did:trail can anchor trust records on Ethereum via EIP-6551 |
| `did:ion` | Bitcoin-anchored identity | Future integration path for immutable anchoring |
| `did:ebsi` | EU-regulated identity (EBSI) | did:trail complements EBSI by adding AI-agent-specific trust metadata; EBSI provides EU-wide legal trust anchoring |
| OpenID4VC | Credential presentation layer | did:trail provides the trust layer; OID4VC handles credential exchange |

#### Technical Differentiation

| Criterion | did:trail | did:web | did:ion | did:ebsi |
|-----------|-----------|---------|---------|----------|
| **Ledger** | HTTP Registry (no blockchain) | DNS + HTTPS | Bitcoin (Sidetree) | EBSI Blockchain (Hyperledger Besu) |
| **Resolution Latency** | <100ms (HTTP) | <100ms (HTTPS) | 1-30s (Bitcoin confirmation) | <500ms (EBSI nodes) |
| **AI-Agent-Specific** | Yes (trust tiers, AI policy, risk class) | No | No | No |
| **EU AI Act Alignment** | Yes (Art. 13/14/26/52 mapping) | No | No | Partial (legal trust, not AI-specific) |
| **Self-Signed Mode** | Yes (Tier 0, offline) | No (requires domain) | No (requires Bitcoin tx) | No (requires EBSI onboarding) |
| **Key Rotation** | Yes (history preserved) | Yes (via DID Doc update) | Yes (Sidetree ops) | Yes (via EBSI API) |
| **Governance** | Open spec + federated registry | Domain owner controls | Bitcoin PoW | EU Commission + Member States |
| **Cost** | Free (self) / Subscription (registry) | Free (own domain) | Free (ION network) | Free (EU-funded infrastructure) |
| **GDPR Compliance** | Yes (no PII on-chain) | Yes (server-side) | Problematic (Bitcoin immutability) | Yes (GDPR by design) |
| **Crypto Agility** | Yes (SUPPORTED_CRYPTOSUITES registry) | Depends on implementation | Limited (Secp256k1) | Yes (eIDAS 2.0 compliant) |

---

## 2. Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

This specification conforms to:
- [W3C DID Core 1.0](https://www.w3.org/TR/did-core/)
- [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C DID Specification Registries](https://www.w3.org/TR/did-spec-registries/)
- [RFC 8037](https://www.rfc-editor.org/rfc/rfc8037) (CFRG Elliptic Curves — Ed25519)
- [RFC 7517](https://www.rfc-editor.org/rfc/rfc7517) (JSON Web Key)
- [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421) (HTTP Message Signatures)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) (Key words for use in RFCs)

---

## 3. The `did:trail` Method

### 3.1 Method Name

The method name that SHALL identify this DID method is: **`trail`**

A DID using this method MUST begin with the prefix `did:trail:`. This prefix is case-insensitive in resolution but SHOULD be produced in lowercase.

### 3.2 Target System

The `did:trail` method uses the **TRAIL Registry** as its Verifiable Data Registry (VDR). The TRAIL Registry is an HTTP-based registry infrastructure that:

1. Stores DID Document metadata and resolution endpoints
2. Issues and manages TRAIL Verifiable Credentials (VCs) attesting to AI system identity
3. Manages revocation status via a TRAIL Status List compatible with [W3C VC Status List 2021](https://www.w3.org/TR/vc-status-list/)
4. Provides a public resolution API at `https://registry.trailprotocol.org/1.0/identifiers/`

**Local Verification Mode (self):** DIDs MAY be created in **self-signed mode** without external registry interaction (see §7.2). Self-signed `did:trail` DIDs are verifiable without an external registry and represent the foundational trust tier of the ecosystem.

### 3.3 Registry Federation

The TRAIL architecture SHOULD support federation — multiple independent registries operating under a shared protocol and interoperating to resolve identifiers across organizational and jurisdictional boundaries.

#### 3.3.1 Registry Discovery

When resolving a `did:trail` identifier, the resolver SHOULD attempt registry discovery in the following order:

1. **DID Document Service Endpoint** — If the resolver already possesses a cached DID Document for the subject, it SHOULD use the `TrailRegistryService` endpoint declared in that document.
2. **Well-Known Endpoint** — The resolver MAY query the subject's domain (if determinable) at `/.well-known/trail-registry` to discover the authoritative registry.
3. **Default Registry** — If neither of the above yields a result, the resolver MUST fall back to the TRAIL default registry at `https://registry.trailprotocol.org/1.0/identifiers/`.

#### 3.3.2 Cross-Registry Resolution

When a registry receives a resolution request for an identifier it does not manage, it SHOULD respond with an HTTP 301 redirect to the authoritative registry if known:

```http
HTTP/1.1 301 Moved Permanently
Location: https://registry.other-operator.eu/1.0/identifiers/did:trail:org:example-gmbh-de-b8c9d0e1
X-Trail-Referral: true
```

If the authoritative registry is unknown, the registry MUST respond with HTTP 404.

#### 3.3.3 Federation Requirements

Federation is a SHOULD-level requirement. A conforming `did:trail` implementation:

- SHOULD support registry discovery as defined in §3.3.1
- SHOULD support cross-registry referrals as defined in §3.3.2
- MAY operate as a standalone registry without federation support
- MUST NOT require federation for basic DID resolution against the default registry

---

## 4. DID Method Syntax

### 4.1 Method-Specific Identifier

The method-specific identifier (MSI) for `did:trail` has the following ABNF syntax:

```abnf
did-trail              = "did:trail:" trail-identifier
trail-identifier       = trail-org-id / trail-agent-id / trail-self-id
trail-org-id           = "org:" trail-slug "-" trail-hash
trail-agent-id         = "agent:" trail-slug "-" trail-hash
trail-self-id          = "self:" trail-multibase
trail-slug             = 1*(ALPHA / DIGIT / "-")
trail-hash             = 16HEXDIG
trail-multibase        = "z" 1*(BASE58CHAR)
BASE58CHAR             = %x31-39 / %x41-48 / %x4A-4E / %x50-5A / %x61-6B / %x6D-7A
                         ; 1-9 A-H J-N P-Z a-k m-z (no 0, I, O, l)
```

For `org` and `agent` modes, the `trail-hash` component is a content-addressable suffix derived from the combination of the slug and the subject's public key material (see §4.5.2). For `self` mode, the subject is the multibase-encoded (base58btc, z-prefix) Ed25519 public key — no additional hash suffix is required, as the identifier is inherently content-addressable.

### 4.2 Identifier Modes

`did:trail` supports three registration modes corresponding to different subject types:

#### `org` — Organization Identity
Identifies a legal entity (company, institution) operating AI systems.

```
did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a
did:trail:org:deutschebank-ai-desk-e2f4a6b8
```

#### `agent` — AI Agent Deployment Identity
Identifies an AI agent **deployment** operated by an organization. A deployment is a named, versioned configuration of an AI system — distinct from any individual running instance. MUST be associated with a parent `org` DID via the `trail:parentOrganization` property.

```
did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3
did:trail:agent:db-contract-analysis-prod-001-c8d9e0f1a2b4
```

**Deployment vs. Instance:** The `agent` DID identifies the *deployment configuration*, not a running process. This distinction is critical for platform-hosted agents (e.g., Anthropic Managed Agents, Azure AI, Google Vertex AI) that are dynamically provisioned per session. A single `did:trail:agent` DID covers all instances spawned from one deployment configuration, across all sessions, for the active lifetime of that deployment. This maps to the "Deployment vs. Pod" distinction in container orchestration.

**Registration authority:** The `did:trail:agent` DID is created and registered by the **deploying organization** (which MUST hold a `did:trail:org` DID), not by the agent itself. Agents operating on third-party platforms (managed agents) cannot directly interact with the TRAIL Registry. The deployer acts as the accountable principal for all agent instances.

**Lifecycle:** The `did:trail:agent` DID remains active as long as the deployment is active. Deactivation of the deployment DID (§6.4) implicitly revokes all active sessions of that deployment. Individual session termination does not require registry interaction.

#### `self` — Local Verification Mode
DIDs are cryptographically self-contained and verifiable without external registry lookup. Represents the foundational trust tier of the TRAIL ecosystem, providing cryptographic identity verification without organizational attestation.

Self-signed DIDs are suitable for:
- Development and testing environments
- Air-gapped or offline verification scenarios
- Bootstrapping identity before registry registration
- Minimal-trust interactions where cryptographic proof of key control suffices

An upgrade path exists from `self` to `org` or `agent` mode: the subject MAY register their existing key material with the TRAIL Registry to obtain a registry-backed identity while preserving cryptographic continuity.

```
did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```
*(The subject component in self-mode is a multibase-encoded Ed25519 public key)*

### 4.3 Identifier Constraints

- The method-specific identifier MUST be globally unique within its mode namespace
- For `org` and `agent` modes: the slug-hash subject MUST NOT exceed 128 characters and MUST use only URL-safe characters (ALPHA, DIGIT, hyphen)
- For `self` mode: the subject MUST be a valid multibase-encoded (base58btc, z-prefix) Ed25519 public key (exactly 32 bytes decoded)
- Organization identifiers (`org` mode) MUST match a verified legal entity name or registered business identifier via the slug component
- The `trail-hash` suffix (for `org` and `agent` modes) MUST be computed as specified in §4.5.2

### 4.4 Example DIDs

```
did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a
did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3
did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

### 4.5 Identifier Normalization

#### 4.5.1 Slug Normalization Rules

The `trail-slug` component MUST be derived from the subject's legal or descriptive name following these normalization rules:

1. Convert to lowercase ASCII
2. Replace spaces and underscores with hyphens
3. Remove legal entity suffixes (GmbH, Inc., Ltd., AG, S.A., B.V., etc.)
4. Remove special characters other than hyphens
5. Collapse consecutive hyphens into a single hyphen
6. Trim leading and trailing hyphens

**Examples:**

| Input Name | Normalized Slug |
|------------|----------------|
| ACME Corporation GmbH | `acme-corporation` |
| Deutsche Bank AG | `deutsche-bank` |
| Müller & Söhne KG | `muller-sohne` |
| AI-Powered Solutions Inc. | `ai-powered-solutions` |

For `agent` mode, the slug SHOULD include the parent organization slug as a prefix, followed by a descriptive agent name:
- `acme-corp-eu-rfq-assistant-v1`
- `deutsche-bank-contract-analyzer-prod`

#### 4.5.2 Content-Addressable Suffix

The `trail-hash` is computed as follows:

```
trail-hash = SHA-256(slug + ":" + publicKeyMultibase)[0:16]
```

Where:
- `slug` is the normalized slug as defined in §4.5.1
- `publicKeyMultibase` is the multibase-encoded (base58btc) Ed25519 public key of the subject
- `[0:16]` denotes the first 16 characters (8 bytes / 64 bits) of the lowercase hexadecimal digest, providing collision resistance up to approximately 4.3 billion identifiers (birthday bound: 2^32)

**Example computation:**

```
slug              = "acme-corp-eu"
publicKeyMultibase = "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
input             = "acme-corp-eu:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
SHA-256(input)    = "a7f3b2c1e9d04f5a..."  (truncated)
trail-hash        = "a7f3b2c1e9d04f5a"
DID               = "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a"
```

This content-addressable suffix:
- Prevents accidental slug collisions between different organizations
- Binds the identifier cryptographically to the subject's key material
- Enables fast verification that a DID corresponds to its claimed public key

For `self` mode, the entire subject IS the public key (multibase-encoded), making an additional hash suffix unnecessary.

#### 4.5.3 Registry Uniqueness Verification

Upon receiving a registration request, the TRAIL Registry MUST:

1. Verify that the `trail-hash` suffix was correctly computed from the provided slug and public key
2. Reject registration if the computed hash does not match the requested DID
3. Reject registration if the `trail-slug` component is identical to an existing registration (even if the hash differs), unless the registrant can demonstrate a legitimate claim (e.g., key rotation with identity continuity)

---

## 5. DID Document Structure

### 5.1 Core DID Document

A `did:trail` DID Document MUST conform to the W3C DID Core 1.0 DID Document data model. The following is a minimal compliant DID Document:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://trailprotocol.org/ns/did/v1"
  ],
  "id": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
  "verificationMethod": [
    {
      "id": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1",
      "type": "JsonWebKey2020",
      "controller": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
      "publicKeyJwk": {
        "kty": "OKP",
        "crv": "Ed25519",
        "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"
      }
    }
  ],
  "authentication": [
    "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1"
  ],
  "assertionMethod": [
    "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1"
  ],
  "service": [
    {
      "id": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#trail-registry",
      "type": "TrailRegistryService",
      "serviceEndpoint": "https://registry.trailprotocol.org/1.0/identifiers/did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a"
    },
    {
      "id": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#ai-policy",
      "type": "TrailAIPolicyService",
      "serviceEndpoint": "https://acme-corp.eu/.well-known/trail-ai-policy.json"
    }
  ]
}
```

### 5.2 TRAIL-Specific Context Terms

The `https://trailprotocol.org/ns/did/v1` JSON-LD context defines the following additional terms:

| Term | Type | Description |
|------|------|-------------|
| `TrailRegistryService` | Service type | Link to the TRAIL Registry resolution endpoint |
| `TrailAIPolicyService` | Service type | Link to the AI Policy disclosure document |
| `TrailTrustScore` | Property | Current trust score object (see §7.3) from TRAIL Registry |
| `TrailCertificationStatus` | Property | Status of TRAIL certification (active / suspended / revoked) |
| `aiSystemType` | Property | Classification of AI system (llm / agent / classifier / other) |
| `euAiActRiskClass` | Property | EU AI Act risk classification (minimal / limited / high / unacceptable) |
| `parentOrganization` | Property | DID of parent org (required for `agent` mode DIDs) |
| `recoveryPolicy` | Property | Key recovery policy configuration (see §8.7) |
| `trailTrustTier` | Property | Trust tier level (0, 1, or 2) as defined in §7.2 |

### 5.3 Extended DID Document (Full Example)

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/suites/jws-2020/v1",
    "https://trailprotocol.org/ns/did/v1"
  ],
  "id": "did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3",
  "controller": [
    "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
    "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#recovery-key-1"
  ],
  "verificationMethod": [
    {
      "id": "did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3#key-1",
      "type": "JsonWebKey2020",
      "controller": "did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3",
      "publicKeyJwk": {
        "kty": "OKP",
        "crv": "Ed25519",
        "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"
      }
    }
  ],
  "authentication": ["did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3#key-1"],
  "assertionMethod": ["did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3#key-1"],
  "service": [
    {
      "id": "did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3#trail-registry",
      "type": "TrailRegistryService",
      "serviceEndpoint": "https://registry.trailprotocol.org/1.0/identifiers/did:trail:agent:acme-corp-eu-rfq-assistant-v1-d4e5f6a7b8c3"
    }
  ],
  "trail:aiSystemType": "agent",
  "trail:euAiActRiskClass": "limited",
  "trail:parentOrganization": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
  "trail:TrailCertificationStatus": "active",
  "trail:trailTrustTier": 1,
  "trail:recoveryPolicy": {
    "type": "socialRecovery",
    "threshold": 3,
    "totalGuardians": 5,
    "guardians": [
      "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#recovery-key-1",
      "did:trail:org:trusted-partner-a-c3d4e5f6#key-1",
      "did:trail:org:trusted-partner-b-f6a7b8c9#key-1",
      "did:trail:org:legal-counsel-d-a1b2c3d4#key-1",
      "did:trail:org:auditor-e-e5f6a7b8#key-1"
    ]
  }
}
```

---

## 6. Method Operations

### 6.1 Create (Register)

#### 6.1.1 Preconditions

To create a `did:trail` DID, a registrant MUST:

1. Possess a valid Ed25519 key pair (the **TRAIL Identity Key**)
2. For `org` mode: provide proof of legal entity (business registration document or eIDAS-compatible identity)
3. For `agent` mode: hold an active `org` mode DID for the parent organization
4. Accept the [TRAIL Participant Agreement](https://trailprotocol.org/legal/participant-agreement)

#### 6.1.2 Creation Steps

**Step 1 — Key Generation**
Generate an Ed25519 key pair using a cryptographically secure random number generator:

```javascript
const { generateKeyPair } = require('@trailprotocol/core');
const keys = generateKeyPair();
// keys.publicKeyMultibase = "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
// keys.privateKey = Uint8Array(64) [...]
```

**Step 2 — DID Construction**
Construct the DID string according to §4:
```
did:trail:org:{normalized-slug}-{trail-hash}
```

The `normalized-slug` MUST be derived from the verified legal entity name following the TRAIL Slug Normalization Rules (§4.5.1). The `trail-hash` MUST be computed as specified in §4.5.2.

**Step 3 — DID Document Construction**
Construct the DID Document as specified in §5, including:
- At minimum one `verificationMethod` entry with the public key in JWK format
- A `TrailRegistryService` endpoint pointing to the TRAIL Registry
- A `TrailAIPolicyService` endpoint (REQUIRED for `org` mode, OPTIONAL for `agent`)

**Step 4 — Registration Request**
Submit the DID Document to the TRAIL Registry via authenticated HTTP POST:

```http
POST https://registry.trailprotocol.org/1.0/register
Content-Type: application/json
Authorization: DIDAuth did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a
Signature-Input: sig1=("@method" "@target-uri" "content-type" "content-digest");created=1709510400;keyid="did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1";alg="ed25519"
Signature: sig1=:BASE64_ENCODED_SIGNATURE:

{
  "did": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
  "didDocument": { ... },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2023",
    "created": "2026-03-01T00:00:00Z",
    "verificationMethod": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z..."
  }
}
```

For first-time registration (bootstrap), see §6.5.2.

**Step 5 — Registry Confirmation**
The TRAIL Registry validates:
- DID Document syntax and required fields
- Cryptographic proof validity (including HTTP Message Signature)
- Content-addressable hash verification (§4.5.2)
- Identity verification (for `org` mode: KYB check)
- Uniqueness of the requested identifier (§4.5.3)

Upon successful validation, the Registry returns a signed TRAIL Registration Certificate (a Verifiable Credential).

#### 6.1.3 Self-Signed Mode (No Registry Required)

For local verification and testing, `did:trail:self:` DIDs can be created without registry registration:

```javascript
const { generateKeyPair, createSelfDid } = require('@trailprotocol/core');

const keys = generateKeyPair();
const { did, didDocument } = createSelfDid(keys);
// did = "did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"
```

Self-signed DIDs are resolvable by any resolver that understands the `self` mode — no network request required.

### 6.2 Read (Resolve)

#### 6.2.1 Resolution via TRAIL Registry

A `did:trail` DID resolver MUST perform the following steps:

1. Parse the DID to extract the mode and subject components
2. Dispatch based on mode:
   - `org` / `agent`: Perform HTTP GET to the TRAIL Registry (with registry discovery per §3.3.1)
   - `self`: Reconstruct DID Document from embedded public key

**HTTP Resolution (org/agent mode):**

```http
GET https://registry.trailprotocol.org/1.0/identifiers/did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a
Accept: application/did+ld+json
```

**Response (200 OK):**

```json
{
  "@context": "https://w3id.org/did-resolution/v1",
  "didDocument": { ... },
  "didDocumentMetadata": {
    "created": "2026-03-01T00:00:00Z",
    "updated": "2026-03-01T00:00:00Z",
    "deactivated": false,
    "trailCertificationStatus": "active",
    "trailTrustTier": 1,
    "trailTrustScore": {
      "overall": 0.87,
      "dimensions": {
        "identityVerification": { "score": 0.95, "weight": 0.25 },
        "trackRecord": { "score": 0.90, "weight": 0.25 },
        "informationProvenance": { "score": 0.80, "weight": 0.20 },
        "behavioralConsistency": { "score": 0.82, "weight": 0.20 },
        "thirdPartyAttestations": { "score": 0.70, "weight": 0.10 }
      },
      "lastComputed": "2026-03-01T00:00:00Z"
    },
    "nextUpdate": "2026-06-01T00:00:00Z"
  },
  "didResolutionMetadata": {
    "contentType": "application/did+ld+json"
  }
}
```

#### 6.2.2 Self-Signed Resolution (self mode)

```javascript
const { resolveSelf } = require('@trailprotocol/core');

const resolved = resolveSelf('did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK');
// resolved.didDocument contains the reconstructed DID Document
```

The resolver reconstructs the DID Document deterministically from the embedded public key:

```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://trailprotocol.org/ns/did/v1"],
  "id": "did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "trail:trailTrustTier": 0,
  "verificationMethod": [{
    "id": "did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1",
    "type": "JsonWebKey2020",
    "controller": "did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "publicKeyJwk": {
      "kty": "OKP",
      "crv": "Ed25519",
      "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"
    }
  }],
  "authentication": ["did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1"],
  "assertionMethod": ["did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1"]
}
```

#### 6.2.3 DID URL Dereferencing

| DID URL | Dereferences to |
|---------|----------------|
| `did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1` | The verification method with id `#key-1` |
| `did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#trail-registry` | The TrailRegistryService endpoint |
| `did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#ai-policy` | The AI Policy service endpoint |
| `did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a?versionId=2026-03-01` | DID Document as of the specified date |

### 6.3 Update

DID Document updates require an authenticated signed update request from the DID controller:

```http
PUT https://registry.trailprotocol.org/1.0/identifiers/did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a
Content-Type: application/json
Authorization: DIDAuth did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a
Signature-Input: sig1=("@method" "@target-uri" "content-type" "content-digest");created=1711929600;keyid="did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1";alg="ed25519"
Signature: sig1=:BASE64_ENCODED_SIGNATURE:

{
  "didDocument": { ...updated document... },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2023",
    "created": "2026-04-01T00:00:00Z",
    "verificationMethod": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1",
    "proofPurpose": "authentication",
    "proofValue": "z..."
  }
}
```

**Key Rotation:** When rotating the primary identity key, the DID controller MUST include both the old proof (signed with the current key) and the new key material. Key rotation does not change the DID itself. The `trail-hash` suffix remains bound to the original public key to preserve identifier stability.

**Hash and Key Rotation Semantics:** The `trail-hash` suffix in `org` and `agent` mode DIDs is computed once at creation time from `SHA-256(slug + ":" + originalPublicKeyMultibase)[0:12]`. After key rotation, the hash no longer corresponds to the current public key — it serves as a stable, unique identifier bound to the _initial_ key material. This is by design: the DID identifier remains stable across key rotations, and the hash suffix's primary purpose is collision prevention, not ongoing key binding. Verifiers MUST use the current `verificationMethod` in the DID Document (not the hash suffix) to verify signatures.

**Self-Mode Key Rotation:** Self-signed DIDs (`did:trail:self:*`) encode the public key directly in the DID identifier. Key rotation in self-mode requires creating a new DID, as the identifier IS the key. This is consistent with Tier 0's design as a lightweight, ephemeral identity layer. Organizations that anticipate key rotation SHOULD use `org` or `agent` mode.

**Immutable fields:** The `id` field of a DID Document MUST NOT be changed after creation.

### 6.4 Deactivate (Revoke)

A DID MAY be deactivated either by the DID controller (voluntary) or by the TRAIL Registry (revocation due to policy violation).

**Self-Mode Limitation:** Self-signed DIDs (`did:trail:self:*`, Tier 0) are not registered with any registry and therefore cannot be revoked or deactivated by a third party. The DID controller can stop using the associated key pair, but there is no mechanism to signal deactivation to verifiers. This is an inherent limitation of Tier 0 and one of the reasons that Tier 1/2 registration provides stronger trust guarantees. Verifiers interacting with Tier 0 DIDs SHOULD treat them as ephemeral and apply additional verification measures (e.g., challenge-response, short-lived sessions).

#### 6.4.1 Controller-Initiated Deactivation

```http
DELETE https://registry.trailprotocol.org/1.0/identifiers/did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a
Authorization: DIDAuth did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a
Signature-Input: sig1=("@method" "@target-uri");created=1709510400;keyid="did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1";alg="ed25519"
Signature: sig1=:BASE64_ENCODED_SIGNATURE:
X-Trail-Proof: {signed-deactivation-proof}
```

#### 6.4.2 Registry-Initiated Revocation

The TRAIL Registry MAY revoke a DID under the following conditions:
- Verified misrepresentation of AI system capabilities
- Breach of TRAIL Participant Agreement
- Court order or regulatory requirement
- Sustained pattern of harmful AI behavior (as defined in the TRAIL Conduct Standards)

Revocation follows the TRAIL Revocation Policy (see [trailprotocol.org/legal/revocation-policy](https://trailprotocol.org/legal/revocation-policy)) and the Dispute Resolution process defined in §11.2:
1. **Notice:** 14-day written notice before revocation (except in cases of immediate harm)
2. **Appeal:** 30-day appeal window via the TRAIL Dispute Resolution Process (§11.2)
3. **Effect:** Upon revocation, the DID Document is marked `"deactivated": true` and all associated VCs become invalid

#### 6.4.3 Deactivated DID Resolution

Resolving a deactivated DID MUST return the last known DID Document with the following metadata:

```json
{
  "didDocumentMetadata": {
    "deactivated": true,
    "deactivationDate": "2026-09-01T00:00:00Z",
    "deactivationReason": "voluntary"
  }
}
```

### 6.5 Authentication

All write operations (create, update, deactivate) against the TRAIL Registry MUST be authenticated using DID-based authentication. Bearer tokens and API keys MUST NOT be used as the sole authentication mechanism.

#### 6.5.1 DID-Based Authentication

The TRAIL Registry uses HTTP Message Signatures as defined in [RFC 9421](https://www.rfc-editor.org/rfc/rfc9421) with Ed25519 signing keys.

Each authenticated request MUST include:

1. An `Authorization` header identifying the DID:
   ```
   Authorization: DIDAuth {did}
   ```

2. A `Signature-Input` header specifying the signature parameters:
   ```
   Signature-Input: sig1=("@method" "@target-uri" "content-type" "content-digest");created={unix-timestamp};keyid="{did}#key-1";alg="ed25519"
   ```

3. A `Signature` header containing the Ed25519 signature over the covered components:
   ```
   Signature: sig1=:BASE64_ENCODED_SIGNATURE:
   ```

The registry MUST:
- Resolve the DID identified in the `Authorization` header
- Extract the public key referenced by the `keyid` parameter
- Verify the HTTP Message Signature against the covered components
- Reject requests where the signature is invalid or the key is not authorized for the requested operation

#### 6.5.2 First Registration Bootstrap

During first-time registration, the DID does not yet exist in the registry and cannot be resolved. The bootstrap process uses a self-certifying proof:

1. The registrant includes the full public key material in the registration request body (as part of the DID Document)
2. The HTTP Message Signature is verified against the public key embedded in the request
3. The registry verifies that the `trail-hash` in the requested DID correctly corresponds to the provided slug and public key (§4.5.2)
4. For `org` mode, an out-of-band KYB (Know Your Business) verification MUST be completed before the DID is activated

This ensures that even the first registration is cryptographically authenticated without requiring pre-existing credentials.

#### 6.5.3 Self-Signed Mode Authentication

Self-signed mode (`did:trail:self:`) operates locally and does not interact with the TRAIL Registry. Authentication in self-signed mode:

- The DID controller signs Verifiable Credentials with their Ed25519 private key
- Verifiers reconstruct the public key from the DID itself (the subject IS the public key)
- No network requests are required for authentication or verification
- All trust is derived from direct cryptographic verification of signatures

---

## 7. TRAIL Trust Extensions

### 7.1 TRAIL Verifiable Credentials

The TRAIL Registry issues Verifiable Credentials (conforming to VC Data Model 2.0) that attest to the identity and trust level of registered subjects:

#### TRAIL Identity Credential
```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://trailprotocol.org/ns/credentials/v1"
  ],
  "type": ["VerifiableCredential", "TrailIdentityCredential"],
  "issuer": "did:trail:org:trail-protocol-f0e1d2c3",
  "issuanceDate": "2026-03-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
    "legalName": "ACME Corporation GmbH",
    "jurisdiction": "DE",
    "trailTrustTier": 1,
    "trailTrustScore": {
      "overall": 0.87,
      "dimensions": {
        "identityVerification": 0.95,
        "trackRecord": 0.90,
        "informationProvenance": 0.80,
        "behavioralConsistency": 0.82,
        "thirdPartyAttestations": 0.70
      }
    },
    "certificationLevel": "standard"
  },
  "credentialStatus": {
    "id": "https://registry.trailprotocol.org/1.0/status/2026-03#42",
    "type": "StatusList2021Entry",
    "statusPurpose": "revocation",
    "statusListIndex": "42",
    "statusListCredential": "https://registry.trailprotocol.org/1.0/status/2026-03"
  }
}
```

### 7.2 Trust Tiers

The TRAIL ecosystem defines a three-tier trust model. Each tier represents an increasing level of identity assurance and organizational accountability.

#### Tier 0 — Self-Signed (Cryptographic Verification Only)

- **Mode:** `self`
- **Assurance Level:** Cryptographic proof of key control only
- **Verification:** Local, no network required
- **Use Cases:** Development, testing, bootstrapping, offline scenarios, minimal-trust B2B interactions
- **Trust Basis:** The verifier trusts that the presenter controls the private key corresponding to the DID. No organizational identity is attested.

Self-signed credentials MUST include `"trailTrustTier": 0` in the credential subject.

#### Tier 1 — Registry-Backed (KYB-Verified)

- **Mode:** `org` or `agent`
- **Assurance Level:** Cryptographic proof + verified organizational identity
- **Verification:** TRAIL Registry resolution + KYB (Know Your Business) verification
- **Use Cases:** Production B2B interactions, AI agent deployment, EU AI Act transparency compliance
- **Trust Basis:** The TRAIL Registry has verified the legal identity of the organization and the association of the agent with its parent organization.

#### Tier 2 — Audited (Registry + Third-Party Audit)

- **Mode:** `org` or `agent`
- **Assurance Level:** Cryptographic proof + KYB + independent third-party audit
- **Verification:** TRAIL Registry resolution + third-party audit attestation
- **Use Cases:** High-risk AI deployments, regulated industries (finance, healthcare), high-value B2B commerce
- **Trust Basis:** In addition to Tier 1 assurances, an accredited third-party auditor has independently verified the organization's AI practices, security controls, and compliance posture.

**Trust Tier Summary:**

| Property | Tier 0: Self | Tier 1: Registry | Tier 2: Audited |
|----------|-------------|-----------------|-----------------|
| Crypto verification | Yes | Yes | Yes |
| KYB identity check | No | Yes | Yes |
| Third-party audit | No | No | Yes |
| Registry required | No | Yes | Yes |
| Revocable | No (self-managed) | Yes | Yes |
| EU AI Act support | Minimal | Standard | Full |
| Trust Score | N/A | Computed | Computed + audited |

### 7.3 Trust Score

The TRAIL Trust Score quantifies the trustworthiness of a registered identity across five independently verifiable dimensions.

#### 7.3.1 Score Dimensions

| # | Dimension | Weight | Description | Verifiable By |
|---|-----------|--------|-------------|---------------|
| D1 | **Identity Verification** | 25% | Verified legal entity vs. self-declared | KYB documentation, eIDAS certificates, registry records |
| D2 | **Track Record** | 25% | Complaint rate over trailing 12 months | Public complaint registry, dispute resolution logs |
| D3 | **Information Provenance** | 20% | Are AI outputs verifiably sourced? | Signed output attestations, source citation credentials |
| D4 | **Behavioral Consistency** | 20% | AI output vs. declared policy alignment | Automated policy compliance checks, verifier reports |
| D5 | **Third-Party Attestations** | 10% | Attestations from other TRAIL participants | Verifiable Credentials from accredited attestors |

#### 7.3.2 Computation Algorithm

The overall Trust Score `S` is computed as:

```
S = Σ(wi × di) for i = 1..5
```

Where `wi` is the weight and `di` is the dimension score (0.0–1.0) for each dimension.

**Dimension Formulas:**

- **D1 (Identity Verification):**
  ```
  d1 = 0.4 (self-declared name only)
     + 0.3 (KYB document verified)
     + 0.2 (eIDAS-compatible identity verified)
     + 0.1 (annual re-verification current)
  ```
  Each component is binary (0 or its value). Maximum d1 = 1.0.

- **D2 (Track Record):**
  ```
  d2 = max(0, 1.0 - (complaints_12m / interactions_12m) × 100)
  ```
  Where `complaints_12m` is the number of verified complaints in the trailing 12 months and `interactions_12m` is the total number of recorded interactions. New registrants with < 30 days history receive d2 = 0.5 (neutral).

- **D3 (Information Provenance):**
  ```
  d3 = signed_outputs / total_outputs
  ```
  Where `signed_outputs` is the number of AI outputs accompanied by valid source attestation credentials. Measured over trailing 90 days.

- **D4 (Behavioral Consistency):**
  ```
  d4 = compliant_checks / total_checks
  ```
  Where `compliant_checks` is the number of automated policy compliance checks that passed. Measured over trailing 90 days.

- **D5 (Third-Party Attestations):**
  ```
  d5 = min(1.0, valid_attestations / 5)
  ```
  Where `valid_attestations` is the count of non-expired, non-revoked Verifiable Credentials from distinct accredited attestors. Capped at 5.

#### 7.3.3 Score Transparency

The TRAIL Registry MUST expose per-dimension scores in all resolution responses (see §6.2.1). The trust score in resolution metadata MUST be an object, not a single float:

```json
{
  "trailTrustScore": {
    "overall": 0.87,
    "dimensions": {
      "identityVerification": { "score": 0.95, "weight": 0.25 },
      "trackRecord": { "score": 0.90, "weight": 0.25 },
      "informationProvenance": { "score": 0.80, "weight": 0.20 },
      "behavioralConsistency": { "score": 0.82, "weight": 0.20 },
      "thirdPartyAttestations": { "score": 0.70, "weight": 0.10 }
    },
    "lastComputed": "2026-03-01T00:00:00Z"
  }
}
```

#### 7.3.4 Verifier-Side Computation

To enable independent verification of trust scores, the TRAIL Registry MUST provide a raw inputs endpoint:

```http
GET https://registry.trailprotocol.org/1.0/trust-score/did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a/inputs
Accept: application/json
```

**Response:**

```json
{
  "did": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
  "inputs": {
    "d1_identity": {
      "selfDeclared": true,
      "kybVerified": true,
      "eidasVerified": true,
      "reVerificationCurrent": true
    },
    "d2_trackRecord": {
      "complaints12m": 2,
      "interactions12m": 15420,
      "periodStart": "2025-03-01T00:00:00Z",
      "periodEnd": "2026-03-01T00:00:00Z"
    },
    "d3_provenance": {
      "signedOutputs": 12850,
      "totalOutputs": 16062,
      "periodDays": 90
    },
    "d4_consistency": {
      "compliantChecks": 4920,
      "totalChecks": 6000,
      "periodDays": 90
    },
    "d5_attestations": {
      "validAttestations": 3,
      "attestorDids": [
        "did:trail:org:audit-firm-a-b1c2d3e4",
        "did:trail:org:industry-assoc-c-f5a6b7c8",
        "did:trail:org:partner-d-d9e0f1a2"
      ]
    }
  },
  "computedScore": 0.87,
  "computedAt": "2026-03-01T00:00:00Z"
}
```

Verifiers MAY independently recompute the score from the raw inputs to confirm the registry's computation. Discrepancies SHOULD be reported via the dispute resolution process (§11.2).

#### 7.3.5 Third-Party Audit

Accredited auditors MAY independently audit trust score inputs and publish audit attestation credentials. These attestations:

- MUST be issued as Verifiable Credentials by the auditor's `did:trail` DID
- MUST reference the audited subject's DID
- MUST specify the audit scope (which dimensions were audited)
- SHOULD be published within 30 days of the audit completion
- Contribute to the D5 (Third-Party Attestations) dimension

#### 7.3.6 Trust Score Limitations

The trust score model has inherent limitations that verifiers MUST be aware of:

- **D3/D4 self-reporting:** Dimensions D3 (Information Provenance) and D4 (Behavioral Consistency) rely on data reported by the DID controller or their infrastructure. Without independent auditing (D5), these dimensions reflect self-attestation rather than independently verified behavior. Verifiers SHOULD weight D3/D4 lower when no third-party audit credentials (D5) are present.
- **Tier 0 exclusion:** Self-signed DIDs (Tier 0) do not participate in the trust score system at all, as there is no registry to collect or compute scores.
- **Gaming resistance:** The formula-based approach creates potential for strategic behavior optimization. The TRAIL Registry SHOULD implement anomaly detection for sudden score changes and MAY require minimum observation periods before scores are considered stable.
- **D5 bootstrapping:** Early in the ecosystem, few accredited auditors may exist, limiting the practical value of D5. The protocol anticipates this through the three-phase governance model (§11.1).

### 7.4 EU AI Act Alignment

TRAIL provides technical infrastructure that organizations can use to support their compliance efforts with the EU AI Act. This section maps TRAIL capabilities to specific EU AI Act requirements.

> **Disclaimer:** TRAIL registration does NOT constitute compliance with the EU AI Act. Compliance is the responsibility of the deploying organization. TRAIL provides tools and infrastructure to support compliance but does not replace legal assessment, risk management processes, or regulatory obligations. Organizations MUST conduct their own compliance assessment with qualified legal counsel.

#### 7.4.1 Capability Mapping

| EU AI Act Article | Requirement | TRAIL Capability | Compliance Gap |
|-------------------|-------------|------------------|----------------|
| **Art. 13** (Transparency) | AI systems must be designed to allow human oversight and include sufficient transparency for users | `did:trail` DID provides a unique, verifiable identity for each AI system; `TrailAIPolicyService` enables machine-readable disclosure of capabilities and limitations | TRAIL provides identity and disclosure infrastructure. Organizations must still ensure the content of disclosures meets Art. 13 requirements. Accuracy and completeness of disclosed information is the registrant's responsibility. |
| **Art. 14** (Human Oversight) | Providers must design high-risk AI with tools for effective human oversight | TRAIL Verifiable Credentials create an audit trail of AI system actions; trust score tracks behavioral consistency over time | TRAIL provides auditability infrastructure. Organizations must implement actual oversight processes, escalation procedures, and intervention capabilities independently. |
| **Art. 26** (Obligations of Deployers) | Deployers of high-risk AI must use systems in accordance with instructions, monitor operations, and keep logs | KYB-verified organizational identity links AI agents to accountable legal entities; revocation mechanism enables rapid deactivation of non-compliant agents | TRAIL supports identity linkage and revocation. Deployers must independently establish monitoring procedures, usage policies, and log retention in accordance with Art. 26. |
| **Art. 49** (Registration) | Providers and deployers must register high-risk AI systems in the EU database | TRAIL Trust Registry can serve as a complementary technical registry alongside the official EU database | TRAIL is NOT the official EU AI database. Registration in TRAIL does not satisfy Art. 49. Organizations MUST register in the official EU database independently. |
| **Art. 52** (Transparency for Certain AI Systems) | Persons interacting with AI must be informed they are interacting with AI | TRAIL DID can be presented in real-time to verify AI system identity; TRAIL Badge provides visual indicator | TRAIL provides the verification mechanism. Organizations must ensure actual notification is delivered to affected persons in a clear and timely manner. Implementation of UI/UX notification is the organization's responsibility. |

### 7.5 Platform Identity Binding (Managed Agent Support)

Platform-hosted AI agents (e.g., Anthropic Managed Agents, Azure AI, Google Vertex AI) are dynamically provisioned per session and cannot directly interact with the TRAIL Registry. This section defines the `PlatformIdentityBinding` Verifiable Credential type, which enables deploying organizations to establish a cryptographically verifiable link between a platform's internal deployment identifier and a registered `did:trail:agent` DID — without requiring platform cooperation.

#### 7.5.1 Motivation

When an enterprise deploys an AI agent on a third-party platform, two identity namespaces exist:

1. **Platform namespace** — An internal deployment identifier assigned by the platform operator (e.g., `managed-agent-deployment-abc`). This identifier is platform-specific and not externally resolvable without platform cooperation.
2. **TRAIL namespace** — The `did:trail:agent` DID registered by the deploying organization, externally resolvable and cryptographically verifiable.

An external auditor (e.g., a BaFin compliance officer verifying EU AI Act Art. 12 conformance) needs to establish that a specific platform deployment corresponds to the organization's registered identity — without contacting the platform operator. `PlatformIdentityBinding` provides this link.

#### 7.5.2 PlatformIdentityBinding Credential

The `PlatformIdentityBinding` credential is issued by the **deploying organization** (not by the platform). The deployer's `did:trail:org` DID MUST be the credential issuer.

**Normative definition:**

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://trailprotocol.org/ns/credentials/v1"
  ],
  "type": ["VerifiableCredential", "PlatformIdentityBinding"],
  "issuer": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
  "validFrom": "2026-04-01T00:00:00Z",
  "validUntil": "2027-04-01T00:00:00Z",
  "credentialSubject": {
    "id": "did:trail:agent:acme-sales-agent-v2-de-3f8c",
    "platformIdentity": {
      "platform": "anthropic",
      "deploymentId": "managed-agent-deployment-abc",
      "attestedBy": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a"
    }
  },
  "credentialStatus": {
    "id": "https://registry.trailprotocol.org/1.0/status/2026-04#17",
    "type": "StatusList2021Entry",
    "statusPurpose": "revocation",
    "statusListIndex": "17",
    "statusListCredential": "https://registry.trailprotocol.org/1.0/status/2026-04"
  }
}
```

**Field definitions:**

| Field | Requirement | Description |
|-------|-------------|-------------|
| `issuer` | MUST | The `did:trail:org` DID of the deploying organization. MUST match `credentialSubject.platformIdentity.attestedBy`. |
| `credentialSubject.id` | MUST | The `did:trail:agent` DID of the deployment. |
| `platformIdentity.platform` | MUST | Lowercase identifier of the platform operator. Registered values: `anthropic`, `azure`, `google`, `aws`, `other`. |
| `platformIdentity.deploymentId` | MUST | The platform's internal deployment identifier, as assigned by the platform operator. |
| `platformIdentity.attestedBy` | MUST | The `did:trail:org` DID of the attesting organization. MUST equal `issuer`. |
| `validFrom` / `validUntil` | MUST | Validity period of the binding. SHOULD not exceed 12 months. |
| `credentialStatus` | MUST | Revocation status entry conforming to W3C VC Status List 2021. |

#### 7.5.3 Verification Requirements

A verifier receiving a `PlatformIdentityBinding` credential MUST:

1. Resolve `credentialSubject.id` via the TRAIL Registry and verify the `did:trail:agent` DID is active.
2. Resolve `issuer` via the TRAIL Registry and verify the `did:trail:org` DID is active and at Tier 1 or above.
3. Verify that `issuer` equals `credentialSubject.platformIdentity.attestedBy`.
4. Verify the credential signature against the issuer's public key.
5. Verify the credential has not been revoked via `credentialStatus`.
6. Verify `validFrom` and `validUntil` bounds against the current timestamp.

A verifier MUST NOT require platform operator cooperation to complete verification. The binding is self-contained and externally auditable.

#### 7.5.4 Accountability Model

The `PlatformIdentityBinding` design preserves the Tier 1 accountability principle: the deploying organization is the accountable principal, not the platform operator. The deployer:

- Creates and maintains the `did:trail:agent` DID
- Issues and signs the `PlatformIdentityBinding` credential
- Is responsible for revoking the credential if the deployment is decommissioned or compromised

This design is platform-agnostic: the same pattern applies to Anthropic Managed Agents, Azure AI services, Google Vertex AI deployments, and future platforms without requiring platform-specific extensions to this specification.

#### 7.5.5 EU AI Act Art. 12 Audit Trail

For high-risk AI deployments subject to EU AI Act Article 12 (Record-Keeping), the `PlatformIdentityBinding` credential enables a cross-jurisdictional audit trail that:

- Does not require platform cooperation to access
- Is cryptographically bound to the deploying organization's verified identity
- Is accessible to EU regulatory bodies without triggering CLOUD Act concerns
- Can be independently verified by any party holding the TRAIL Registry's public key

Organizations claiming EU AI Act Art. 12 compliance via TRAIL SHOULD maintain `PlatformIdentityBinding` credentials for all managed agent deployments and ensure revocation occurs within the timeframes specified in §8.6.

---

## 8. Security Considerations

### 8.1 Key Security

- **Ed25519 key pairs** MUST be generated using a CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
- Private keys MUST be stored in hardware security modules (HSMs) for production deployments
- RECOMMENDED: key rotation every 12 months or upon suspected compromise
- The TRAIL Protocol RECOMMENDS using PKCS#11-compatible HSMs (e.g., AWS CloudHSM, Azure Dedicated HSM)
- Organizations MUST implement at least one key recovery mechanism as defined in §8.7

### 8.2 Crypto Agility

The TRAIL Protocol is designed for cryptographic agility — the ability to migrate to new cryptographic algorithms without breaking existing deployments.

#### 8.2.1 Supported Cryptosuites

All TRAIL implementations MUST support at least the following cryptosuite:

| Cryptosuite ID | Algorithm | Canonicalization | Key Type | Status |
|---|---|---|---|---|
| `eddsa-jcs-2023` | Ed25519 | JCS (RFC 8785) | OKP (Ed25519) | **Active** |

Additional cryptosuites MAY be added to the `SUPPORTED_CRYPTOSUITES` registry in future specification versions.

#### 8.2.2 DID Document Declaration

DID Documents MUST declare their supported cryptosuites using the `trail:supportedCryptosuites` property:

```json
{
  "trail:supportedCryptosuites": ["eddsa-jcs-2023"]
}
```

Verifiers SHOULD check that the `cryptosuite` field of any `DataIntegrityProof` is listed in the document's `trail:supportedCryptosuites` array.

#### 8.2.3 Migration Path

When a new cryptosuite is added:

1. The new suite is added to the specification with status `active`
2. Implementations MUST add the new suite to their `trail:supportedCryptosuites` array
3. A deprecation notice is published for any outgoing suite with a minimum 180-day transition window
4. After the transition window, the deprecated suite status changes to `deprecated`
5. Implementations SHOULD still verify `deprecated` proofs but MUST NOT create new proofs with deprecated suites

#### 8.2.4 Reference Implementation

The `createProof()` function in `@trailprotocol/core` accepts an explicit `cryptosuite` parameter:

```typescript
import { createProof, isSupportedCryptosuite } from '@trailprotocol/core';

// Default (eddsa-jcs-2023)
const proof = createProof(document, privateKey, verificationMethod);

// Explicit cryptosuite selection
const proof = createProof(document, privateKey, verificationMethod, 'assertionMethod', 'eddsa-jcs-2023');

// Runtime validation
if (isSupportedCryptosuite(suiteName)) {
  // safe to use
}
```

### 8.3 Registry Availability

The TRAIL Registry is a critical infrastructure component. The following security controls are REQUIRED:
- DDoS protection and rate limiting on the public resolution API
- Geographically distributed read replicas for resolution availability
- Signed registry responses (the Registry MUST sign all resolution responses with its own `did:trail:org:trail-protocol-f0e1d2c3` key)
- Audit logs for all write operations (create, update, deactivate)

### 8.4 Replay Attack Prevention

All signed requests to the TRAIL Registry MUST include a nonce and timestamp. The Registry MUST reject requests with timestamps older than 5 minutes or with previously seen nonces.

### 8.5 Man-in-the-Middle Attacks

All communication with the TRAIL Registry MUST use TLS 1.3 or higher. Certificate pinning is RECOMMENDED for high-value agent deployments.

### 8.6 Revocation Timeliness

Verifiers MUST check credential revocation status at verification time. Cached revocation lists MUST NOT be used for longer than 1 hour for high-stakes verification contexts.

### 8.7 Key Recovery

Loss of private key material can render a DID permanently unusable. Organizations MUST implement at least one of the following key recovery mechanisms.

#### 8.7.1 Multi-Controller Recovery

A DID Document MAY specify multiple controllers. If the primary controller's key is lost, an alternate controller can authorize key rotation.

The DID Document's `controller` property MUST be set to an array containing the primary DID and one or more recovery controller references:

```json
{
  "id": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
  "controller": [
    "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
    "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#recovery-key-1"
  ],
  "verificationMethod": [
    {
      "id": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#key-1",
      "type": "JsonWebKey2020",
      "controller": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
      "publicKeyJwk": { "kty": "OKP", "crv": "Ed25519", "x": "..." }
    },
    {
      "id": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#recovery-key-1",
      "type": "JsonWebKey2020",
      "controller": "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a",
      "publicKeyJwk": { "kty": "OKP", "crv": "Ed25519", "x": "..." }
    }
  ]
}
```

The recovery key SHOULD be stored in a separate, secure location (e.g., cold storage HSM, offline vault) distinct from the primary key.

#### 8.7.2 Social Recovery

Social recovery uses an M-of-N threshold scheme where designated guardians can collectively authorize key rotation. This is RECOMMENDED for organizations that require high resilience against single points of failure.

**Configuration:**
- RECOMMENDED: 3-of-5 threshold (3 guardians must agree out of 5 total)
- Guardians MUST be distinct legal entities with their own `did:trail` DIDs
- Guardians SHOULD be from different jurisdictions or organizational contexts to reduce correlated failure risk

The recovery policy is declared in the DID Document:

```json
{
  "trail:recoveryPolicy": {
    "type": "socialRecovery",
    "threshold": 3,
    "totalGuardians": 5,
    "guardians": [
      "did:trail:org:acme-corp-eu-a7f3b2c1e9d04f5a#recovery-key-1",
      "did:trail:org:trusted-partner-a-c3d4e5f6#key-1",
      "did:trail:org:trusted-partner-b-f6a7b8c9#key-1",
      "did:trail:org:legal-counsel-d-a1b2c3d4#key-1",
      "did:trail:org:auditor-e-e5f6a7b8#key-1"
    ],
    "recoveryTimeout": "P7D"
  }
}
```

The `recoveryTimeout` field specifies the mandatory waiting period (ISO 8601 duration) after a recovery request is initiated before the new key becomes active. This provides a window for the legitimate controller to detect and contest unauthorized recovery attempts.

**Recovery Process:**
1. The requester submits a recovery request to the TRAIL Registry, signed by at least one guardian
2. The registry notifies all guardians and the last-known controller contact
3. Additional guardians sign the recovery request until the threshold is met
4. After the `recoveryTimeout` expires and the threshold is met, the new key material is activated
5. The original key material is deactivated

#### 8.7.3 Registry-Assisted Recovery

For organizations that prefer registry-mediated recovery, the TRAIL Registry MAY assist with key recovery under strict conditions:

1. The registrant MUST complete a full KYB (Know Your Business) re-verification, equivalent to the original registration process
2. The registrant MUST provide documentary evidence of key loss (incident report, HSM failure documentation, etc.)
3. A mandatory 30-day waiting period MUST elapse after the recovery request is submitted
4. The TRAIL Registry MUST publish a public notice of the pending recovery to enable third-party objections
5. If no objections are raised during the waiting period, the new key material is activated

Registry-assisted recovery is a last-resort mechanism. It is RECOMMENDED only when multi-controller and social recovery are not available.

#### 8.7.4 Key Escrow (Optional)

For organizations in regulated industries (e.g., financial services, healthcare) where regulatory bodies may require access to key material, key escrow MAY be implemented:

- Escrow MUST use a split-key scheme where no single party holds the complete private key
- Escrow agents MUST be accredited entities (e.g., qualified trust service providers under eIDAS)
- Key reconstitution MUST require authorization from both the registrant and the regulatory authority
- Escrowed keys MUST be stored in FIPS 140-2 Level 3 (or higher) HSMs

Key escrow is OPTIONAL and MUST NOT be required for standard TRAIL registration.

### 8.8 Key Rotation Protocol

Key rotation allows an org or agent DID to update its verification key without changing its identifier. This is essential for key hygiene, post-compromise recovery, and long-term identity continuity.

#### 8.8.1 Rotation Mechanics

When a key is rotated:

1. A new verification method (`#key-N+1`) is generated and added to the DID Document
2. The `authentication` and `assertionMethod` arrays are updated to reference only the new key
3. The previous verification method is **retained** in the `verificationMethod` array for historical proof verification
4. Rotation metadata (previous key ID, new key ID, rotation timestamp) is recorded

```typescript
import { createDidDocument, rotateKey, generateKeyPair } from '@trailprotocol/core';

const keys1 = generateKeyPair();
const doc = createDidDocument(did, keys1, { mode: 'org' });

// Rotate to a new key
const keys2 = generateKeyPair();
const { document: rotated, rotationMetadata } = rotateKey(doc, keys2);
// rotated.verificationMethod.length === 2 (old + new)
// rotated.authentication === ['did:trail:org:...#key-2']
```

#### 8.8.2 Constraints

- Self-mode DIDs (`did:trail:self:`) MUST NOT use key rotation because their identifier is derived from the public key. A new self-mode DID MUST be created instead.
- Org and agent mode DIDs MAY rotate keys without limit.
- Verifiers SHOULD accept proofs signed by any non-revoked key listed in the `verificationMethod` array.
- The Registry MUST record the full key rotation history for audit purposes.

#### 8.8.3 Rotation Best Practices

- RECOMMENDED rotation interval: every 12 months, or immediately upon suspected compromise
- Organizations SHOULD implement automated rotation policies
- Each rotation SHOULD be signed by the **current** active key as authorization

### 8.9 Specification Versioning

DID Documents MUST include a `trail:specVersion` property indicating the specification version they conform to.

```json
{
  "trail:specVersion": "1.1.0"
}
```

This enables verifiers to apply the correct validation rules for the document format and allows the ecosystem to evolve without breaking backwards compatibility. The version follows [Semantic Versioning 2.0.0](https://semver.org/):

- **Major** version: breaking changes to the DID Document structure
- **Minor** version: new features that are backwards-compatible
- **Patch** version: clarifications, editorial fixes

Implementations MUST reject DID Documents whose major version exceeds the implementation's supported major version. Implementations SHOULD accept documents with a higher minor version (unknown properties SHOULD be ignored).

### 8.10 Revocation Roadmap

> **Status: Planned** — Credential revocation is a critical feature that requires registry infrastructure. The following design is specified for implementation when the TRAIL Registry reaches operational status.

The TRAIL Protocol will implement credential revocation using the [W3C Status List 2021](https://www.w3.org/TR/vc-status-list/) specification:

- Each issuer maintains a bitstring-based status list
- Credential status is checked via the `credentialStatus` property in the VC
- Status lists are published at deterministic URLs derived from the issuer DID
- Verifiers MUST check revocation status before accepting a credential

Until the registry is operational, self-mode credentials (Tier 0) have no revocation mechanism — they are valid as long as the underlying key material is under the controller's authority.

### 8.11 Protocol Roadmap

The following items are planned for future specification versions. They are documented here to ensure continuity and enable community feedback.

**v1.2.0 (planned)**
| Item | Description | Dependency |
|------|-------------|------------|
| Credential Revocation | W3C StatusList2021 bitstring-based revocation | Registry operational |
| Universal Resolver Driver | `did:trail` driver for DIF Universal Resolver | Registry operational |
| JSON-LD Context Deployment | Host `https://trailprotocol.org/ns/did/v1` as resolvable context | trailprotocol.org |
| npm Publish | Publish `@trailprotocol/core` to npmjs.com | CI/CD pipeline |
| CI/CD Pipeline | GitHub Actions: build, test, lint on every PR | — |

**v2.0.0 (planned)**
| Item | Description | Dependency |
|------|-------------|------------|
| Registry Server | HTTP API for Tier 1/2 DID Registration + Resolution | PostgreSQL backend |
| Trust Score Engine | 5-dimension computation (D1-D5) with per-dimension breakdown | Registry operational |
| Multiple Reference Implementations | Python and Go SDKs for interoperability proof | v1.2.0 stable |
| W3C DID Test Suite Compliance | Pass DIF interoperability test suite | Multiple implementations |
| Post-Quantum Migration | Add post-quantum cryptosuite via Crypto Agility framework | NIST PQC standards finalized |
| Intermediate CA Onboarding | Partner Registry Operator program | Governance framework v2 |

---

## 9. Privacy Considerations

### 9.1 Minimal Disclosure

`did:trail` DID Documents SHOULD contain only the minimum information necessary for the intended use case. Organizations are NOT required to disclose:
- Internal AI model names or versions
- Training data sources
- Proprietary prompt engineering

### 9.2 Public vs. Private Attributes

The AI Policy document (`TrailAIPolicyService` endpoint) SHOULD follow the [TRAIL Selective Disclosure Profile](https://trailprotocol.org/specs/selective-disclosure-v1), which defines:
- **Public attributes** (always disclosed): DID, legal name, jurisdiction, EU AI Act risk class, certification status
- **Restricted attributes** (disclosed on demand with consent): trust score details, complaint history
- **Private attributes** (never disclosed via protocol): training data, system prompts, cost structure

### 9.3 Correlation Risks

Using a single `org` DID across many interactions enables correlation of all those interactions. Organizations with elevated privacy requirements SHOULD:
- Use per-interaction `agent` DIDs with rotating key material
- Implement the TRAIL Pseudonymous Mode (see planned future specification)

### 9.4 GDPR Compliance

The TRAIL Registry processes personal data (legal entity information) as a Data Processor under GDPR. The Registry:
- Operates under a Data Processing Agreement with all registrants
- Stores PII in EU-jurisdiction data centers only
- Provides DSAR (Data Subject Access Request) capabilities
- Implements right to erasure via the DID deactivation mechanism

### 9.5 Right to Deactivate

Any DID controller MUST be able to deactivate their DID and associated credentials at any time without undue burden. Deactivation takes effect within 1 hour of the request.

---

## 10. Reference Implementation

### 10.1 Core Library

A reference implementation for `did:trail` is available at:

**Repository:** https://github.com/trailprotocol/trail-did-method
**Language:** Node.js (TypeScript)
**Package:** `@trailprotocol/core`

```typescript
import {
  generateKeyPair,
  createSelfDid,
  createOrgDid,
  createDidDocument,
  rotateKey,
  TrailResolver,
  createSelfSignedCredential,
  verifyCredential,
  isSupportedCryptosuite,
  SPEC_VERSION,
} from '@trailprotocol/core';

// Generate a new Ed25519 key pair
const keys = generateKeyPair();
console.log(keys.publicKeyMultibase);
// "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK"

// Create DIDs (self-mode requires no registry)
const selfDid = createSelfDid(keys.publicKeyMultibase);
const orgDid = createOrgDid('ACME Corporation', keys.publicKeyMultibase);
console.log(selfDid);  // "did:trail:self:z6Mk..."
console.log(orgDid);   // "did:trail:org:acme-a7f3b2c1e9d04f5a"

// DID Documents include specVersion and supportedCryptosuites
const doc = createDidDocument(orgDid, keys, { mode: 'org' });
console.log(doc['trail:specVersion']);           // "1.1.0"
console.log(doc['trail:supportedCryptosuites']); // ["eddsa-jcs-2023"]

// Key rotation (org/agent only — self-mode derives DID from key)
const newKeys = generateKeyPair();
const { document: rotated, rotationMetadata } = rotateKey(doc, newKeys);
console.log(rotated.verificationMethod.length);  // 2 (old + new)
console.log(rotated.authentication);             // ["did:trail:org:...#key-2"]

// Resolve a self-signed DID (offline, no network)
const resolver = new TrailResolver();
const result = await resolver.resolve(selfDid);
console.log(result.didDocument);

// Crypto agility: validate cryptosuites at runtime
console.log(isSupportedCryptosuite('eddsa-jcs-2023')); // true
console.log(isSupportedCryptosuite('unknown-suite'));   // false

// Create and verify a Verifiable Credential
const vc = createSelfSignedCredential(
  selfDid, orgDid,
  { role: 'operator' },
  keys.privateKeyBytes
);
const verification = verifyCredential(vc, keys.publicKeyBytes);
console.log(verification.valid); // true
```

### 10.2 CLI

```bash
# Generate a new Ed25519 key pair
npx @trailprotocol/core keygen

# Create a self-signed DID
npx @trailprotocol/core did create --mode self

# Create an org DID (outputs DID and DID Document; registration requires registry)
npx @trailprotocol/core did create --mode org --slug acme-corp-eu

# Resolve a self-signed DID locally
npx @trailprotocol/core did resolve did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

### 10.3 Universal Resolver Integration

`did:trail` is designed for integration with the [DIF Universal Resolver](https://resolver.identity.foundation). A Universal Resolver driver for `did:trail` is planned and will be published at:

**Repository:** https://github.com/trailprotocol/trail-did-method (under `/packages/universal-resolver-driver`)

The driver will conform to the Universal Resolver driver interface specification and support both registry-backed and self-signed resolution modes.

---

## 11. Governance

### 11.1 Governance Evolution

Governance of the TRAIL Protocol evolves through three planned phases to progressively decentralize decision-making while maintaining operational stability.

#### Phase 1: Founding Governance (2026)

- The founding team (TRAIL Protocol Initiative) makes all governance decisions
- Focus: Protocol stabilization, first registry operator accreditation, initial participant onboarding
- The Participant Agreement is a bilateral contract between the founding entity and each participant
- All protocol changes are published with rationale on the TRAIL GitHub repository
- Community feedback is actively solicited via GitHub Issues and the W3C CCG mailing list

#### Phase 2: Advisory Board (2027)

- An Advisory Board of 3-5 external members is established with advisory authority on governance changes
- Board composition MUST include at minimum:
  - One representative with data protection / privacy expertise
  - One representative from enterprise IT / platform operations
  - One representative with regulatory / legal expertise
- The founding entity retains veto authority during this phase
- Major governance changes require Advisory Board consultation (non-binding recommendation)
- Board members serve 2-year terms, renewable once

#### Phase 3: Multi-Stakeholder Governance (2028+)

- A Governance Board is established with representatives from:
  - TRAIL Registry operators
  - Accredited Certificate Authorities (Partner-CAs)
  - Verifier organizations
  - AI agent deployers
- Policy changes are decided by weighted vote (composition TBD based on ecosystem maturity)
- The founding entity retains control of root key material (analogous to the ICANN/IANA model)
- Optional transition to a foundation model if strategically beneficial
- All governance proceedings and decisions are published publicly

### 11.2 Dispute Resolution

#### Dispute Categories

| Category | Description | Initial Handler | Escalation Path |
|----------|-------------|-----------------|-----------------|
| **Technical** | DID resolution failures, incorrect trust scores, registry errors | Registry Operator support | TRAIL Technical Committee |
| **Identity** | Contested slug ownership, trademark conflicts, impersonation | TRAIL Registry team | Advisory Board / Governance Board |
| **Conduct** | Misrepresentation, harmful AI behavior, policy violations | TRAIL Registry team | Governance Board |
| **Revocation** | Disputed revocation decisions, reinstatement requests | TRAIL Registry team | Revocation Appeals Process |
| **Commercial** | Fee disputes, SLA violations, contract disagreements | TRAIL commercial team | Binding arbitration (ICC Rules) |

#### Revocation Appeals Process

When a DID is revoked by the registry (§6.4.2) and the controller disputes the revocation, the following appeals process applies:

1. **Formal Appeal Submission** — The DID controller submits a written appeal within 30 days of receiving the revocation notice. The appeal MUST include a statement of facts and any supporting evidence.
2. **Preliminary Review** — The TRAIL Registry team reviews the appeal within 14 days and either reinstates the DID (if the revocation was clearly in error) or escalates to the Governance Board.
3. **Governance Board Hearing** — The Governance Board (or Advisory Board in Phase 2) reviews the case, including written submissions from both parties, within 30 days of escalation.
4. **Decision** — The Board issues a written, reasoned decision. Outcomes may include: reinstatement, sustained revocation, conditional reinstatement (with remediation requirements), or modified sanctions.
5. **Final Arbitration** — If the controller remains unsatisfied, they may invoke binding arbitration under ICC Rules within 60 days of the Board decision. The arbitration seat is Frankfurt am Main, Germany.

During the appeals process, the DID status is set to `"suspended"` (not `"revoked"`) unless the revocation was triggered by immediate harm concerns.

### 11.3 Registry Operator Requirements

Any entity operating a TRAIL Registry (whether the default registry or a federated instance per §3.3) MUST meet the following requirements:

| Requirement | Specification |
|-------------|---------------|
| **Certificate Policy (CP)** | MUST publish a Certificate Policy document conforming to RFC 3647 structure |
| **Certificate Practice Statement (CPS)** | MUST publish a CPS describing operational practices |
| **Uptime SLA** | MUST maintain 99.9% availability for the resolution API (measured monthly) |
| **Annual Audit** | MUST undergo an independent security audit annually (SOC 2 Type II or equivalent) |
| **Insurance** | MUST maintain cyber liability insurance of at least EUR 1,000,000 |
| **Incident Response** | MUST maintain a documented incident response plan with 1-hour initial response SLA for critical incidents |
| **Data Jurisdiction** | MUST store all personal data within the EU/EEA unless explicitly agreed otherwise with registrants |
| **Revocation Capability** | MUST be able to revoke any DID within 1 hour of a validated revocation request |
| **Key Ceremony** | Root key generation and rotation MUST follow a documented key ceremony process with at least 2 independent witnesses |

### 11.4 Change Management

Changes to the TRAIL Protocol specification, governance framework, and registry operating procedures follow a structured change management process:

| Change Type | Notice Period | Approval Required | Examples |
|-------------|---------------|-------------------|----------|
| **Non-breaking** | 90 days | Registry Operator notification | New optional DID Document properties, new service types, trust score formula adjustments |
| **Breaking** | 180 days | Advisory/Governance Board approval | ABNF syntax changes, authentication mechanism changes, removal of supported modes |
| **Emergency** | Immediate | Post-hoc ratification within 30 days | Critical security patches, zero-day vulnerability mitigations |

All changes:
- MUST be versioned using Semantic Versioning (MAJOR.MINOR.PATCH)
- MUST be published to the TRAIL GitHub repository with a changelog entry
- MUST include a migration guide for breaking changes
- SHOULD include a reference implementation update

---

## 12. Appendix A — JSON Registry Entry

The following JSON file is submitted for inclusion in the [W3C DID Specification Registries](https://github.com/w3c/did-spec-registries/tree/main/methods) as `trail.json`:

```json
{
  "name": "trail",
  "status": "provisional",
  "verifiableDataRegistry": "TRAIL Registry (https://registry.trailprotocol.org)",
  "specification": "https://trailprotocol.org/specs/did-method-v1",
  "contactName": "Christian Hommrich",
  "contactEmail": "christian.hommrich@gmail.com",
  "contactWebsite": "https://trailprotocol.org"
}
```

---

## 13. Appendix B — Example DID Documents

### B.1 Minimal Organization DID Document

```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://trailprotocol.org/ns/did/v1"],
  "id": "did:trail:org:example-gmbh-de-b8c9d0e1",
  "verificationMethod": [{
    "id": "did:trail:org:example-gmbh-de-b8c9d0e1#key-1",
    "type": "JsonWebKey2020",
    "controller": "did:trail:org:example-gmbh-de-b8c9d0e1",
    "publicKeyJwk": {
      "kty": "OKP", "crv": "Ed25519",
      "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"
    }
  }],
  "authentication": ["did:trail:org:example-gmbh-de-b8c9d0e1#key-1"],
  "assertionMethod": ["did:trail:org:example-gmbh-de-b8c9d0e1#key-1"]
}
```

### B.2 AI Agent DID Document

```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://trailprotocol.org/ns/did/v1"],
  "id": "did:trail:agent:example-gmbh-de-support-bot-v2-e1f2a3b4",
  "controller": "did:trail:org:example-gmbh-de-b8c9d0e1",
  "trail:aiSystemType": "agent",
  "trail:euAiActRiskClass": "minimal",
  "trail:parentOrganization": "did:trail:org:example-gmbh-de-b8c9d0e1",
  "trail:trailTrustTier": 1,
  "verificationMethod": [{
    "id": "did:trail:agent:example-gmbh-de-support-bot-v2-e1f2a3b4#key-1",
    "type": "JsonWebKey2020",
    "controller": "did:trail:agent:example-gmbh-de-support-bot-v2-e1f2a3b4",
    "publicKeyJwk": {
      "kty": "OKP", "crv": "Ed25519",
      "x": "SL0q3Ldb2_XtIiR2fwWoXL97uZa5tKdXxO__fwXBmxM"
    }
  }],
  "authentication": ["did:trail:agent:example-gmbh-de-support-bot-v2-e1f2a3b4#key-1"],
  "assertionMethod": ["did:trail:agent:example-gmbh-de-support-bot-v2-e1f2a3b4#key-1"],
  "service": [{
    "id": "did:trail:agent:example-gmbh-de-support-bot-v2-e1f2a3b4#trail-registry",
    "type": "TrailRegistryService",
    "serviceEndpoint": "https://registry.trailprotocol.org/1.0/identifiers/did:trail:agent:example-gmbh-de-support-bot-v2-e1f2a3b4"
  }]
}
```

### B.3 Self-Signed DID Document

```json
{
  "@context": ["https://www.w3.org/ns/did/v1", "https://trailprotocol.org/ns/did/v1"],
  "id": "did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "trail:trailTrustTier": 0,
  "verificationMethod": [{
    "id": "did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1",
    "type": "JsonWebKey2020",
    "controller": "did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "publicKeyJwk": {
      "kty": "OKP", "crv": "Ed25519",
      "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"
    }
  }],
  "authentication": ["did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1"],
  "assertionMethod": ["did:trail:self:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK#key-1"]
}
```

---

## 14. Appendix C — Test Vectors

The following test vectors allow implementers to verify their `did:trail` implementations produce correct output.

### 14.1 Key Material

```
Public Key (hex):      226ae6b63582ef8d753b75ad4236b86927dc7a36f793d97259268bd3c3f68800
Public Key (multibase): z3KMQXnVKR9qMzkJFfoo9WAYb1A7rdUbEkDCwNWTp6uJX
```

### 14.2 Self-Mode DID

```
Input:  publicKeyMultibase = "z3KMQXnVKR9qMzkJFfoo9WAYb1A7rdUbEkDCwNWTp6uJX"
Output: did:trail:self:z3KMQXnVKR9qMzkJFfoo9WAYb1A7rdUbEkDCwNWTp6uJX
```

### 14.3 Org-Mode DID (Slug Normalization + Hash Suffix)

```
Input:            "ACME Corporation GmbH"
Normalized slug:  "acme"
Hash input:       "acme:z3KMQXnVKR9qMzkJFfoo9WAYb1A7rdUbEkDCwNWTp6uJX"
SHA-256 (hex):    bd70674e4dff8c3a...
trail-hash:       "bd70674e4dff8c3a"
Output DID:       did:trail:org:acme-bd70674e4dff8c3a
```

### 14.4 JCS Canonicalization (RFC 8785)

```
Input (JSON):  {"id":"did:trail:self:z3KMQXnVKR9qMzkJFfoo9WAYb1A7rdUbEkDCwNWTp6uJX","@context":["https://www.w3.org/ns/did/v1"]}
JCS output:    {"@context":["https://www.w3.org/ns/did/v1"],"id":"did:trail:self:z3KMQXnVKR9qMzkJFfoo9WAYb1A7rdUbEkDCwNWTp6uJX"}
SHA-256 (hex): 4c882a71d1796fabe2aa94748f6035c1e7581f984f3785291d403090b36ed208
```

Note: The JCS output differs from the input in key ordering (`@context` sorts before `id`). The SHA-256 of the JCS output is what gets signed in DataIntegrityProof operations.

---

## 15. Changelog

### v1.2.0-draft (2026-04-10)

This release adds normative support for platform-hosted AI agent deployments (Managed Agents). It addresses the structural gap identified in v1.1.0-draft: the assumption that an agent has a persistent identity and can directly interact with the TRAIL Registry does not hold for agents dynamically provisioned per session by third-party platforms.

| # | Change | Sections Affected |
|---|--------|-------------------|
| 1 | **Extended `agent` mode — Deployment vs. Instance distinction** — The `agent` identifier mode now explicitly represents a *deployment* (configuration), not a running instance. Added normative text on registration authority (deployer org), lifecycle semantics, and platform-hosted agent support. | §4.2 |
| 2 | **Added `PlatformIdentityBinding` VC type** — New credential type enabling deploying organizations to cryptographically link a platform's internal deployment ID to a `did:trail:agent` DID. Signed by deployer, not platform. No platform cooperation required for audit. Full normative definition including field requirements, verification algorithm, accountability model, and EU AI Act Art. 12 audit trail guidance. | §7.5 (new) |

Community discussion: [GitHub Discussion #10](https://github.com/trailprotocol/trail-did-method/discussions/10)
Tracking issue: [Issue #9](https://github.com/trailprotocol/trail-did-method/issues/9)

### v1.1.0-draft (2026-03-04)

This release addresses 9 critical improvements identified during community review and internal audit of v1.0.0-draft.

| # | Change | Sections Affected |
|---|--------|-------------------|
| 1 | **Replaced "decentralized" with "vendor-neutral"** — The TRAIL Registry is not decentralized in the blockchain sense; it is a vendor-neutral, federated infrastructure. Terminology updated throughout. Added federation support (§3.3). | Abstract, §1.1, §1.2, §3.3 |
| 2 | **Replaced Bearer token auth with DID Auth** — All API examples now use HTTP Message Signatures (RFC 9421) with Ed25519 keys instead of Bearer tokens. Added dedicated Authentication section. | §6.1.2, §6.3, §6.4.1, §6.5 (new) |
| 3 | **Added content-addressable hash suffix** — DID identifiers for `org` and `agent` modes now include a 16-character hash suffix (64-bit) derived from the slug and public key, providing collision resistance to ~4.3 billion identifiers. | §4.1, §4.2, §4.4, §4.5 (new), all examples |
| 4 | **Made Trust Score transparent** — Trust score is now a structured object with per-dimension breakdown instead of an opaque float. Added verifier-side computation endpoint and exact scoring formulas. | §7.3 (rewritten) |
| 5 | **Reframed self-signed mode** — Renamed from "Early Adopter Mode" to "Local Verification Mode." Now positioned as the foundational trust tier (Tier 0) rather than a temporary workaround. Added 3-tier trust model. | §4.2, §7.2 (rewritten) |
| 6 | **Fixed EU AI Act overclaims** — Changed language from "designed for compliance" to "designed to support organizational compliance." Added honest capability mapping table with explicit compliance gaps and disclaimer. | Abstract, §1.2, §7.4 (new) |
| 7 | **Added Governance section** — New §11 covering governance evolution (3 phases), dispute resolution with revocation appeals process, registry operator requirements, and change management. | §11 (new), §6.4.2 |
| 8 | **Added Key Recovery mechanisms** — New §8.7 defining four recovery options: multi-controller, social recovery (M-of-N threshold), registry-assisted recovery, and optional key escrow. | §8.1, §8.7 (new), §5.2 |
| 9 | **Rewrote Reference Implementation** — Removed fictional package references. Replaced with `@trailprotocol/core` (actual package under development). Universal Resolver driver marked as planned. | §10 (rewritten) |
| 10 | **Added Crypto Agility** — New §8.2 defining the `SUPPORTED_CRYPTOSUITES` registry, DID Document `trail:supportedCryptosuites` declaration, and migration path for future algorithm transitions. `createProof()` now accepts an explicit `cryptosuite` parameter. | §8.2 (rewritten) |
| 11 | **Added Key Rotation Protocol** — New §8.8 specifying key rotation mechanics for org/agent DIDs. Previous keys are retained for historical verification. Self-mode DIDs cannot rotate (key = identifier). | §8.8 (new) |
| 12 | **Added Specification Versioning** — New §8.9. DID Documents now include `trail:specVersion` for backwards-compatible evolution. Follows Semantic Versioning 2.0.0. | §8.9 (new) |
| 13 | **Added Revocation Roadmap** — New §8.10 defining the planned W3C Status List 2021 integration for credential revocation. | §8.10 (new) |
| 14 | **Added Protocol Roadmap** — New §8.11 documenting planned features for v1.2.0 and v2.0.0 including Universal Resolver driver, npm publish, Trust Score Engine, and post-quantum migration. | §8.11 (new) |
| 15 | **Added EBSI + Technical Differentiation Table** — Added did:ebsi to §1.3 relationship table and new 10-criterion technical comparison matrix (did:trail vs did:web vs did:ion vs did:ebsi). | §1.3 (expanded) |
| 16 | **Increased hash suffix from 48-bit to 64-bit** — Changed `trail-hash` ABNF from `12HEXDIG` to `16HEXDIG` (SHA-256 truncated to 64 bits) to increase birthday-bound collision resistance from ~16.7M to ~4.3B identifiers. All examples updated. | §4.1, §4.5.2, ABNF, all examples |

### v1.0.0-draft (2026-03-01)

- Initial specification draft submitted for W3C DID Specification Registries

---

## 16. References

### Normative References

- [DID-CORE] W3C. *Decentralized Identifiers (DIDs) v1.0*. https://www.w3.org/TR/did-core/
- [VC-DATA-MODEL-2.0] W3C. *Verifiable Credentials Data Model v2.0*. https://www.w3.org/TR/vc-data-model-2.0/
- [DID-SPEC-REGISTRIES] W3C. *DID Specification Registries*. https://www.w3.org/TR/did-spec-registries/
- [RFC8037] IETF. *CFRG Elliptic Curves for JOSE and COSE*. https://www.rfc-editor.org/rfc/rfc8037
- [RFC7517] IETF. *JSON Web Key (JWK)*. https://www.rfc-editor.org/rfc/rfc7517
- [RFC9421] IETF. *HTTP Message Signatures*. https://www.rfc-editor.org/rfc/rfc9421
- [RFC8785] IETF. *JSON Canonicalization Scheme (JCS)*. https://www.rfc-editor.org/rfc/rfc8785
- [RFC8032] IETF. *Edwards-Curve Digital Signature Algorithm (EdDSA)*. https://www.rfc-editor.org/rfc/rfc8032
- [DI-EDDSA] W3C CCG. *Data Integrity EdDSA Cryptosuites v1.0*. https://www.w3.org/TR/vc-di-eddsa/
- [SEMVER] Preston-Werner, T. *Semantic Versioning 2.0.0*. https://semver.org/
- [RFC2119] IETF. *Key words for use in RFCs*. https://www.rfc-editor.org/rfc/rfc2119
- [STATUS-LIST-2021] W3C CCG. *Status List 2021*. https://www.w3.org/TR/vc-status-list/

### Informative References

- [EU-AI-ACT] European Parliament. *Regulation (EU) 2024/1689 on Artificial Intelligence*. https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- [EIDAS-2] European Parliament. *Regulation (EU) 2024/1183 (eIDAS 2.0)*. https://eur-lex.europa.eu/eli/reg/2024/1183/oj
- [EIP-6551] Ethereum. *Token Bound Accounts*. https://eips.ethereum.org/EIPS/eip-6551
- [OID4VC] OpenID Foundation. *OpenID for Verifiable Credentials*. https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html
- [RFC3647] IETF. *Internet X.509 PKI Certificate Policy and Certification Practices Framework*. https://www.rfc-editor.org/rfc/rfc3647
- [TRAIL-WHITEPAPER] Hommrich, C. *TRAIL Protocol Whitepaper v1.0*. 2026. https://trailprotocol.org/whitepaper
- [TRAIL-BLUEPRINT-1] Hommrich, C. *TRAIL Protocol Blueprint Part 1*. 2026. https://trailprotocol.org/blueprint/part1
- [TRAIL-BLUEPRINT-2] Hommrich, C. *TRAIL Protocol Blueprint Part 2*. 2026. https://trailprotocol.org/blueprint/part2

---

*Copyright 2026 Christian Hommrich / TRAIL Protocol Initiative. Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).*
*This specification is submitted to the W3C Credentials Community Group for review.*
*Repository: https://github.com/trailprotocol/trail-did-method*
