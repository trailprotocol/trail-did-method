# TRAIL Protocol - JavaScript Examples

Working examples showing how to use `did:trail` with Node.js.

## Prerequisites

- Node.js 18+ (uses built-in `crypto` module)
- npm

## Setup

```bash
cd examples/js
npm install
```

## Examples

### DID Resolution (`did-resolution.js`)

Creates DIDs in all three modes (self, org, agent), builds DID Documents, and resolves a self-issued DID offline.

```bash
node did-resolution.js
```

**What you'll learn:**
- Ed25519 keypair generation
- The three DID modes and their trust tiers
- DID Document structure (W3C DID Core 1.0)
- Offline resolution for self-mode DIDs

### VC Verification (`vc-verification.js`)

Issues a self-signed Verifiable Credential with a DataIntegrityProof, then verifies it - including a tamper detection test.

```bash
node vc-verification.js
```

**What you'll learn:**
- Verifiable Credentials 2.0 structure
- DataIntegrityProof with `eddsa-jcs-2023` cryptosuite
- JSON Canonicalization (JCS, RFC 8785)
- Cryptographic verification and tamper detection

## Reference

- [`@trailprotocol/core`](https://www.npmjs.com/package/@trailprotocol/core) - Full API reference
- [TRAIL DID Method Spec](../../did-method-spec.md) - Specification v1.1.0
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - How to contribute
