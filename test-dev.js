#!/usr/bin/env node

/**
 * Automated test for 'just dev' command
 * Monitors TypeScript compilation and runtime errors
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class DevTestRunner {
  constructor(options = {}) {
    this.errors = [];
    this.warnings = [];
    this.tsErrors = [];
    this.runtimeErrors = [];
    this.testStartTime = Date.now();
    this.maxRunTime = options.timeout ? options.timeout * 1000 : 60000; // Default 60 seconds
    this.process = null;
    this.ciMode = options.ci || false;
    this.verbose = options.verbose || false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '💡',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  parseOutput(data) {
    const output = data.toString();
    const lines = output.split('\n');

    for (const line of lines) {
      // Check for TypeScript compilation errors
      if (line.includes('error TS') || line.includes('Error:') && line.includes('.ts')) {
        this.tsErrors.push({
          timestamp: Date.now(),
          line: line.trim(),
          type: 'typescript'
        });
        this.log(`TypeScript Error: ${line.trim()}`, 'error');
      }

      // Check for runtime JavaScript errors
      if (line.includes('TypeError:') || line.includes('ReferenceError:') || 
          line.includes('SyntaxError:') || line.includes('Uncaught')) {
        this.runtimeErrors.push({
          timestamp: Date.now(),
          line: line.trim(),
          type: 'runtime'
        });
        this.log(`Runtime Error: ${line.trim()}`, 'error');
      }

      // Check for build warnings
      if (line.includes('warning') || line.includes('Warning:')) {
        this.warnings.push({
          timestamp: Date.now(),
          line: line.trim(),
          type: 'warning'
        });
        this.log(`Warning: ${line.trim()}`, 'warning');
      }

      // Check for successful compilation
      if (line.includes('TypeScript build completed') || 
          line.includes('Compilation successful')) {
        this.log('TypeScript compilation successful', 'success');
      }

      // Check for Flask server startup
      if (line.includes('Running on http://') || line.includes('Serving Flask app')) {
        this.log('Flask server started successfully', 'success');
      }

      // Check for autodiscovery completion
      if (line.includes('Startup autodiscovery complete')) {
        this.log('Background autodiscovery completed', 'success');
      }
    }
  }

  async runTest() {
    this.log('Starting automated test for "just dev" command');
    this.log(`Test will run for maximum ${this.maxRunTime / 1000} seconds`);

    return new Promise((resolve) => {
      // Check if 'just' command is available
      const justCheck = spawn('which', ['just'], { stdio: 'pipe' });
      
      justCheck.on('close', (code) => {
        if (code !== 0) {
          this.log('ERROR: "just" command not found. Please install just: brew install just', 'error');
          resolve(this.generateReport(false));
          return;
        }

        // Start the 'just dev' process
        this.log('Starting "just dev" process...');
        this.process = spawn('just', ['dev'], {
          stdio: 'pipe',
          cwd: process.cwd()
        });

        let hasStarted = false;
        let startupComplete = false;

        // Monitor stdout
        this.process.stdout.on('data', (data) => {
          this.parseOutput(data);
          
          // Check if services have started
          if (!hasStarted && data.toString().includes('Running on http://')) {
            hasStarted = true;
            this.log('Development server is running', 'success');
            
            // Give it a few more seconds to complete initialization
            setTimeout(() => {
              if (!startupComplete) {
                startupComplete = true;
                this.log('Startup phase complete, monitoring for errors...', 'info');
              }
            }, 5000);
          }
        });

        // Monitor stderr
        this.process.stderr.on('data', (data) => {
          this.parseOutput(data);
        });

        // Handle process exit
        this.process.on('close', (code) => {
          this.log(`"just dev" process exited with code ${code}`, code === 0 ? 'info' : 'error');
          resolve(this.generateReport(code === 0));
        });

        // Handle process errors
        this.process.on('error', (error) => {
          this.log(`Process error: ${error.message}`, 'error');
          this.errors.push({
            timestamp: Date.now(),
            error: error.message,
            type: 'process'
          });
          resolve(this.generateReport(false));
        });

        // Set maximum runtime timeout
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.log('Test timeout reached, terminating process...', 'warning');
            this.process.kill('SIGTERM');
            
            // Force kill if it doesn't terminate gracefully
            setTimeout(() => {
              if (this.process && !this.process.killed) {
                this.process.kill('SIGKILL');
              }
            }, 5000);
            
            resolve(this.generateReport(true));
          }
        }, this.maxRunTime);
      });
    });
  }

  generateReport(success) {
    const duration = Date.now() - this.testStartTime;
    const report = {
      success,
      duration,
      timestamp: new Date().toISOString(),
      summary: {
        tsErrors: this.tsErrors.length,
        runtimeErrors: this.runtimeErrors.length,
        warnings: this.warnings.length,
        totalErrors: this.errors.length
      },
      details: {
        typeScriptErrors: this.tsErrors,
        runtimeErrors: this.runtimeErrors,
        warnings: this.warnings,
        otherErrors: this.errors
      }
    };

    // Log summary
    this.log('='.repeat(50));
    this.log('TEST SUMMARY');
    this.log('='.repeat(50));
    this.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    this.log(`TypeScript Errors: ${report.summary.tsErrors}`, report.summary.tsErrors > 0 ? 'error' : 'success');
    this.log(`Runtime Errors: ${report.summary.runtimeErrors}`, report.summary.runtimeErrors > 0 ? 'error' : 'success');
    this.log(`Warnings: ${report.summary.warnings}`, report.summary.warnings > 0 ? 'warning' : 'info');
    
    const overallSuccess = report.summary.tsErrors === 0 && report.summary.runtimeErrors === 0;
    this.log(`Overall Result: ${overallSuccess ? 'PASS' : 'FAIL'}`, overallSuccess ? 'success' : 'error');

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'test-dev-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Detailed report saved to: ${reportPath}`);

    return report;
  }

  cleanup() {
    if (this.process && !this.process.killed) {
      this.log('Cleaning up process...');
      this.process.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 3000);
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    ci: false,
    verbose: false,
    timeout: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--ci') {
      options.ci = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg.startsWith('--timeout=')) {
      options.timeout = parseInt(arg.split('=')[1]);
    } else if (arg === '--timeout' && i + 1 < args.length) {
      options.timeout = parseInt(args[i + 1]);
      i++;
    }
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  const runner = new DevTestRunner(options);
  
  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, cleaning up...');
    runner.cleanup();
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, cleaning up...');
    runner.cleanup();
    process.exit(1);
  });

  try {
    const report = await runner.runTest();
    
    // Exit with appropriate code
    const exitCode = (report.summary.tsErrors === 0 && report.summary.runtimeErrors === 0) ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    runner.log(`Test runner error: ${error.message}`, 'error');
    process.exit(1);
  } finally {
    runner.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = DevTestRunner;