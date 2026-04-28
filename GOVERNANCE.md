# TRAIL Protocol - Governance

## Overview

TRAIL Protocol follows a phased governance model that begins with founding maintainer control and transitions toward multi-stakeholder governance as the ecosystem matures. This document defines the rules, roles, and processes that govern protocol development and decision-making.

The detailed governance framework is specified in [Section 11 of the TRAIL DID Method Specification](spec/did-method-trail-v1.md). This document provides an accessible summary and adds operational details for contributors.

## Governance Phases

### Phase 1: Founding Governance (2026 - current)

**Decision authority:** Christian Hommrich (Founding Maintainer, TRAIL Protocol Initiative)

All protocol decisions - specification changes, registry policies, contributor roles - are made by the Founding Maintainer. This is intentional: early-stage protocols need decisive leadership to maintain coherence.

**Accountability mechanisms in Phase 1:**
- All decisions are documented publicly (GitHub Issues, commit messages, or specification changelog)
- Community feedback is solicited via GitHub Issues and W3C CCG mailing list
- The Founding Maintainer commits to responding to substantive feedback within 7 days
- Ethical principles in `ETHICS.md` constrain all decisions, including the Founding Maintainer's

### Phase 2: Advisory Board (2027)

**Decision authority:** Founding Maintainer with advisory input from a 3-5 member board.

The Advisory Board provides expertise in:
- Data protection and privacy law
- Enterprise IT and operations
- Regulatory and legal frameworks
- Decentralized identity standards

Board members serve 2-year terms (renewable once). The Founding Maintainer retains veto authority during Phase 2.

### Phase 3: Multi-Stakeholder Governance (2028+)

**Decision authority:** Governance Board with representatives from all stakeholder groups.

Stakeholder groups:
- Registry Operators
- Accredited Certificate Authorities
- Verifiers
- AI Agent Deployers
- Open-source Contributors

The Founding Maintainer retains root key control (following the ICANN/IANA model) but day-to-day governance transitions to the board. Optional transition to a foundation model will be evaluated.

## Roles

### Founding Maintainer

- Sets protocol direction and resolves disputes
- Approves or rejects specification changes
- Manages the root registry (registry.trailprotocol.org)
- Appoints Advisory Board members (Phase 2)
- Can be reached at: christian.hommrich@trailprotocol.org

### Contributors

Anyone who participates in the project through:
- Specification feedback (Issues)
- Code contributions (Pull Requests)
- Security reviews and challenges
- Documentation improvements
- Architecture reviews

Contributors are recognized in the specification changelog and README. Significant contributions may lead to Co-Author credit on the W3C DID Method registration.

### Reviewers (future)

Trusted contributors who can approve Pull Requests in specific areas (e.g., `spec/`, `examples/`, `packages/`). Appointed by the Founding Maintainer based on demonstrated expertise and sustained contribution.

## Decision-Making Process

### Specification Changes

| Change Type | Process | Notice Period |
|-------------|---------|---------------|
| **Editorial** (typos, formatting, clarifications) | Direct PR, single maintainer approval | None |
| **Non-breaking** (new optional features, extensions) | Issue discussion, PR with rationale, maintainer approval | 90 days before enforcement |
| **Breaking** (changes to existing behavior, deprecations) | Issue discussion, community review period, Advisory/Governance Board approval (Phase 2+) | 180 days before enforcement |
| **Emergency security patches** | Immediate deployment, post-hoc ratification within 30 days | None (immediate) |

### Protocol Extension Proposals

Major protocol extensions follow this process:

1. **Proposal** - Open a GitHub Issue with the `proposal` label. Include: problem statement, proposed solution, alternatives considered, and ethical impact assessment.
2. **Discussion** - Minimum 14-day open discussion period. The Founding Maintainer may extend this for complex proposals.
3. **Decision** - The Founding Maintainer (Phase 1) or Governance Board (Phase 2+) publishes a decision with rationale.
4. **Implementation** - If approved, the proposer or a designated contributor implements the change following the PR process in `CONTRIBUTING.md`.

### Dispute Resolution

| Dispute Type | First Instance | Escalation |
|-------------|----------------|------------|
| **Technical** (resolution failures, trust score errors) | Registry Operator | Technical Committee |
| **Identity** (slug ownership, impersonation) | Registry team | Advisory/Governance Board |
| **Conduct** (code of conduct violations) | Founding Maintainer | Governance Board |
| **Revocation disputes** | 30-day appeal window | Formal hearing, binding ICC arbitration (Frankfurt) |
| **Commercial** (fees, SLAs) | Direct negotiation | Binding ICC arbitration |

## Transparency Requirements

All governance activities are conducted in the open:

- **Decisions:** Published as GitHub Issues or in the specification changelog
- **Meeting notes:** Published within 7 days (when Advisory Board convenes in Phase 2+)
- **Financial:** Registry fee structures published; no hidden costs
- **Conflicts of interest:** Board members and the Founding Maintainer must disclose relevant commercial interests. The Founding Maintainer's role as founder of TrailSign AI (the commercial entity) is disclosed here and in the specification.

## Relationship to TrailSign AI

TRAIL Protocol is an open standard. TrailSign AI (TSAI) is the commercial entity that operates infrastructure and services built on TRAIL. The relationship is analogous to HTTP (open protocol) and web hosting providers (commercial operators).

**Key boundaries:**
- The TRAIL specification is licensed under CC BY 4.0 - TSAI does not own the standard
- Reference implementations are MIT-licensed - anyone can build competing products
- TSAI may operate the default root registry, but the protocol supports federation - alternative registries are architecturally equal
- TSAI has no special voting rights in Phase 3 governance beyond its stakeholder representation
- Protocol decisions are never made to benefit TSAI at the expense of the open ecosystem

## Amending This Document

Changes to this governance document follow the same process as breaking specification changes:

1. GitHub Issue with `governance` label
2. Minimum 30-day community review
3. Approval by Founding Maintainer (Phase 1) or Governance Board (Phase 2+)
4. Published rationale for changes

---

*Version 1.0 - April 2026*
