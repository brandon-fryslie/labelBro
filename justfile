# justfile for labelBro development
# Install just: https://github.com/casey/just#installation
# Usage: just <command>

# Default recipe - show available commands
default:
    @just --list

# Development server with TypeScript watching
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    
    # Colors for output
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    BLUE='\033[0;34m'
    YELLOW='\033[1;33m'
    NC='\033[0m' # No Color
    
    echo -e "${GREEN}🚀 Starting labelBro development environment...${NC}"
    
    uv sync --extra dev

    # Check if TypeScript dependencies are installed  
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Node modules not found. Installing TypeScript dependencies...${NC}"
        npm install
        echo -e "${GREEN}✅ TypeScript dependencies installed${NC}"
    fi
    
    echo -e "${BLUE}📁 TypeScript watcher and Python server will run in parallel${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop both services${NC}"
    echo ""
    
    # Function to cleanup background processes on exit
    cleanup() {
        echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
        jobs -p | xargs -r kill 2>/dev/null || true
        # Wait for processes to finish, but don't propagate their exit codes
        wait 2>/dev/null || true
        echo -e "${GREEN}✅ All services stopped${NC}"
        exit 0  # Always exit with success when manually stopped
    }
    
    # Set trap to cleanup on script exit
    trap cleanup EXIT INT TERM
    
    # Start TypeScript dev (type checking + compilation) in background
    (
        echo -e "${BLUE}[TypeScript]${NC} Starting TypeScript development (type checking + compilation)..."
        npm run dev 2>&1 | while IFS= read -r line; do
            echo -e "${BLUE}[TypeScript]${NC} $line"
        done
    ) &
    
    # Give TypeScript watcher a moment to start
    sleep 1
    
    # Start Python server in background
    (
        echo -e "${GREEN}[Python]${NC} Starting Flask development server..."
        uv run python3 -m label_bro.app 2>&1 | while IFS= read -r line; do
            echo -e "${GREEN}[Python]${NC} $line"
        done
    ) &
    
    # Wait for both background processes, but handle interruption gracefully
    wait 2>/dev/null || true

# Run Python server only
server:
    @echo "🐍 Starting Python server..."
    uv run python3 -m label_bro.app

# Run TypeScript development (type checking + compilation) only  
watch:
    @echo "📝 Starting TypeScript development (type checking + compilation)..."
    npm run dev

# Type check TypeScript without watching
typecheck:
    @echo "🔍 Type checking TypeScript..."
    npm run typecheck

# Install all dependencies
install:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "📦 Installing Python dependencies..."
    uv sync --extra dev
    echo "📦 Installing TypeScript dependencies..."
    npm install
    echo "✅ All dependencies installed"

# Setup development environment
setup: install
    @echo "🔧 Setting up development environment..."
    @echo "💡 Make sure you have Cairo and libusb installed:"
    @echo "   brew install cairo libusb"
    @echo "   ln -s /opt/homebrew/lib ~/lib"
    @echo "✅ Setup complete! Run 'just dev' to start development"

# Clean build artifacts
clean:
    @echo "🧹 Cleaning build artifacts..."
    rm -rf node_modules/.cache
    rm -rf __pycache__
    find . -name "*.pyc" -delete
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    @echo "✅ Clean complete"

# Run tests
test:
    @echo "🧪 Running Python tests..."
    uv run --extra dev python3 -m label_bro.tests.test_cli
    @echo "🔍 Running TypeScript type checking..."
    npm run typecheck
    @echo "🧪 Running TypeScript/Typia validation tests..."
    npm test
    @echo "✅ All tests passed"

# Run TypeScript tests only
test-ts:
    @echo "🧪 Running TypeScript tests with Typia validation..."
    npm test

# Run TypeScript tests in watch mode
test-watch:
    @echo "🧪 Running TypeScript tests in watch mode..."
    npm run test:watch

# Run validation-specific tests for AI feedback
test-validation:
    @echo "🤖 Running validation tests for AI feedback..."
    npm run test:validation

# Run tests with coverage report
test-coverage:
    @echo "📊 Running tests with coverage report..."
    npm run test:coverage

# Show project status
status:
    @echo "📊 labelBro Project Status"
    @echo "========================="
    @echo "Python version: $(python3 --version)"
    @echo "Node version: $(node --version 2>/dev/null || echo 'Not installed')"
    @echo "NPM version: $(npm --version 2>/dev/null || echo 'Not installed')"
    @echo "TypeScript: $(npx tsc --version 2>/dev/null || echo 'Not installed')"
    @echo ""
    @echo "Dependencies:"
    @echo "- Node modules: $([ -d node_modules ] && echo '✅' || echo '❌')"
    @echo "- TypeScript config: $([ -f tsconfig.json ] && echo '✅' || echo '❌')"
    @echo ""
    @echo "Ready to develop: just dev"