import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: { index: 'src/component/index.tsx' },
    outDir: 'dist/component',
    format: ['esm'],
    dts: true,
    external: ['react', 'react-dom'],
    banner: { js: '"use client";' },
    clean: true,
    sourcemap: true,
    target: 'es2022',
    loader: { '.css': 'copy' },
    esbuildOptions(opts) {
      opts.jsx = 'automatic'
    },
  },
  {
    entry: { 'styles': 'src/component/styles.css' },
    outDir: 'dist/component',
    format: ['esm'],
    loader: { '.css': 'copy' },
  },
  {
    entry: { index: 'src/server/index.ts' },
    outDir: 'dist/server',
    format: ['esm'],
    dts: true,
    target: 'node18',
    sourcemap: true,
  },
  {
    entry: { cli: 'src/cli.ts' },
    outDir: 'dist',
    format: ['esm'],
    target: 'node18',
    sourcemap: true,
    banner: { js: '#!/usr/bin/env node' },
  },
])
