# TRAIL Protocol - DID Document Validation

This directory contains a validation module for checking whether a `did:trail` DID Document conforms to the validation rules defined for Issue #6 and the core structures described in the TRAIL DID Method specification.

## Files

- `did-document-validator.js` — validation logic
- `validate.js` — CLI runner
- `fixtures/` — valid and invalid example DID Documents

## What the validator checks

The validator currently checks:

- required top-level fields:
  - `id`
  - `controller`
  - `verificationMethod`
  - `authentication`
- `id` format for:
  - `did:trail:self:<multibase>`
  - `did:trail:org:<slug>-<16hex>`
  - `did:trail:agent:<slug>-<16hex>`
- `verificationMethod` entries:
  - required `id`, `type`, `controller`
  - valid key material via `publicKeyJwk` or `publicKeyMultibase`
- `authentication` references:
  - each entry must point to an existing `verificationMethod.id`
- `service` entries (if present):
  - valid `id`, `type`, and `serviceEndpoint`
- `capabilityDelegation` entries (if present):
  - each entry must reference an existing verification method or a valid `did:trail` DID / DID URL
- agent-specific validation:
  - `trail:parentOrganization` must be present and must be a valid `did:trail:org` DID

## Run the CLI

From the repository root:

```bash
node validation/validate.js validation/fixtures/valid-did-document.json