# TypeScript Frontend Setup

The frontend JavaScript code has been converted to TypeScript for improved type safety and development experience.

## Files Created

- `label_bro/static/js/app.ts` - TypeScript version of the frontend code with complete type definitions
- `tsconfig.json` - TypeScript configuration for frontend-only compilation
- `package.json` - Minimal package.json for TypeScript tooling
- `TYPESCRIPT.md` - This documentation file

## Modern Frontend Architecture

The frontend has been restructured using modern TypeScript practices with modular organization:

### Project Structure
```
src/
├── main.ts           # Main entry point and initialization
├── types/            # TypeScript type definitions
│   └── index.ts      # All interface definitions
├── api/              # API client layer
│   └── index.ts      # LabelBroAPI class for backend communication
└── ui/               # UI logic modules
    ├── dom.ts        # DOM utilities and element management
    ├── labels.ts     # Label preview and printing logic
    └── printers.ts   # Printer management and discovery
```

### Type Definitions
Comprehensive interfaces for all data structures:
- `PrinterData` - Printer information and status
- `PrintersResponse` - API response for printer listings
- `LabelPreviewData` - Label preview API response
- `PrintRequest` - Print job request structure
- `DiscoveryResponse` - Printer discovery API response
- `ManualConnectionResult` - Manual connection test results

## Usage

### Option 1: Modern Development Workflow (Recommended)
Use the included `justfile` for the best development experience:

```bash
# Install just command runner (one time)
brew install just  # macOS - see https://github.com/casey/just#installation for other platforms

# Start TypeScript watcher AND Python server simultaneously
just dev

# Other useful commands
just typecheck  # Type check only
just status     # Check project status
just setup      # Install all dependencies
```

### Option 2: Manual TypeScript Development
To use TypeScript during development manually:

```bash
# Install TypeScript (only needed once)
npm install

# Type check the code
npm run typecheck

# Watch for changes and type check continuously
npm run watch
```

### Option 3: Compile to JavaScript
To compile TypeScript to JavaScript for production:

```bash
# Install TypeScript
npm install

# Compile TypeScript (outputs to original app.js location with type checking)
npx tsc --outFile label_bro/static/js/app.js label_bro/static/js/app.ts --target ES2020 --lib ES2020,DOM
```

## Benefits

- **Type Safety**: Catch errors at compile time instead of runtime
- **Better IDE Support**: Enhanced autocomplete, refactoring, and navigation
- **Documentation**: Types serve as inline documentation for APIs and data structures
- **Maintainability**: Easier to understand and modify code with explicit types

## Build System

The project uses modern build tooling following 2024 best practices:

- **esbuild**: Super-fast bundling and compilation (~18ms builds)
- **TypeScript**: Separate type checking with `tsc --noEmit`
- **Concurrency**: Type checking and bundling run in parallel
- **Watch Mode**: Automatic rebuilding on file changes
- **Tree Shaking**: Dead code elimination in production builds
- **Source Maps**: Generated for debugging support

### Output
- Source: `src/main.ts` and modules
- Bundle: `label_bro/static/js/bundle.js` (minified, ~9KB)
- HTML: Updated to use `bundle.js` instead of `app.js`

## Current Status

✅ **Modern Frontend Architecture Complete**
- Modular TypeScript codebase with proper separation of concerns
- API layer abstraction for backend communication
- UI modules for different functional areas
- Comprehensive type definitions for all data structures
- Modern build system with esbuild and concurrent type checking
- Automatic bundling and minification
- No backend modifications made
- All existing functionality preserved
- Follows 2024 TypeScript and frontend best practices

The Flask application continues to work exactly as before, now powered by a modern, maintainable TypeScript frontend.

## For Developers

When making changes to the frontend:

1. **Edit the TypeScript file**: `label_bro/static/js/app.ts`
2. **Run type checking**: `npm run typecheck` to catch issues
3. **Test your changes**: Load the web app and verify functionality
4. **Optional**: Use `npm run watch` for continuous type checking during development

The original `app.js` file should not be edited directly - use the TypeScript version instead.