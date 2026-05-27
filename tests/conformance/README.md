# TRAIL Conformance Test Suite

Portable JSON test vectors + a self-contained Node.js harness that lets external
implementers verify that their `did:trail` implementation matches the
[TRAIL DID Method Specification](../../spec/did-method-trail-v1.md).

## Scope

| Directory | Spec Section | What it checks |
|-----------|--------------|----------------|
| `did-creation/` | §4 (DID Method Syntax), §4.5 (Identifier Normalization) | DID syntax, slug normalization, 16-hex `trail-hash` derivation |
| `did-resolution/` | §6.2 (Read/Resolve) | Resolution result envelope, `@context` ordering, error codes |
| `revocation/` | §7.3 (Revocation) | `BitstringStatusListEntry` shape, `statusPurpose` enum, bit semantics (0=active, 1=revoked) |
| `trust-score/` | §7.3 (Trust Score), §3.4 (Trust Anchor Tiers) | D1–D5 averaging, tier mapping (root/sub/endorsement/self) |

## Layout

```
tests/conformance/
├── harness.mjs                     # Node.js runner, no external deps
├── README.md                       # this file
├── did-creation/{valid,invalid}/   # JSON test vectors
├── did-resolution/{valid,invalid}/
├── revocation/{valid,invalid}/
└── trust-score/{valid,invalid}/
```

Each vector is a single JSON file with at least:

```json
{
  "scope": "<scope-name>",
  "section": "§X.Y reference into spec",
  "expected": "valid" | "invalid",
  "description": "human-readable explanation",
  "input": { /* implementation input */ },
  "output": { /* expected output, valid only */ } |
  "expectedError": { /* expected error envelope, invalid only */ }
}
```

## Running the Suite

From the repository root:

```bash
node tests/conformance/harness.mjs
```

Run a single scope:

```bash
node tests/conformance/harness.mjs --scope=did-creation
```

The harness exits `0` if every vector passes and `1` if any fails. It uses only
Node built-ins (`node:crypto`, `node:fs`, `node:path`) and works on any
Node ≥ 18.

## Test Semantics

- **`valid/*`** — When you feed `input` into your implementation, it MUST produce
  exactly `output`. Any deviation (different slug, different hash, missing
  context) is a conformance violation.
- **`invalid/*`** — Your implementation MUST reject `input` with the documented
  `expectedError`. Accepting a non-conformant input or returning a different
  error code is a conformance violation.

### Documentation-Only Vectors

Two `did-resolution/invalid/` vectors document expected error responses that
depend on registry state (e.g. `notFound`). The harness verifies the
well-formedness of the documented error envelope but cannot exercise the
runtime behaviour without a live registry. Implementers SHOULD mirror the same
behaviour in their integration tests.

## Reference Behaviour

The harness implements one reference path per scope, derived directly from the
spec:

- **DID creation** — slug normalization, SHA-256(slug + ':' + publicKeyMultibase),
  16-hex truncation, regex-validated DID string.
- **DID resolution** — `@context` array shape, `verificationMethod` cardinality,
  resolution metadata `contentType`.
- **Revocation** — required fields enumerated in §7.3,
  `statusPurpose ∈ {revocation, suspension}`, bit-at-index → revoked boolean.
- **Trust Score** — unweighted average of D1–D5, range check `[0, 100]`,
  tier thresholds 90 / 70 / 50.

## Spec-Versions Notes

These vectors target spec **v1.2.0** (current draft). If you find a vector that
disagrees with a published normative statement of the spec, please open an
issue — the spec is authoritative, the suite is illustrative.

## Adding New Vectors

1. Place a new JSON file under the appropriate scope and `valid/` or `invalid/`
   subfolder.
2. Re-run the harness; ensure all checks pass.
3. Update this README's table if you are adding a new scope.

## License

Vectors and harness are released under the same license as the rest of the
repository (see [LICENSE](../../LICENSE)).
