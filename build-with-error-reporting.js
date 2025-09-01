// Custom build script with TypeScript error reporting to backend
const esbuild = require('esbuild');
const fs = require('fs');
const http = require('http');
const ts = require('typescript');

// Typia transformer plugin for esbuild
const typiaTransformer = {
  name: 'typia-transformer',
  setup(build) {
    build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
      const source = await fs.promises.readFile(args.path, 'utf8');
      
      try {
        // Create a TypeScript program for the transformer
        const compilerOptions = {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.ESNext,
          strict: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: true,
          moduleResolution: ts.ModuleResolutionKind.Node10,
          jsx: ts.JsxEmit.ReactJSX,
          jsxImportSource: 'react'
        };
        
        // Create a temporary source file
        const sourceFile = ts.createSourceFile(
          args.path,
          source,
          ts.ScriptTarget.ES2020,
          true
        );
        
        // Create a minimal program for the transformer
        const program = ts.createProgram([args.path], compilerOptions, {
          getSourceFile: (fileName) => fileName === args.path ? sourceFile : undefined,
          writeFile: () => {},
          getCurrentDirectory: () => process.cwd(),
          getDirectories: () => [],
          fileExists: (fileName) => fileName === args.path,
          readFile: (fileName) => fileName === args.path ? source : undefined,
          getCanonicalFileName: (fileName) => fileName,
          useCaseSensitiveFileNames: () => true,
          getNewLine: () => ts.sys.newLine,
          getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options)
        });
        
        // Import and apply typia transform
        const typia = require('typia/lib/transform').default;
        const transformResult = ts.transform(sourceFile, [typia(program)]);
        
        // Generate the output
        const printer = ts.createPrinter();
        const result = printer.printFile(transformResult.transformed[0]);
        
        transformResult.dispose();
        
        return {
          contents: result,
          loader: 'js'
        };
      } catch (error) {
        // If typia transform fails, fall back to regular TypeScript compilation
        console.warn(`Typia transform failed for ${args.path}:`, error.message);
        
        const result = ts.transpileModule(source, {
          compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ESNext,
            strict: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            skipLibCheck: true,
            jsx: ts.JsxEmit.ReactJSX,
            jsxImportSource: 'react'
          }
        });
        
        return {
          contents: result.outputText,
          loader: 'js'
        };
      }
    });
  }
};

// Function to send TypeScript errors to backend
async function reportTypeScriptError(error) {
  const errorData = JSON.stringify({
    type: 'TYPESCRIPT_BUILD_ERROR',
    message: error.text || error.message,
    source: 'esbuild-typescript',
    timestamp: new Date().toISOString(),
    details: {
      file: error.location?.file,
      line: error.location?.line,
      column: error.location?.column,
      lineText: error.location?.lineText,
      suggestion: error.location?.suggestion,
      errorType: 'build'
    }
  });

  // Try common Flask ports (5099-5199) to find the running server
  const commonPorts = [5099, 5100, 5101, 5102, 5103, 5104, 5105];
  
  for (const port of commonPorts) {
    const success = await tryPort(errorData, port);
    if (success) {
      return;
    }
  }
  
  console.warn('Could not find running Flask server to report TypeScript error');
}

async function tryPort(errorData, port) {
  return new Promise((resolve) => {
    const postData = errorData;
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: '/log-frontend-error',
      method: 'POST',
      timeout: 1000, // 1 second timeout
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      // Success - found the server
      resolve(true);
    });

    req.on('error', (err) => {
      // Port not available or error
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.setTimeout(1000);
    req.write(postData);
    req.end();
  });
}

// Custom esbuild plugin for error reporting
const errorReportingPlugin = {
  name: 'error-reporting',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) {
        console.log(`\n🚨 TypeScript Build Errors (${result.errors.length}):`);
        
        // Report each error to backend
        for (const error of result.errors) {
          console.log(`   ${error.location?.file}:${error.location?.line}:${error.location?.column} - ${error.text}`);
          await reportTypeScriptError(error);
        }
        
        console.log(`   → Errors also logged to backend server stderr\n`);
      }
      
      if (result.warnings.length > 0) {
        console.log(`\n⚠️  TypeScript Build Warnings (${result.warnings.length}):`);
        for (const warning of result.warnings) {
          console.log(`   ${warning.location?.file}:${warning.location?.line}:${warning.location?.column} - ${warning.text}`);
        }
        console.log('');
      }
    });
  }
};

// Main build function
async function build() {
  try {
    const isWatch = process.argv.includes('--watch');
    const isProduction = !isWatch && !process.argv.includes('--dev');
    
    // Set NODE_ENV for React production optimizations
    if (isProduction) {
      process.env.NODE_ENV = 'production';
      console.log('🏭 Building for production (NODE_ENV=production)');
    } else {
      process.env.NODE_ENV = 'development';
      console.log('🛠️ Building for development (NODE_ENV=development)');
    }

    // Build configuration with React optimization
    const buildConfig = {
      entryPoints: ['src/main.tsx'],
      outfile: 'label_bro/static/js/bundle.js',
      target: 'es2020',
      format: 'iife',
      sourcemap: true,
      bundle: true,
      jsx: 'automatic',
      jsxImportSource: 'react',
      plugins: [errorReportingPlugin],
      
      // Production optimizations
      minify: isProduction,
      treeShaking: true,
      
      // Define NODE_ENV for bundled code (critical for React optimization)
      define: {
        'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
      },
      
      // Production-only optimizations
      ...(isProduction && {
        drop: ['console', 'debugger'], // Remove console.log and debugger statements
        legalComments: 'none', // Remove legal comments to save bytes
      }),
      
      // External dependencies optimization (none for now - bundle everything)
      external: [],
    };

    if (isWatch) {
      // Watch mode - faster builds, more debugging info
      const ctx = await esbuild.context(buildConfig);
      await ctx.watch();
      console.log('👀 Watching for TypeScript changes...');
    } else {
      // Single build
      const result = await esbuild.build({
        ...buildConfig,
        metafile: true // Generate metafile for analysis
      });
      
      if (isProduction) {
        console.log('✅ Production TypeScript build completed');
        
        // Show bundle size information
        const bundlePath = 'label_bro/static/js/bundle.js';
        if (fs.existsSync(bundlePath)) {
          const bundleSize = fs.statSync(bundlePath).size;
          console.log(`📦 Bundle size: ${(bundleSize / 1024).toFixed(2)} KB`);
          
          if (bundleSize > 500 * 1024) {
            console.warn('⚠️ Bundle size > 500KB - consider optimization');
          } else if (bundleSize > 250 * 1024) {
            console.log('⚡ Bundle size moderate - optimization opportunities exist');
          } else {
            console.log('✅ Bundle size is optimal');
          }
        }
        
        // Optional: Save metafile for further analysis
        if (result.metafile) {
          fs.writeFileSync('bundle-meta.json', JSON.stringify(result.metafile, null, 2));
          console.log('📊 Bundle metafile saved to bundle-meta.json');
        }
      } else {
        console.log('✅ Development TypeScript build completed');
      }
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();