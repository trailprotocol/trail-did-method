# TRAIL Protocol - Examples

This directory contains practical examples for working with the `did:trail` DID method.

## Sample DID Documents

| File | Description |
|------|-------------|
| `self-did-document.json` | Example self-mode DID Document |
| `org-did-document.json` | Example organization DID Document |
| `agent-did-document.json` | Example agent DID Document |

## Code Examples

The JavaScript examples live in [`examples/js/`](./js/) and demonstrate:

- DID generation in `self`, `org`, and `agent` modes
- DID Document creation
- local/offline resolution for `did:trail:self`
- Verifiable Credential issuance and verification
- tamper detection using `DataIntegrityProof`

See [`examples/js/README.md`](./js/README.md) for setup instructions and how to run the scripts.

## Reference Implementation

The [`@trailprotocol/core`](https://www.npmjs.com/package/@trailprotocol/core) npm package provides the reference implementation for:

- DID generation and resolution
- JSON Canonicalization (JCS, RFC 8785)
- DataIntegrityProof (`eddsa-jcs-2022`)
- Verifiable Credential issuance and verification

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines. The `examples/` directory is a good entry point for first-time contributors.