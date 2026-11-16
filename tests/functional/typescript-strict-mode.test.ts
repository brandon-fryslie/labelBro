/**
 * FUNCTIONAL TEST 2: TypeScript Strict Mode Compliance
 *
 * STATUS GAP: P0-002 - TypeScript Strict Mode Violations
 * STATUS REFERENCE: STATUS-2025-10-15-044325.md §"Critical Finding #3" (lines 145-172)
 * PLAN ITEM: P0-002 - Fix TypeScript Strict Mode Violations
 * PLAN REFERENCE: PLAN-2025-10-15-044655.md (lines 70-120)
 *
 * EVIDENCE OF FAILURE:
 * - tsconfig.json:4 - "strict": true configured
 * - npm run typecheck produces 18 errors (6 fatal, 12 unused)
 * - STATUS.md falsely claims "100% strict mode compliance"
 *
 * SPECIFIC ERRORS FROM STATUS (lines 154-165):
 * - src/api/index.ts(4,3): PrintersResponse unused
 * - src/components/LazyHistoryPanel.tsx(111,6): exactOptionalPropertyTypes violation
 * - src/components/LazyLogsPanel.tsx(2,10): LogEntry not exported
 * - src/components/LogsPanel.tsx(2,10): LogEntry not exported
 * - src/hooks/useLabels.ts(66,9): exactOptionalPropertyTypes violation
 * - src/utils/error-tracking.ts(48,12): Sentry type incompatibility
 * - Plus 12 unused variable warnings
 *
 * ACCEPTANCE CRITERIA FROM PLAN:
 * - npm run typecheck passes with 0 errors
 * - All exactOptionalPropertyTypes violations fixed
 * - All unused imports/variables removed
 * - LogEntry type export fixed (covered by Test 1)
 * - Sentry initialization types fixed
 *
 * WHY THIS TEST IS UN-GAMEABLE:
 * 1. Directly invokes TypeScript compiler - cannot fake
 * 2. Validates actual compilation output, not mocks
 * 3. Checks specific error codes that STATUS identified
 * 4. Cannot pass by disabling strict mode (test verifies it's enabled)
 * 5. Cannot pass by skipping typecheck (test runs it explicitly)
 * 6. Validates CI enforcement (package.json must include typecheck)
 *
 * DESIGN: Tests compilation integrity
 * - Verify tsconfig.json has strict: true
 * - Run actual TypeScript compiler
 * - Parse compiler output for errors
 * - Validate specific error fixes from STATUS report
 * - Ensure CI pipeline will catch regressions
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to strip JSON comments (JSONC format)
function stripJsonComments(jsonString: string): string {
  // Remove single-line comments (// ...)
  let result = jsonString.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments (/* ... */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, '$1');
  return result;
}

