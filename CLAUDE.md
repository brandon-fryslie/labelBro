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

## Requirements Analysis Protocol

**CRITICAL**: Before implementing any feature request, ALWAYS follow this protocol to prevent requirements misalignment:

### 1. Requirements Conflict Detection
When encountering a request, check for these common conflict patterns:

**Pattern A: Existing vs. Specified**
- User says: "implement [feature]" or "make [component] functional"
- Existing code already exists for that component
- **STOP**: Existing code may use different architecture/approach than what's actually wanted

**Pattern B: General vs. Specific**
- Requirements contain both vague language ("make it functional") AND detailed technical specs
- **STOP**: These often represent different approaches

**Pattern C: Technology Stack Mismatches**
- Existing code uses one tech stack (custom CSS, vanilla JS)
- Requirements specify different tech stack (Tailwind, specific libraries)
- **STOP**: Don't substitute technologies without explicit permission

### 2. Mandatory Clarification Questions
When ANY of the above patterns detected, MUST ask before proceeding:

```
I see [specific conflict]. Before implementing, I need to clarify:

Option A: Enhance existing [component] with [current approach]
Option B: Replace with [specified requirements approach]

Which approach should I take?

Also, I notice [technology/architecture differences]. Should I:
- Use existing [current tech] OR specified [required tech]?
- Keep existing positioning/layout OR implement exact specifications?
```

### 3. Specification Priority Rules
When detailed technical specifications exist:

1. **Specifications are AUTHORITATIVE** - implement exactly as written
2. **Don't rationalize alternatives** - follow specs even if existing code seems "better"
3. **Don't add enhancements** during initial implementation
4. **Match ALL specified technologies** - don't substitute

### 4. Implementation Validation Checkpoints
Before major implementation decisions:

```
CHECKPOINT 1 - Requirements Understanding:
"Based on specs, I understand you want [X]. Is this correct?"

CHECKPOINT 2 - Approach Clarification:
"I see existing code does [Y], but specs call for [X]. Should I replace existing?"

CHECKPOINT 3 - Technology Stack:
"Requirements specify [tech stack]. Should I use this instead of existing [other stack]?"
```

### 5. User Prompting Guidance
Help users provide clearer requirements by suggesting:

**When user says "make X functional":**
```
I see X exists but isn't working as expected. To help me understand what you need:

- Should I enhance the existing X approach?
- Or do you have specific requirements for how X should work?
- Are there any technical constraints (positioning, technologies, etc.)?
```

**When user provides detailed specs:**
```
I see detailed technical specifications. To confirm:
- These specifications should be followed exactly? 
- Should I replace any existing similar functionality?
- Are the specified technologies (CSS framework, libraries) required?
```

### 6. Implementation Order - Spec Compliance First

**ALWAYS follow this sequence**:

1. **Minimal Viable Specification**: Build exactly what's specified, nothing more
2. **Validation**: Confirm with user that basic spec is met
3. **Enhancement**: Only add features if explicitly requested

**Never assume** that additional features are wanted, even if they seem "obviously useful."

### 7. Recognizing User Intent Mismatches

**Red Flags that indicate user might not realize they're requesting different approaches:**

- User says "make functional" but existing code is partially functional
- User provides detailed specs but doesn't explicitly say "replace existing"
- User asks for "refinement" but specs describe completely different architecture
- User doesn't mention existing code when requesting features

**Response**: Explicitly surface the potential mismatch rather than making assumptions.

### 8. Debugging Communication Failures

**When user says implementation is wrong, immediately check:**

1. **Did I follow specifications exactly?** (Most common failure)
2. **Did I ask clarifying questions when conflicts were detected?**
3. **Did I assume enhancements were wanted?**
4. **Did I substitute technologies without permission?**
5. **Did I prioritize existing code over specifications?**

**Recovery Process:**
1. Acknowledge the specific mismatch
2. Explain why the wrong choice was made
3. Offer to implement the correct solution
4. Update CLAUDE.md with lessons learned

### 9. User Education - Helping Users Give Better Requirements

**Proactively help users by:**

- Identifying when requirements are ambiguous
- Suggesting more specific language
- Pointing out potential conflicts between existing code and new requirements
- Offering templates for common request types

**Example Helpful Response:**
```
I notice you want to "implement the log panel." I see existing LogsBar code and detailed specifications in PROJECT.md. 

To ensure I build what you actually want:
- Should I enhance the existing LogsBar approach?
- Or implement the fixed-bottom panel specified in PROJECT.md?

The two approaches have different positioning, technology stacks, and user interactions.
```

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

## Fake Demo Data Prohibition

**NEVER create fake demo data for production features:**

- ❌ **Prohibited**: Fake sample logs, mock API responses, dummy data arrays
- ❌ **Prohibited**: setTimeout intervals generating fake data
- ❌ **Prohibited**: Hardcoded sample content for real application features
- ✅ **Required**: Use actual application data sources
- ✅ **Required**: Integrate with existing backend APIs and data flows
- ✅ **Required**: If no data exists, show proper empty states

**Examples of violations:**
```typescript
// ❌ WRONG - Fake demo data
const [logs, setLogs] = useState(['Sample log 1', 'Sample log 2']);
setInterval(() => addLog('Fake message'), 5000);

// ✅ CORRECT - Real data sources  
const logs = useBackendLogs(); // From actual backend
const logs = applicationState.logEntries; // From real app state
```

**When implementing features that display data:**
1. Identify the real data source first
2. If data source doesn't exist, create it properly
3. Connect to actual backend APIs or application state
4. Show appropriate loading/empty states for real scenarios

## Code Quality Standards

Refer to `.ai_project/CONVENTIONS.md`.

## Directory Structure
