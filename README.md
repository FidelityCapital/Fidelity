# Fidelity

Custom code for the Fidelity Capital Squarespace 7.1 site. This repository is the source of truth: every change is made here first and then pasted into Squarespace.

- **Plan and step-by-step build guide:** [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)

## Quick start

```bash
npm install
npm run build   # validates everything and writes paste-ready files to dist/
```

| Paste this | Into Squarespace |
|---|---|
| `styles/custom.less` | Custom CSS panel |
| `dist/header-injection.html` | Code Injection › Header |
| `dist/footer-injection.html` | Code Injection › Footer |
| `blocks/*.html` | Code Blocks (Display Source off) |

CI runs the same checks on every push. Each run's `dist/` can be downloaded as the **squarespace-paste-files** artifact.
