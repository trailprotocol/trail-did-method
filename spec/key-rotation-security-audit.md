# Key Rotation Security Audit — Draft Review

This draft reviews the current `did:trail` key rotation model with focus on org/agent DIDs, registry-backed trust, federation consistency, revocation propagation, and stale DID Document replay.

## Summary

The current design has a solid baseline:

- `did:trail:self:*` cannot rotate because the public key is embedded in the DID itself.
- `org` and `agent` DIDs can rotate keys while preserving DID continuity.
- Old keys may be retained for historical proof verification.
- `authentication` and `assertionMethod` can be updated to reference the new active key.
- The design can support auditable key rotation history

The main security gap is not routine rotation. The hard case is **compromised-key rotation**: if an attacker controls the current active key, they may be able to submit a formally valid rotation to an attacker-controlled key unless the protocol clearly distinguishes routine rotation from emergency recovery.

---

## 1. Threat Model

### Assets to protect

1. DID controller continuity
2. Current active verification method
3. Historical proof validity
4. Registry trust state
5. Revocation status
6. Federation consistency
7. Verifier freshness guarantees

### Adversaries

1. Malicious agent/operator
2. Attacker with compromised active private key
3. Attacker replaying stale DID Documents
4. Compromised or malicious registry
5. Network attacker during DID resolution
6. Federation desync attacker exploiting inconsistent registry state

---

## 2. Key Attack Scenarios

### A1 — Compromised Active Key Rotates to Attacker Key

**Scenario**

An attacker obtains the current active private key for:

```
did:trail:org:example#key-1
```

The attacker submits a DID Document update that adds:

```
did:trail:org:example#key-2
```

and updates `authentication` / `assertionMethod` to only reference `#key-2`.

Because the rotation is signed by the current key, the registry may treat it as valid.

**Risk**

If the only required authorization is "signed by the current active key," key compromise becomes identity takeover.

**Suggested mitigation**

Separate rotation into two classes:

#### Routine rotation

- Signed by the current active key
- Requires monotonic version increment
- May allow a short overlap window

#### High-risk / compromise recovery

Triggered when compromise is suspected. Requires one or more independent recovery factors such as:

- recovery controller signature
- threshold guardian approval
- registry-assisted recovery
- out-of-band re-verification for higher-trust org identities

**Normative suggestion**

> A key rotation request that replaces the sole active authentication key SHOULD NOT be authorized only by that same key in high-risk contexts. Registries SHOULD require an independent recovery authorization factor when compromise is suspected or when rotation risk signals are present.

---

### A2 — Replay of Stale DID Document

**Scenario**

A verifier receives an older DID Document where `#key-1` is still active, even though the registry has already rotated to `#key-2` or revoked `#key-1`.

**Risk**

An attacker can continue using old credentials or signatures during cache windows, network partitions, or stale resolver responses.

**Suggested mitigation**

Each registry-backed DID Document should include registry-controlled freshness metadata, for example:

```json
{
  "trail:version": 7,
  "trail:updatedAt": "2026-04-27T00:00:00Z",
  "trail:previousVersionHash": "z...",
  "trail:registrySignature": {
    "verificationMethod": "did:trail:registry:example#key-1",
    "proofValue": "z..."
  }
}
```

Verifiers should reject stale documents when:

- `trail:version` decreases
- `updatedAt` falls outside verifier freshness policy
- registry signature is missing or invalid
- the document conflicts with authoritative registry state

**Normative suggestion**

> For registry-backed org and agent DIDs, each DID Document update MUST increment a monotonic registry-controlled version number. Verifiers MUST reject DID Documents with a version lower than the most recent version previously observed for the same DID, unless explicitly resolving a historical version.

---

### A2b — Resolver Cache Freshness / Downgrade Surface

**Scenario**

A Universal Resolver deployment or intermediary cache returns a DID Resolution Result that is validly formatted but stale relative to the authoritative registry state.

**Risk**

Replay protection may exist at the registry API layer while stale resolver output still causes verifiers to trust outdated key state.

**Suggested mitigation**

Resolver-backed resolution for registry-managed DID modes should surface freshness metadata sufficient to detect stale-cache replay, including:

- authoritative version
- last updated timestamp
- optional registry signature or checkpoint reference

**Questions worth specifying**

- What cache lifetime is acceptable for registry-backed `did:trail:org` and `did:trail:agent` DID Documents?
- Should verifiers reject resolver output older than their local highest-seen state for the DID?
- Should freshness policy differ between self mode and registry-backed modes?

**Normative suggestion**