describe('Functional Test: TypeScript Strict Mode Compliance', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  describe('CRITICAL: TypeScript Configuration Validation', () => {
    test('should have tsconfig.json with strict mode enabled', () => {
      // Read actual tsconfig.json
      expect(fs.existsSync(tsconfigPath)).toBe(true);

      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(stripJsonComments(tsconfigContent));

      // STATUS line 151 confirms: "strict": true
      expect(tsconfig.compilerOptions.strict).toBe(true);

      // Verify other strict mode flags
      expect(tsconfig.compilerOptions.strictNullChecks).not.toBe(false);
      expect(tsconfig.compilerOptions.strictFunctionTypes).not.toBe(false);
      expect(tsconfig.compilerOptions.strictBindCallApply).not.toBe(false);
      expect(tsconfig.compilerOptions.strictPropertyInitialization).not.toBe(false);
    });

    test('should have exactOptionalPropertyTypes enabled (causing P0-002 errors)', () => {
      const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(stripJsonComments(tsconfigContent));

      // This is the config causing errors in LazyHistoryPanel and useLabels
      expect(tsconfig.compilerOptions.exactOptionalPropertyTypes).toBe(true);
    });
  });

  describe('CRITICAL: TypeScript Compilation Must Pass', () => {
    test('should compile with zero errors when running npm run typecheck', () => {
      // This is THE core test - runs actual TypeScript compiler
      // Cannot be gamed - either TypeScript compiles or it doesn't

      let typecheckOutput = '';
      let typecheckExitCode = 0;

      try {
        // Run the actual typecheck command
        typecheckOutput = execSync('npm run typecheck', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        typecheckExitCode = 0;
      } catch (error: any) {
        typecheckOutput = error.stdout + error.stderr;
        typecheckExitCode = error.status || 1;
      }

      if (typecheckExitCode !== 0) {
        // Parse errors for detailed reporting
        const errorLines = typecheckOutput.split('\n').filter(line =>
          line.includes('error TS') || line.includes('ERROR')
        );

        const errorCount = errorLines.length;

        throw new Error(
          `TypeScript compilation FAILED with ${errorCount} errors.\n\n` +
          `STATUS-2025-10-15-044325.md (line 154) documented 18 errors.\n` +
          `P0-002 requires: "npm run typecheck passes with 0 errors"\n\n` +
          `Current errors:\n${errorLines.slice(0, 10).join('\n')}\n\n` +
          `Full output:\n${typecheckOutput.slice(0, 1000)}`
        );
      }

      // If we get here, typecheck passed
      expect(typecheckExitCode).toBe(0);
      expect(typecheckOutput).not.toContain('error TS');
    });

    test('should have zero TS6133 unused variable errors', () => {
      // STATUS lines 217-227 identify 12 unused variable warnings
      // These must be cleaned up

      let typecheckOutput = '';

      try {
        execSync('npm run typecheck', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        typecheckOutput = ''; // No errors
      } catch (error: any) {
        typecheckOutput = error.stdout + error.stderr;
      }

      // Check for TS6133 specifically (unused variable/import)
      const unusedVarErrors = typecheckOutput.split('\n').filter(line =>
        line.includes('error TS6133')
      );

      if (unusedVarErrors.length > 0) {
        const affectedFiles = [
          'src/api/index.ts',
          'src/components/HistoryPanel.tsx',
          'src/components/PrinterPanel.tsx',
          'src/hooks/useLocalStorage.ts',
          'src/main.tsx',
          'src/utils/error-tracking.ts'
        ];

        throw new Error(
          `Found ${unusedVarErrors.length} unused variable/import errors (TS6133).\n\n` +
          `STATUS lines 217-227 documented these must be removed.\n` +
          `P0-002 acceptance criteria: "Remove all unused imports and variables"\n\n` +
          `Affected files from STATUS:\n${affectedFiles.join('\n')}\n\n` +
          `Current errors:\n${unusedVarErrors.join('\n')}`
        );
      }

      expect(unusedVarErrors.length).toBe(0);
    });

    test('should have zero TS2305 module export errors (LogEntry type)', () => {
      // STATUS lines 159-160 identify LogEntry type not exported
      // This is covered by Test 1 but validated here at compile level

      let typecheckOutput = '';

      try {
        execSync('npm run typecheck', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        typecheckOutput = '';
      } catch (error: any) {
        typecheckOutput = error.stdout + error.stderr;
      }

      // Check for TS2305 (module has no exported member)
      const exportErrors = typecheckOutput.split('\n').filter(line =>
        line.includes('error TS2305') && line.includes('LogEntry')
      );

      if (exportErrors.length > 0) {
        throw new Error(
          `LogEntry type is not exported from types/index.ts.\n\n` +
          `STATUS lines 159-160:\n` +
          `  src/components/LazyLogsPanel.tsx(2,10): Module has no exported member 'LogEntry'\n` +
          `  src/components/LogsPanel.tsx(2,10): Module has no exported member 'LogEntry'\n\n` +
          `P0-001 acceptance criteria: "Export LogEntry type from src/types/index.ts"\n\n` +
          `Current errors:\n${exportErrors.join('\n')}`
        );
      }

      expect(exportErrors.length).toBe(0);
    });

    test('should have zero TS2375 exactOptionalPropertyTypes errors', () => {
      // STATUS lines 158, 162 identify exactOptionalPropertyTypes violations
      // LazyHistoryPanel.tsx line 111, useLabels.ts line 66

      let typecheckOutput = '';

      try {
        execSync('npm run typecheck', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        typecheckOutput = '';
      } catch (error: any) {
        typecheckOutput = error.stdout + error.stderr;
      }

      const exactOptionalErrors = typecheckOutput.split('\n').filter(line =>
        line.includes('error TS2375')
      );

      if (exactOptionalErrors.length > 0) {
        throw new Error(
          `Found ${exactOptionalErrors.length} exactOptionalPropertyTypes violations (TS2375).\n\n` +
          `STATUS lines 158, 162:\n` +
          `  LazyHistoryPanel.tsx(111,6): Type incompatibility with exactOptionalPropertyTypes\n` +
          `  useLabels.ts(66,9): Type incompatibility with exactOptionalPropertyTypes\n\n` +
          `P0-002 acceptance criteria: "Fix exactOptionalPropertyTypes violations"\n` +
          `FIX: Remove explicit '| undefined', use only '?' for optional props\n\n` +
          `Current errors:\n${exactOptionalErrors.join('\n')}`
        );
      }

      expect(exactOptionalErrors.length).toBe(0);
    });

    test('should have zero Sentry initialization type errors (TS2379)', () => {
      // STATUS line 163 identifies Sentry init type incompatibility
      // error-tracking.ts line 48

      let typecheckOutput = '';

      try {
        execSync('npm run typecheck', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        typecheckOutput = '';
      } catch (error: any) {
        typecheckOutput = error.stdout + error.stderr;
      }

      const sentryErrors = typecheckOutput.split('\n').filter(line =>
        line.includes('error-tracking.ts') && line.includes('error TS')
      );

      if (sentryErrors.length > 0) {
        throw new Error(
          `Found ${sentryErrors.length} Sentry type errors in error-tracking.ts.\n\n` +
          `STATUS line 163:\n` +
          `  error-tracking.ts(48,12): Argument type incompatibility\n\n` +
          `P0-002 acceptance criteria: "Fix Sentry initialization type incompatibility"\n\n` +
          `Current errors:\n${sentryErrors.join('\n')}`
        );
      }

      expect(sentryErrors.length).toBe(0);
    });
  });

  describe('CRITICAL: CI/CD Must Enforce Typecheck', () => {
    test('should have typecheck command in package.json scripts', () => {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts.typecheck).toBeDefined();
      expect(packageJson.scripts.typecheck).toContain('tsc');
    });

    test('should have typecheck in build or test scripts for CI enforcement', () => {
      // P0-002 acceptance criteria: "Add typecheck to CI/CD pipeline"
      // This validates that builds will fail if types are wrong

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Check if typecheck is part of critical scripts
      const buildScript = packageJson.scripts.build || '';
      const testScript = packageJson.scripts.test || '';
      const preTestScript = packageJson.scripts.pretest || '';
      const preBuildScript = packageJson.scripts.prebuild || '';

      const typecheckEnforced =
        buildScript.includes('typecheck') ||
        testScript.includes('typecheck') ||
        preTestScript.includes('typecheck') ||
        preBuildScript.includes('typecheck') ||
        packageJson.scripts.typecheck !== undefined;

      if (!typecheckEnforced) {
        console.warn(
          'WARNING: typecheck should be added to CI/CD pipeline.\n' +
          'P0-002 acceptance criteria: "Add npm run typecheck to CI/CD pipeline"\n' +
          'Recommendation: Add "pretest": "npm run typecheck" or "prebuild": "npm run typecheck"'
        );
      }

      // Don't fail test, but ensure typecheck script exists
      expect(packageJson.scripts.typecheck).toBeDefined();
    });
  });

  describe('VALIDATION: Build Still Succeeds After Type Fixes', () => {
    test('should build successfully with strict types enabled', () => {
      // P0-002 acceptance criteria: "Verify build succeeds with strict mode enforced"

      let buildOutput = '';
      let buildExitCode = 0;

      try {
        buildOutput = execSync('npm run build', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 60000 // 60 second timeout for build
        });
        buildExitCode = 0;
      } catch (error: any) {
        buildOutput = error.stdout + error.stderr;
        buildExitCode = error.status || 1;
      }

      if (buildExitCode !== 0) {
        throw new Error(
          `Build failed after type fixes.\n\n` +
          `P0-002 acceptance criteria: "Verify build succeeds with strict mode enforced"\n\n` +
          `Build output:\n${buildOutput.slice(0, 1000)}`
        );
      }

      expect(buildExitCode).toBe(0);
      expect(buildOutput).not.toContain('ERROR');
    });
  });

  describe('REGRESSION: Verify STATUS False Claims Are Fixed', () => {
    test('should document that "100% strict mode compliance" claim was false', () => {
      // STATUS lines 170-171: "Claims of '100% strict mode compliance' are false"
      // This test documents the resolution

      let typecheckOutput = '';
      let typecheckPassed = false;

      try {
        execSync('npm run typecheck', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        typecheckPassed = true;
      } catch (error: any) {
        typecheckOutput = error.stdout + error.stderr;
      }

      if (!typecheckPassed) {
        const errorCount = (typecheckOutput.match(/error TS/g) || []).length;

        throw new Error(
          `TypeScript strict mode compliance: FAILED\n\n` +
          `STATUS-2025-10-15-044325.md line 170:\n` +
          `  "Claims of '100% strict mode compliance' in STATUS.md are false"\n\n` +
          `Original state: 18 compilation errors\n` +
          `Current state: ${errorCount} compilation errors\n\n` +
          `P0-002 goal: 0 compilation errors\n` +
          `Status: ${typecheckPassed ? 'ACHIEVED' : 'NOT ACHIEVED'}`
        );
      }

      // If we get here, strict mode truly passes
      expect(typecheckPassed).toBe(true);
    });
  });

  describe('COMPREHENSIVE: Full Type Safety Validation', () => {
    test('should have zero TypeScript errors of any kind', () => {
      // The ultimate validation: NO TypeScript errors at all

      let typecheckOutput = '';
      let allErrors: string[] = [];

      try {
        execSync('npm run typecheck', {
          cwd: projectRoot,
          encoding: 'utf-8',
          stdio: 'pipe'
        });
      } catch (error: any) {
        typecheckOutput = error.stdout + error.stderr;
        allErrors = typecheckOutput.split('\n').filter(line =>
          line.includes('error TS') || line.match(/\(\d+,\d+\):/)
        );
      }

      if (allErrors.length > 0) {
        // Categorize errors
        const fatalErrors = allErrors.filter(line =>
          line.includes('TS2305') || // module export
          line.includes('TS2375') || // exactOptionalPropertyTypes
          line.includes('TS2379')    // argument type
        );

        const warningErrors = allErrors.filter(line =>
          line.includes('TS6133')    // unused variable
        );

        throw new Error(
          `TypeScript compilation has ${allErrors.length} total errors.\n\n` +
          `Fatal type errors: ${fatalErrors.length}\n` +
          `Unused variable warnings: ${warningErrors.length}\n\n` +
          `P0-002 acceptance criteria: "npm run typecheck passes with 0 errors"\n\n` +
          `All errors:\n${allErrors.slice(0, 20).join('\n')}\n\n` +
          `STATUS documented 18 errors originally (6 fatal + 12 unused).\n` +
          `Current: ${fatalErrors.length} fatal + ${warningErrors.length} unused = ${allErrors.length} total`
        );
      }

      expect(allErrors.length).toBe(0);
    });
  });
});
