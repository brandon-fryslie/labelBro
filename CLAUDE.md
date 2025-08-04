# CLAUDE.md

## Agent Workflow Overview

Repeat until `.ai_project/<active-project>/TODO.md` is empty:

1. Plan → `/plan-next-step` selects highest-priority backlog task.
2. Implement → `/implement-item` implements selected task.
3. Test → `/retest` runs tests, identifies and fixes regressions.
4. Refactor → `/refactor` simplifies code, improves tests, reduces complexity.
5. Validate UX → `/validate-ux` ensures intuitive documented user flows.
6. Track → `/status` updates project STATUS.md and repository-level milestones.

Switch to Stabilization Mode if stability KPI falls below threshold:
- Prioritize regression fixes, test failures, and complexity reduction.

## Repository-Level Files

- `PROJECT.md`: Overall architecture, goals, dependencies, active projects.
- `BACKLOG.md`: Project roadmap (names/descriptions only).
- `TODO.md`: Name of currently active project.
- `PROGRESS.md`: Cross-project milestones, stability metrics, architectural health.
- `DEPRECATED.md`: Auto-updated list of deprecated components.

## Project-Level Files (`.ai_project/<project>/`)

- `PROJECT.md`: Goals, features, requirements.
- `BACKLOG.md`: Task backlog.
- `TODO.md`: Immediate next-step tasks.
- `STATUS.md`: Completion log, notes, test results, complexity metrics.

## Extended Loop Automation & Self-Correction

Automated "Signal Collector" generates backlog tasks:

- **Test & Stability Monitoring**
    - Runs pytest suite, logs failures, flags recurring issues.

- **Dead-Code & Deprecation Detection**
    - Detect unused/deprecated code; updates DEPRECATED.md.

- **Documentation Drift Detection**
    - Detect mismatches between documentation and implementation.

- **Telemetry-Based UX Monitoring**
    - Analyze usage/error logs; flags underused/confusing features.

- **Architectural Integrity Tests**
    - Verify defined architectural boundaries.

## Priority Escalation Rules

- Tasks failing ≥3 cycles escalate to high priority.
- Stabilization Mode triggered by KPI thresholds:
    - Test pass rate < 95%
    - UX violations detected
    - Complexity trends negatively

## Testing & Quality Assurance Standards

- Behavior-driven tests auto-generated from documentation.
- Use pytest with parameterization and fixtures.
- Integration tests confirm realistic interactions.
- No tautological mocks.

Follow `TESTING.md` for execution instructions.

## Python Environment Management

- Use `uv` for virtual environments and dependency management.
- Explicitly use `python3`.
- Activate via `source .venv/bin/activate`.

## Simulated Functionality Rule

- Placeholder functionality permitted for scaffolding only.
- Replace with production implementations before marking complete.
- Flag any "Simulated" or "TODO: implement" code as incomplete.

## Code Quality Standards

Refer to `.ai_project/CONVENTIONS.md`.

## Directory Structure