> Resolver-backed resolution for registry-managed DID modes SHOULD expose freshness metadata sufficient to detect downgrade or stale-cache replay, and verifiers SHOULD apply freshness and version checks before trusting active key state.

---

### A3 — Federation Desync During Rotation

**Scenario**

Registry A has rotated a DID to `#key-2`, but Registry B or a verifier cache still accepts `#key-1`.

**Risk**

An attacker exploits the inconsistency window to present old signatures or credentials.

**Suggested mitigation**

Federation should preserve a strict source-of-truth rule:

- only the authoritative registry can publish active key state
- non-authoritative registries may mirror but must not override
- verifiers should recompute trust from authoritative raw inputs where possible

**Normative suggestion**

> A verifier MUST treat key state from the DID's authoritative registry as the source of truth. Mirrored or federated registry responses MUST NOT override active key status, revoked key status, or rotation sequence number.

---

### A4 — Old Key Retention Creates Verification Ambiguity

**Scenario**

Old verification methods remain in `verificationMethod` for historical proof verification.

**Risk**

If an old key remains listed but its validity window is unclear, verifiers may accidentally accept new signatures from an old key.

**Suggested mitigation**

Every retained key should carry explicit lifecycle metadata, for example:

```json
{
  "id": "did:trail:org:example#key-1",
  "type": "Multikey",
  "controller": "did:trail:org:example",
  "publicKeyMultibase": "z...",
  "trail:keyStatus": "retired",
  "trail:validFrom": "2026-01-01T00:00:00Z",
  "trail:validUntil": "2026-04-01T00:00:00Z",
  "trail:allowedProofPurposes": ["historicalVerification"]
}
```

**Verifier rule**

- Retired keys MAY verify signatures created during their validity window.
- Retired keys MUST NOT verify new authentication/assertion signatures after `validUntil`.
- Revoked keys MUST NOT be accepted except in explicitly marked forensic/audit workflows.

**Normative suggestion**

> A retained historical key MUST include validity interval metadata. Verifiers MUST reject signatures from retired keys when the signature creation time is after the key's `validUntil` timestamp.

---

### A5 — Rotation Used to Escape Reputation or Penalties

**Scenario**

An agent rotates keys repeatedly after negative events, attempting to preserve DID continuity while obscuring operational history.

**Risk**

Frequent rotation can weaken downstream trust analysis and reduce accountability visibility.

**Suggested mitigation**

Rotation history should be exposed as an optional signal for anomaly detection and trust analysis, including:

- unusually frequent rotations
- rotation immediately after policy violations
- rotation shortly before or after revocation
- repeated emergency recoveries
- mismatch between parent org behavior and agent rotation pattern

**Recommendation**

This is likely a secondary layer, not a core key rotation rule, but the registry may still benefit from surfacing rotation metadata for downstream analysis.

---

### A6 — Registry Key Compromise

**Scenario**

The registry signing key is compromised and signs malicious DID state.

**Risk**

A compromised registry key can poison resolver output, revocation status, key state, and trust state.

**Suggested mitigation**

Registry operators should have stronger rotation and recovery controls than ordinary DID controllers, including:

- HSM/KMS-backed registry signing keys
- published registry key rotation history
- signed registry checkpoints
- optional transparency log
- emergency registry key revocation process
- multi-party approval for registry signing key replacement

**Normative suggestion**

> Registry operator keys SHOULD be subject to stricter rotation controls than ordinary DID controller keys. Replacement of a registry signing key SHOULD require multi-party authorization and publication of a signed transition statement from the previous registry key where possible.

---

## 3. Recommended Rotation State Machine

A clearer state machine would reduce verifier ambiguity.

### Key states

```
pending -> active -> retired -> revoked
```

### Meaning

| State   | Meaning                                       | Can verify new signatures? | Can verify historical signatures?    |
|---------|-----------------------------------------------|----------------------------|--------------------------------------|
| pending | New key announced but not active yet          | No                         | No                                   |
| active  | Current authentication/assertion key          | Yes                        | Yes                                  |
| retired | Old key retained for historical proofs        | No                         | Yes, within validity window          |
| revoked | Key compromised or invalidated                | No                         | No, except forensic workflows        |

### Suggested fields

```json
{
  "trail:keyStatus": "active",
  "trail:validFrom": "2026-04-27T00:00:00Z",
  "trail:validUntil": null,
  "trail:rotationReason": "routine",
  "trail:rotationSequence": 4
}
```

---

## 4. Recommended Rotation Request Format

