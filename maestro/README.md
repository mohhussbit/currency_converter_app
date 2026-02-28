# Maestro E2E

This project uses Maestro flows stored in `maestro/flows`.

## Core flows

Core end-to-end coverage lives in `maestro/flows/core`:

- `core-home-modal.yaml`
- `core-settings-history.yaml`
- `core-pinned-rate.yaml`
- `core-rate-alerts.yaml`
- `core-help.yaml`

## Local run

Install Maestro CLI first, then run:

```bash
maestro test maestro/flows
```

Run only core flows:

```bash
maestro test maestro/flows/core
```

## EAS workflow

E2E is integrated with EAS Workflows in:

`.eas/workflows/maestro-e2e.yml`
