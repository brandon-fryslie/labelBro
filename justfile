# justfile for labelBro development
# Install just: https://github.com/casey/just#installation
# Usage: just <command>

# Default recipe - show available commands
default:
    @just --list

# Flask plus the Vite dev server (hot reload, proxies /api to Flask); browse to http://localhost:5173
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
    
    # Check if TypeScript dependencies are installed  
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Node modules not found. Installing TypeScript dependencies...${NC}"
        pnpm install
        echo -e "${GREEN}✅ TypeScript dependencies installed${NC}"
    fi
    
    echo -e "${BLUE}📁 Vite dev server and Python server will run in parallel; browse to http://localhost:5173${NC}"
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
    
    # Start the Vite dev server in background
    (
        echo -e "${BLUE}[Vite]${NC} Starting the Vite dev server..."
        pnpm dev 2>&1 | while IFS= read -r line; do
            echo -e "${BLUE}[Vite]${NC} $line"
        done
    ) &
    
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

# Run the Vite dev server only (needs `just server` for /api)
watch:
    @echo "📝 Starting the Vite dev server on http://localhost:5173..."
    pnpm dev

# Type check TypeScript without watching
typecheck:
    @echo "🔍 Type checking TypeScript..."
    pnpm typecheck

# Install all dependencies
install:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "📦 Installing Python dependencies..."
    uv sync
    echo "📦 Installing TypeScript dependencies..."
    pnpm install
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
    uv run pytest
    @echo "🔍 Running TypeScript type checking..."
    pnpm typecheck
    @echo "🧪 Running TypeScript/Typia validation tests..."
    pnpm test
    @echo "✅ All tests passed"

# Run TypeScript tests only
test-ts:
    @echo "🧪 Running TypeScript tests with Typia validation..."
    pnpm test

# Run TypeScript tests in watch mode
test-watch:
    @echo "🧪 Running TypeScript tests in watch mode..."
    pnpm test:watch

# Show project status
status:
    @echo "📊 labelBro Project Status"
    @echo "========================="
    @echo "Python version: $(python3 --version)"
    @echo "Node version: $(node --version 2>/dev/null || echo 'Not installed')"
    @echo "pnpm version: $(pnpm --version 2>/dev/null || echo 'Not installed')"
    @echo "TypeScript: $(pnpm exec tsc --version 2>/dev/null || echo 'Not installed')"
    @echo ""
    @echo "Dependencies:"
    @echo "- Node modules: $([ -d node_modules ] && echo '✅' || echo '❌')"
    @echo "- TypeScript config: $([ -f tsconfig.json ] && echo '✅' || echo '❌')"
    @echo ""
    @echo "Ready to develop: just dev"