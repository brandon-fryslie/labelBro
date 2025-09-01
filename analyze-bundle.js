#!/usr/bin/env node

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function analyzeBundleComposition() {
  console.log('🔍 Analyzing Bundle Composition...\n');

  // Build with metafile for analysis
  const result = await esbuild.build({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    minify: true,
    target: 'es2020',
    format: 'iife',
    jsx: 'automatic',
    jsxImportSource: 'react',
    metafile: true,
    outdir: 'temp-analysis',
    write: false, // Don't write files, just get analysis
    external: [], // Bundle everything for analysis
  }).catch(() => {
    console.log('⚠️ esbuild analysis failed, falling back to file size analysis');
    return null;
  });

  if (result && result.metafile) {
    console.log('📊 Bundle Analysis Results:');
    console.log('=' .repeat(50));
    
    // Analyze outputs
    for (const [file, output] of Object.entries(result.metafile.outputs)) {
      console.log(`\n📦 ${file}:`);
      console.log(`  Size: ${(output.bytes / 1024).toFixed(2)} KB`);
      
      if (output.imports && output.imports.length > 0) {
        console.log(`  Imports: ${output.imports.length} files`);
      }
      
      if (output.exports && output.exports.length > 0) {
        console.log(`  Exports: ${output.exports.join(', ')}`);
      }
    }

    // Analyze inputs by size
    console.log('\n🏗️ Input Files by Size:');
    console.log('=' .repeat(30));
    
    const inputs = Object.entries(result.metafile.inputs)
      .map(([file, input]) => ({
        file: file.replace(process.cwd() + '/', ''),
        size: input.bytes,
        imports: input.imports?.length || 0
      }))
      .sort((a, b) => b.size - a.size);

    let totalSize = 0;
    inputs.slice(0, 20).forEach(input => {
      totalSize += input.size;
      console.log(`  ${input.file.padEnd(40)} ${(input.size / 1024).toFixed(2).padStart(8)} KB`);
    });

    console.log(`\nTop 20 files total: ${(totalSize / 1024).toFixed(2)} KB`);
    
    // Analyze by file type
    console.log('\n📁 Files by Type:');
    console.log('=' .repeat(20));
    
    const byType = {};
    inputs.forEach(input => {
      const ext = path.extname(input.file) || 'no-extension';
      if (!byType[ext]) {
        byType[ext] = { count: 0, size: 0 };
      }
      byType[ext].count++;
      byType[ext].size += input.size;
    });

    Object.entries(byType)
      .sort(([,a], [,b]) => b.size - a.size)
      .forEach(([ext, data]) => {
        console.log(`  ${ext.padEnd(12)} ${data.count.toString().padStart(3)} files, ${(data.size / 1024).toFixed(2).padStart(8)} KB`);
      });

    // Analyze node_modules vs source
    const nodeModulesSize = inputs
      .filter(input => input.file.includes('node_modules'))
      .reduce((total, input) => total + input.size, 0);
    
    const sourceSize = inputs
      .filter(input => !input.file.includes('node_modules'))
      .reduce((total, input) => total + input.size, 0);

    console.log('\n🎯 Source vs Dependencies:');
    console.log('=' .repeat(25));
    console.log(`  Source code:    ${(sourceSize / 1024).toFixed(2)} KB (${((sourceSize / (sourceSize + nodeModulesSize)) * 100).toFixed(1)}%)`);
    console.log(`  Dependencies:   ${(nodeModulesSize / 1024).toFixed(2)} KB (${((nodeModulesSize / (sourceSize + nodeModulesSize)) * 100).toFixed(1)}%)`);
    console.log(`  Total unbundled: ${((sourceSize + nodeModulesSize) / 1024).toFixed(2)} KB`);
  }

  // Analyze actual built bundle
  console.log('\n📏 Actual Bundle Sizes:');
  console.log('=' .repeat(22));

  const bundleDir = 'label_bro/static/js';
  const files = ['bundle.js', 'bundle.css', 'bundle.js.map', 'bundle.css.map'];
  
  let totalBundleSize = 0;
  files.forEach(file => {
    const filePath = path.join(bundleDir, file);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      const sizeKB = stat.size / 1024;
      totalBundleSize += stat.size;
      console.log(`  ${file.padEnd(16)} ${sizeKB.toFixed(2).padStart(8)} KB`);
    }
  });

  console.log(`  ${'Total:'.padEnd(16)} ${(totalBundleSize / 1024).toFixed(2).padStart(8)} KB`);

  // Performance recommendations
  console.log('\n💡 Bundle Optimization Opportunities:');
  console.log('=' .repeat(35));
  
  const bundleJsSize = fs.existsSync('label_bro/static/js/bundle.js') 
    ? fs.statSync('label_bro/static/js/bundle.js').size / 1024 
    : 0;

  if (bundleJsSize > 500) {
    console.log('  ⚠️ Bundle size > 500KB - Consider code splitting');
  } else if (bundleJsSize > 250) {
    console.log('  ⚡ Bundle size moderate - Room for optimization');
  } else {
    console.log('  ✅ Bundle size is reasonable');
  }

  console.log(`  📊 Current JS bundle: ${bundleJsSize.toFixed(2)} KB`);
  
  if (bundleJsSize > 200) {
    console.log('\n  Recommended optimizations:');
    console.log('  - Implement code splitting for large components');
    console.log('  - Use dynamic imports for non-critical features');
    console.log('  - Optimize React and dependency bundle inclusion');
    console.log('  - Remove unused code and dependencies');
  }

  // Check for source maps in production
  const sourceMapSize = fs.existsSync('label_bro/static/js/bundle.js.map') 
    ? fs.statSync('label_bro/static/js/bundle.js.map').size / 1024 
    : 0;

  if (sourceMapSize > 1000) {
    console.log('\n  ⚠️ Source maps are very large - consider excluding from production');
    console.log(`     Source map size: ${sourceMapSize.toFixed(2)} KB`);
  }

  console.log('\n✅ Bundle analysis complete!');
}

// Run analysis
analyzeBundleComposition().catch(console.error);