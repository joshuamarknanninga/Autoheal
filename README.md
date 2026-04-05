# AutoHeal

AutoHeal is a local-first self-healing codebase engine that continuously scans a repository, tracks structural evolution, detects architectural risks, generates repair recommendations, simulates impact, and records outcomes over time.

It is designed as a production-shaped foundation for autonomous codebase maintenance workflows.

## Project Concept

Modern teams often detect maintainability erosion too late. AutoHeal addresses this by creating a persistent memory model of repository behavior and producing repeatable remediation decisions.

Core loop:

1. Scan the repository.
2. Build/update memory.
3. Detect risks.
4. Generate fix recommendations.
5. Simulate expected impact.
6. Apply only safe fixes automatically (or persist dry-run plans).
7. Store all outcomes for historical learning.

## Architecture Overview

```text
frontend (React + Vite)
  └─ fetches API data and drives scan/simulate/apply actions

backend (Express)
  ├─ scanner.js     -> repository file inventory + metadata
  ├─ memory.js      -> persistent evolving codebase memory model
  ├─ reasoner.js    -> issue/risk detection heuristics
  ├─ healer.js      -> fix recommendation generation + safe apply
  ├─ simulator.js   -> impact projection heuristics
  ├─ store.js       -> JSON persistence layer
  ├─ utils.js       -> shared utilities
  └─ server.js      -> orchestration + REST API

data (JSON in backend/data)
  ├─ snapshots.json
  ├─ issues.json
  ├─ fixes.json
  ├─ simulations.json
  ├─ applied.json
  └─ memory.json
```

## Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
npm run install:all
```

### Start Development

```bash
npm run dev
```

- Backend API: `http://localhost:5050`
- Frontend UI: `http://localhost:5173`

- Frontend dev server runs with HMR WebSocket disabled (`hmr: false`) for reliability in constrained/local proxy environments; refresh the page after UI edits.

Run backend only:

```bash
npm run dev:backend
```

Run frontend only:

```bash
npm run dev:frontend
```

### Tests

```bash
npm test
```

## How Scanning Works

The scanner:

- Recursively traverses a target repository path.
- Considers `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, and `.cjs` files.
- Ignores `node_modules`, `dist`, `build`, `.git`, `coverage`.
- Collects normalized relative path, size, line count, and timestamps.
- Produces aggregate metrics (file count, total lines, total bytes).

## How Fixes Are Generated

The reasoner detects risk issues such as:

- Oversized files.
- High growth risk.
- Unstable hotspots.
- Concentrated dependency influence.
- Refactor targets.

The healer maps each issue type to one or more actionable recommendations, including:

- Split file into modules.
- Isolate shared utilities.
- Reduce dependency concentration.
- Extract function clusters.
- Archive dead-risk areas.

Each recommendation includes rationale, expected outcome, safety level, dry-run patch plan, and whether auto-application is allowed.

## How Simulation Works

The simulator estimates:

- Projected risk reduction.
- Projected maintainability delta.
- Confidence.

The model uses coherent heuristics based on issue severity, confidence, and number of affected files. Simulation results are stored and visible in history.

## Limitations

- Heuristics are static and rule-based (no semantic AST-driven refactor engine yet).
- Automatic fix application is intentionally conservative and limited to low-risk non-invasive actions.
- Dependency influence is estimated from import edge counts, not runtime behavior.
- Historical learning is local JSON persistence, not distributed or multi-user.

## Future Improvements

- AST-powered precise refactoring operations.
- Git-aware impact forecasting and branch strategy recommendations.
- Team-level policy profiles (service ownership, SLA, risk budgets).
- Plugin model for language-specific analyzers.
- Embedding-based semantic memory for cross-module coupling patterns.
- Human-in-the-loop review workflows with approval gates.
