export default {
  base: './',
  build: { outDir: 'dist', target: 'esnext' },
  esbuild: { target: 'esnext' },
  optimizeDeps: { esbuildOptions: { target: 'esnext' } }
};