A rotation request should carry enough information for auditability and replay protection.

```json
{
  "did": "did:trail:org:example-a7f3b2c1e9d04f5a",
  "previousVersion": 6,
  "newVersion": 7,
  "previousKey": "did:trail:org:example-a7f3b2c1e9d04f5a#key-1",
  "newKey": {
    "id": "did:trail:org:example-a7f3b2c1e9d04f5a#key-2",
    "type": "Multikey",
    "publicKeyMultibase": "z..."
  },
  "rotationReason": "routine",
  "created": "2026-04-27T00:00:00Z",
  "nonce": "z...",
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2023",
    "verificationMethod": "did:trail:org:example-a7f3b2c1e9d04f5a#key-1",
    "proofPurpose": "authentication",
    "proofValue": "z..."
  }
}
```

For emergency recovery, add:

```json
{
  "rotationReason": "suspected-compromise",
  "recoveryProofs": [
    {
      "verificationMethod": "did:trail:org:example#recovery-1",
      "proofValue": "z..."
    },
    {
      "verificationMethod": "did:trail:org:example#recovery-2",
      "proofValue": "z..."
    }
  ]
}
```

---

## 5. Verifier Algorithm Recommendation

When verifying a signature from a `did:trail` DID:

1. Resolve the DID Document from the authoritative source.
2. Verify registry signature / checkpoint if available.
3. Check monotonic version and freshness policy.
4. Identify the referenced `verificationMethod`.
5. Check key status:
   - `active`: allow current authentication/assertion.
   - `retired`: allow only historical verification within validity interval.
   - `revoked`: reject.
6. Check revocation/status information.
7. Check signature timestamp against key validity interval.
8. Reject if the DID Document is stale, unsigned by the authoritative source where required, or inconsistent with authoritative registry state.

---

## 6. Priority Recommendations

### P0 — Critical

* Add monotonic `trail:version` / `rotationSequence`
* Add explicit key status: `pending`, `active`, `retired`, `revoked`
* Add key validity windows: `validFrom`, `validUntil`
* Define retired-key verifier behavior

### P1 — High

* Separate routine rotation from compromise recovery
* Require an independent recovery factor for suspected compromise
* Add registry-signed DID Document checkpoints
* Clarify federation behavior during key rotation
* Clarify resolver freshness / cache behavior for registry-backed DID modes

### P2 — Medium

* Add test vectors for stale DID Document replay
* Add test vectors for retired-key misuse
* Add test vectors for emergency recovery
* Optionally expose rotation metadata for anomaly detection / trust analysis

---

## 7. Open Questions

1. Should higher-trust org DIDs require independent recovery authorization for every rotation, or only high-risk rotations?
2. Should retired keys be allowed to verify historical signatures indefinitely, or only while the DID remains active?
3. Should revoked keys invalidate historical proofs entirely, or remain available only for forensic audit with warning metadata?
4. Should the registry publish signed append-only rotation logs?
5. Should verifiers maintain local highest-seen version state to prevent downgrade attacks?
6. Should resolver freshness requirements be specified separately for self mode vs registry-backed modes?

---

## 8. Suggested Spec Patch

A compact patch could be added under the key rotation section:

> Each registry-backed key rotation MUST produce a new monotonic rotation sequence number. The registry MUST reject rotation requests where the submitted previous version does not match the registry's current version for the DID.
>
> Each verification method retained after rotation MUST carry lifecycle metadata indicating whether the key is `active`, `retired`, `revoked`, or `pending`. Retired keys MAY be used only for verification of signatures created during their validity interval and MUST NOT be accepted for new authentication or assertion signatures.
>
> When compromise is suspected, rotation MUST use a recovery path independent of the compromised active key, such as multi-controller recovery, threshold guardian recovery, or registry-assisted recovery.
>
> Resolver-backed resolution for registry-managed DID modes SHOULD expose freshness metadata sufficient to detect downgrade or stale-cache replay, and verifiers SHOULD apply freshness and version checks before trusting active key state.

---

## 9. Overall Assessment

The current design is directionally strong because it preserves DID continuity, supports historical verification, separates self mode from registry-backed identities, and can support auditable rotation history.

The main improvement is to make key lifecycle state explicit and to harden the compromised-key rotation path. In short:

- Routine rotation can be authorized by the active key.
- Compromise recovery should not rely only on the compromised key.
- Retired keys should verify history, not future authority.
- Verifiers need monotonic version and freshness checks to prevent downgrade/replay.
- Resolver/cache freshness should be treated as part of the replay threat model for registry-backed DID modes.
