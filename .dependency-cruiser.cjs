/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-shared-to-upper-layers",
      comment: "Shared layer must not import entities, features, or app.",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: "^src/(entities|features|app)/" },
    },
    {
      name: "no-entities-to-upper-layers",
      comment: "Entities layer must not import features or app.",
      severity: "error",
      from: { path: "^src/entities/" },
      to: { path: "^src/(features|app)/" },
    },
    {
      name: "no-cross-feature-imports",
      comment:
        "Feature modules should not depend on other features directly. Move shared contracts to entities/shared.",
      severity: "error",
      from: { path: "^src/features/([^/]+)/" },
      to: {
        path: "^src/features/[^/]+/",
        pathNot: "^src/features/$1/",
      },
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
