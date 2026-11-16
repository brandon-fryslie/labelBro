# Functional Tests for labelBro

## Overview

This directory contains **un-gameable functional tests** that validate real user workflows and critical system functionality. These tests are designed to force actual implementation and cannot be satisfied with stubs, mocks, or shortcuts.

## Test Philosophy

These tests follow the principle:
> **"Tests must validate what users experience, not what developers implement"**

### Key Characteristics

1. **End-to-End Validation**: Tests complete user workflows from input to output
2. **Real Artifact Verification**: Checks actual files, API responses, DOM states - not mocks
3. **Observable Outcomes**: Validates externally observable results users would see
4. **Gaming-Resistant**: Structured to prevent shortcuts or fake implementations
5. **Fail Honestly**: When functionality is broken, tests fail clearly

## Test Suite

### Test 1: Logs System End-to-End (`logs-system-e2e.test.ts`)

**STATUS Gap**: P0-001 - Non-Functional Logs System
**PLAN Item**: P0-001 - Fix Non-Functional Logs System
**Priority**: CRITICAL (P0)

**What It Tests**:
- LogEntry type is exported from `types/index.ts`
- Logs panel renders in DOM (not just a stub)
- Frontend errors create log entries
- Backend API errors appear in logs
- Logs persist across component renders
- LogsBar displays most recent log
- Placeholder text "Log messages will appear here..." is removed

**Evidence of Failure**:
- `App.tsx:72` - Hardcoded `logs={[]}`
- `LogsBar.tsx:21` - Placeholder text
- `types/index.ts` - Missing LogEntry export

**Why It Can't Be Gamed**:
1. Tests actual DOM rendering - cannot fake with type-only exports
2. Verifies real error propagation through component tree
3. Checks log entry creation from actual events
4. Validates persistence across renders
5. Cannot pass without removing hardcoded empty array

**Traceability**:
```
Test: logs-system-e2e.test.ts
  ↓ validates
STATUS: Lines 110-126 (Critical Finding #1)
  ↓ addresses
PLAN: Lines 29-59 (P0-001)
  ↓ acceptance criteria
  - LogEntry type exported
  - Logs state management implemented
  - Frontend events create logs
  - Backend errors appear in logs
  - No hardcoded empty arrays
  - No placeholder text
```

---

### Test 2: TypeScript Strict Mode Compliance (`typescript-strict-mode.test.ts`)

**STATUS Gap**: P0-002 - TypeScript Strict Mode Violations
**PLAN Item**: P0-002 - Fix TypeScript Strict Mode Violations
**Priority**: CRITICAL (P0)

**What It Tests**:
- `tsconfig.json` has `"strict": true` enabled
- `npm run typecheck` exits with code 0 (no errors)
- Zero TS6133 errors (unused variables/imports)
- Zero TS2305 errors (missing type exports)
- Zero TS2375 errors (exactOptionalPropertyTypes violations)
- Zero Sentry initialization type errors
- Build succeeds after type fixes
- CI/CD pipeline includes typecheck

**Evidence of Failure**:
- `npm run typecheck` produces 18 errors
- 6 fatal type errors + 12 unused variable warnings
- STATUS falsely claims "100% strict mode compliance"

