// Build script with bundle analysis capabilities
const esbuild = require('esbuild');
const fs = require('fs');

// Build configuration for analysis
const buildConfig = {
  entryPoints: ['src/main.tsx'],
  outfile: 'label_bro/static/js/bundle.js',
  target: 'es2020',
  format: 'iife',
  sourcemap: true,
  bundle: true,
  jsx: 'automatic',
  jsxImportSource: 'react',
  minify: true,
  metafile: true, // Enable metafile for analysis
};

// Build function that generates analysis data
async function buildWithAnalysis() {
  try {
    const result = await esbuild.build(buildConfig);
    
    // Write metafile for analysis
    if (result.metafile) {
      await fs.promises.writeFile('bundle-meta.json', JSON.stringify(result.metafile, null, 2));
      console.log('✅ Build completed with analysis data');
      console.log('📊 Metafile saved to bundle-meta.json');
      
      // Generate basic analysis
      const analysis = analyzeBundle(result.metafile);
      console.log('\n📈 Bundle Analysis:');
      console.log(`  Total size: ${(analysis.totalBytes / 1024).toFixed(1)}KB`);
      console.log(`  Input files: ${analysis.inputCount}`);
      console.log(`  Largest inputs:`);
      
      analysis.largestInputs.forEach((input, i) => {
        console.log(`    ${i + 1}. ${input.path} (${(input.bytes / 1024).toFixed(1)}KB)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

function analyzeBundle(metafile) {
  const inputs = metafile.inputs;
  const outputs = metafile.outputs;
  
  // Calculate total input size
  let totalBytes = 0;
  const inputSizes = [];
  
  for (const [path, input] of Object.entries(inputs)) {
    totalBytes += input.bytes;
    inputSizes.push({ path, bytes: input.bytes });
  }
  
  // Sort by size descending
  inputSizes.sort((a, b) => b.bytes - a.bytes);
  
  return {
    totalBytes,
    inputCount: Object.keys(inputs).length,
    outputCount: Object.keys(outputs).length,
    largestInputs: inputSizes.slice(0, 10) // Top 10 largest inputs
  };
}

buildWithAnalysis();