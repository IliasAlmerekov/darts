/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-shared-to-upper-layers",
      comment: "Shared layer must not import pages or app.",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/(pages|app)/" },
    },
  ],
  options: {
    tsPreCompilationDeps: true,
    doNotFollow: {
      path: "(^|/|\\\\)node_modules($|/|\\\\)",
    },
    exclude: {
      path: "(^|/|\\\\)(dist|coverage|test-results|playwright-report)($|/|\\\\)",
    },
    enhancedResolveOptions: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
    },
    tsConfig: {
      fileName: "./tsconfig.json",
    },
  },
};
