# Development Environment Testing

This document describes the automated testing system for the `just dev` command, which monitors for TypeScript compilation and runtime errors.

## Overview

The `test-dev.js` script automatically:
- Starts the `just dev` development environment
- Monitors TypeScript compilation output for errors
- Detects runtime JavaScript errors in the browser/Flask output
- Captures warnings and other issues
- Generates detailed JSON reports
- Provides clear pass/fail results

## Usage

### Basic Testing

```bash
# Run with default 60-second timeout
npm run test:dev

# Or directly
node test-dev.js
```

### Advanced Options

```bash
# Run with custom timeout (30 seconds)
npm run test:dev -- --timeout=30

# Verbose output
node test-dev.js --verbose

# CI mode (optimized for continuous integration)
node test-dev.js --ci --timeout=20
```

### Command Line Options

- `--timeout=N`: Set maximum test duration in seconds (default: 60)
- `--ci`: Enable CI mode with shorter timeouts
- `--verbose`: Enable verbose logging
- `-v`: Alias for `--verbose`

## What It Detects

### TypeScript Errors
- Compilation errors (`error TS`)
- Type checking failures
- Import/export issues
- Syntax errors in TypeScript files

### Runtime Errors
- JavaScript `TypeError`, `ReferenceError`, `SyntaxError`
- Uncaught exceptions
- Browser console errors

### Warnings
- Deprecation warnings
- Build warnings
- Non-critical issues

## Test Results

### Exit Codes
- `0`: Success (no TypeScript or runtime errors)
- `1`: Failure (TypeScript or runtime errors detected)

### Report Generation
A detailed JSON report is saved to `test-dev-report.json` containing:
```json
{
  "success": true,
  "duration": 15011,
  "timestamp": "2025-08-04T10:24:08.777Z",
  "summary": {
    "tsErrors": 0,
    "runtimeErrors": 0,
    "warnings": 2,
    "totalErrors": 0
  },
  "details": {
    "typeScriptErrors": [],
    "runtimeErrors": [],
    "warnings": [...],
    "otherErrors": []
  }
}
```

## Integration

### NPM Scripts
The following scripts are available in `package.json`:
- `npm run test:dev`: Standard development test
- `npm run test:dev:ci`: CI-optimized test with 30-second timeout

### GitHub Actions
The test is integrated with CI/CD via `.github/workflows/test-dev.yml`:
- Runs on push/PR to main branches
- Tests multiple Node.js and Python versions
- Uploads test reports as artifacts
- Comments results on pull requests

### Pre-commit Hooks
You can add this test to your pre-commit hooks:
```bash
#!/bin/sh
# .git/hooks/pre-commit
npm run test:dev -- --timeout=20
```

## Troubleshooting

### Common Issues

**Test hangs or times out:**
- Reduce timeout: `--timeout=15`
- Check if `just` command is installed: `which just`
- Ensure Python virtual environment is activated

**False positives:**
- Deprecation warnings don't cause test failure
- Only TypeScript and runtime errors cause failure
- Check `test-dev-report.json` for details

**Environment setup:**
```bash
# Install just (macOS)
brew install just

# Install dependencies
npm install
source venv/bin/activate
pip install -r requirements.txt
```

### Debugging
Enable verbose output to see detailed logging:
```bash
npm run test:dev -- --verbose --timeout=30
```

## Best Practices

1. **Run before commits**: Use the test to catch errors early
2. **Monitor CI results**: Check GitHub Actions for cross-platform issues
3. **Review reports**: Examine `test-dev-report.json` for detailed error analysis
4. **Set appropriate timeouts**: Balance thoroughness with speed (15-30s typical)
5. **Fix TypeScript errors**: The test will fail on any TS compilation errors

## Example Output

### Successful Test
```
💡 [2025-08-04T10:24:08.777Z] Starting automated test for "just dev" command
💡 [2025-08-04T10:24:08.777Z] Test will run for maximum 15 seconds
✅ [2025-08-04T10:24:08.777Z] Development server is running
✅ [2025-08-04T10:24:08.777Z] TypeScript compilation successful
✅ [2025-08-04T10:24:08.777Z] Background autodiscovery completed
==================================================
TEST SUMMARY
==================================================
Duration: 15.0s
✅ TypeScript Errors: 0
✅ Runtime Errors: 0
⚠️ Warnings: 2
✅ Overall Result: PASS
```

### Failed Test
```
❌ [2025-08-04T10:23:16.394Z] TypeScript Error: src/ui/printers.ts(304,37): error TS18048: 'validPrinter.ip' is possibly 'undefined'.
❌ [2025-08-04T10:23:16.394Z] TypeScript Error: src/ui/printers.ts(306,11): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
==================================================
TEST SUMMARY
==================================================
Duration: 20.0s
❌ TypeScript Errors: 4
✅ Runtime Errors: 0
❌ Overall Result: FAIL
```

This automated testing ensures that the development environment starts cleanly without TypeScript compilation errors or runtime issues.