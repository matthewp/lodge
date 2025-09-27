import * as esbuild from 'esbuild';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const watchMode = process.argv.includes('--watch');

const buildConfig = {
  entryPoints: ['ui/src/main.tsx'],
  bundle: true,
  outfile: 'ui/dist/bundle.js',
  format: 'esm',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: {
    '.tsx': 'tsx',
    '.ts': 'ts',
    '.jsx': 'jsx',
    '.js': 'js'
  },
  define: {
    'process.env.NODE_ENV': watchMode ? '"development"' : '"production"'
  },
  minify: !watchMode,
  sourcemap: watchMode
};

async function buildCSS() {
  try {
    await execAsync('npx tailwindcss -i ui/src/styles.css -o ui/dist/styles.css');
    console.log('CSS build complete');
  } catch (error) {
    console.error('CSS build failed:', error);
  }
}

async function build() {
  try {
    await buildCSS();

    if (watchMode) {
      const ctx = await esbuild.context(buildConfig);
      await ctx.watch();
      console.log('Watching for changes...');

      exec('npx tailwindcss -i ui/src/styles.css -o ui/dist/styles.css --watch', (error) => {
        if (error) console.error('Tailwind watch error:', error);
      });
    } else {
      await esbuild.build(buildConfig);
      console.log('Build complete');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();