**Why It Can't Be Gamed**:
1. Directly invokes TypeScript compiler - cannot mock
2. Validates actual compilation output
3. Checks specific error codes from STATUS
4. Cannot pass by disabling strict mode (test verifies it's enabled)
5. Cannot skip typecheck (test runs it explicitly)

**Traceability**:
```
Test: typescript-strict-mode.test.ts
  ↓ validates
STATUS: Lines 145-172 (Critical Finding #3)
  ↓ addresses
PLAN: Lines 70-120 (P0-002)
  ↓ acceptance criteria
  - npm run typecheck passes (0 errors)
  - All exactOptionalPropertyTypes fixed
  - All unused code removed
  - Sentry types fixed
  - CI enforces typecheck
```

---

### Test 3: Backend Integration Type Safety (`backend-integration-contracts.test.ts`)

**STATUS Gap**: P0-003 - Integration Test Failures
**PLAN Item**: P0-003 - Fix Integration Test Failures
**Priority**: CRITICAL (P0)

**What It Tests**:
- Backend error responses match TypeScript type contracts
- Error format is consistent: `{ success: false, error: {...} }`
- Success format is consistent: `{ success: true, data: {...} }`
- Network timeout handling returns structured errors
- All API endpoints use standardized error format
- Validation errors from STATUS are fixed
- All 114 tests pass (100% pass rate goal)

**Evidence of Failure**:
- Test: `printer-discovery-workflow.test.ts` has 2 failures
- Backend returns `{ error: 'Server error' }`
- TypeScript expects `{ success: boolean, data: {...} }`
- Validation error: `$input.success expected boolean, got undefined`

**Why It Can't Be Gamed**:
1. Makes actual HTTP requests (uses mocked fetch but validates structure)
2. Validates actual response structure against TypeScript types
3. Tests multiple error scenarios that must all conform
4. Cannot pass without fixing backend response format
5. Runtime validation of type contracts

**Traceability**:
```
Test: backend-integration-contracts.test.ts
  ↓ validates
STATUS: Lines 192-213 (Test Failures)
  ↓ addresses
PLAN: Lines 122-165 (P0-003)
  ↓ acceptance criteria
  - Standardize error format
  - Update TypeScript types
  - Fix network timeout handling
  - All endpoints consistent
  - 114/114 tests passing
```

---

## Running the Tests

### Run All Functional Tests
```bash
npm test -- --testPathPattern=functional
```

### Run Individual Tests
```bash
# Test 1: Logs System
npm test -- tests/functional/logs-system-e2e.test.ts

# Test 2: TypeScript Strict Mode
npm test -- tests/functional/typescript-strict-mode.test.ts

# Test 3: Backend Integration
npm test -- tests/functional/backend-integration-contracts.test.ts
```

### Run with Coverage
```bash
npm test -- --testPathPattern=functional --coverage
```

### Run in Watch Mode
```bash
npm test -- --testPathPattern=functional --watch
```

## Expected Initial Status

**Current State (Before P0 Fixes)**:
- ✗ Test 1: FAILING - LogEntry type not exported, logs={[]} hardcoded
- ✗ Test 2: FAILING - 18 TypeScript errors exist
- ✗ Test 3: FAILING - Backend error format mismatches

**Target State (After P0 Fixes)**:
- ✓ Test 1: PASSING - Logs system fully functional
- ✓ Test 2: PASSING - 0 TypeScript errors
- ✓ Test 3: PASSING - Consistent error format

## Test Design Principles

### What Makes These Tests Un-Gameable?

1. **Real Execution Paths**: Tests invoke actual user-facing code
   ```typescript
   // Good: Tests actual DOM rendering
   render(<App />);
   expect(screen.getByTestId('logs-panel')).toBeInTheDocument();

   // Bad: Tests implementation detail
   expect(mockLogsFunction).toHaveBeenCalled();
   ```

2. **Multiple Verification Points**: Single test validates multiple outcomes
   ```typescript
   // Validates type export, component rendering, and data flow
   test('logs system end-to-end', () => {
     // Type must exist (compile-time check)
     // Component must render (runtime check)
     // Data must flow (integration check)
   });
   ```

3. **Concrete Assertions**: Specific, verifiable checks
   ```typescript
   // Good: Checks actual compilation output
   const errors = execSync('npm run typecheck');
   expect(errors).not.toContain('error TS');

   // Bad: Checks mock was called
   expect(mockTypecheck).toHaveBeenCalled();
   ```

4. **State Verification**: Confirms system state changes
   ```typescript
   // Logs must persist across renders
   rerender(<App />);
   expect(logs.length).toBeGreaterThan(0);
   ```

### Anti-Patterns Avoided

- ❌ Testing internal implementation details
- ❌ Mocking the functionality being tested
- ❌ Tests that pass with stub implementations
- ❌ Assertions satisfied by hardcoding
- ❌ Tests that don't exercise real system
- ❌ Overly specific assertions that break with minor changes

## Test Maintenance

### Adding New Functional Tests

When adding new functional tests:

1. **Identify User Workflow**: What does user do? What do they see?
2. **Map to STATUS Gap**: Which STATUS finding does this address?
3. **Map to PLAN Item**: Which PLAN acceptance criteria does this validate?
4. **Design Test**: How can this NOT be faked?
5. **Document Traceability**: Link test → STATUS → PLAN
6. **Add Gaming-Resistance Comments**: Explain why test can't be gamed

### Test File Structure

```typescript
/**
 * FUNCTIONAL TEST N: [Test Name]
 *
 * STATUS GAP: [P0-XXX description]
 * STATUS REFERENCE: [file and line numbers]
 * PLAN ITEM: [P0-XXX description]
 * PLAN REFERENCE: [file and line numbers]
 *
 * EVIDENCE OF FAILURE:
 * - [specific file and line references]
 *
 * ACCEPTANCE CRITERIA FROM PLAN:
 * - [criteria 1]
 * - [criteria 2]
 *
 * WHY THIS TEST IS UN-GAMEABLE:
 * 1. [reason 1]
 * 2. [reason 2]
 *
 * DESIGN: [workflow description]
 */
```

## Integration with Development Workflow

### Before Implementing P0 Items

1. Run functional tests to see baseline failures
2. Use test failures to guide implementation
3. Tests document EXACTLY what needs to be fixed

### During Implementation

1. Run tests frequently to validate progress
2. Tests fail until REAL implementation is complete
3. Cannot proceed to next task until tests pass

### After Implementation

1. All functional tests must pass
2. Tests document that gaps are truly fixed
3. Tests prevent regressions in future

## Test Output Analysis

### Understanding Test Failures

Functional tests provide detailed failure messages:

```
FAILED: LogEntry type is not exported from types/index.ts
  - STATUS reference: Line 159-160
  - PLAN reference: P0-001 acceptance criteria
  - Fix: Export LogEntry type with fields: timestamp, level, message, source
```

### Success Criteria

All tests pass only when:
- Real implementation exists (not stubs)
- User workflows function end-to-end
- Type safety is enforced
- Backend contracts are aligned
- No fake demo data exists

## Relationship to Existing Tests

### Integration Tests (`tests/integration/`)
- **Existing**: Test workflows with mocked responses
- **Functional**: Test workflows force real implementation

### Component Tests (`tests/components/`)
- **Existing**: Test individual component behavior
- **Functional**: Test component integration in real app

### API Tests (`tests/api/`)
- **Existing**: Test API client functions
- **Functional**: Test API contract compliance

### Functional Tests (This Directory)
- **Purpose**: Validate real user workflows cannot be faked
- **Scope**: End-to-end critical paths
- **Coverage**: P0 blockers from STATUS/PLAN

## CI/CD Integration

### Recommended Pipeline

```yaml
# .github/workflows/functional-tests.yml
name: Functional Tests

on: [push, pull_request]

jobs:
  functional-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run typecheck  # Must pass for Test 2
      - run: npm test -- --testPathPattern=functional  # Run all functional tests
      - name: Fail if any functional test fails
        run: exit $?
```

### Pre-Commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run typecheck && npm test -- --testPathPattern=functional --bail"
    }
  }
}
```

## Summary

These functional tests are the **gold standard** that proves critical features work:

1. **Logs System**: Users can see application events and errors
2. **Type Safety**: Code is truly type-safe, not illusory
3. **Backend Integration**: Frontend and backend contracts align

They cannot be satisfied with:
- Stub implementations
- Hardcoded values
- Fake demo data
- Disabled type checking
- Inconsistent error formats

**Passing all functional tests = Production readiness for P0 blockers**
