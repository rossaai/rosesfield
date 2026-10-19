const external = [
  "core",
  "npm",
  "npm-dev",
  "npm-optional",
  "npm-peer",
  "npm-bundled",
  "npm-no-pkg",
  "npm-unknown",
]

/** @type {import("dependency-cruiser").IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      comment: "A module never imports itself through a chain of imports.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      comment: "Every import resolves to a file or a declared package.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-undeclared-dependency",
      comment:
        "Production code imports only the packages its own package.json declares.",
      severity: "error",
      from: { path: "^(apps|services|packages)/[^/]+/src/" },
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      name: "no-dev-dependency-in-src",
      comment: "Production code never imports a devDependency at run time.",
      severity: "error",
      from: { path: "^(apps|services|packages)/[^/]+/src/" },
      to: {
        dependencyTypes: ["npm-dev"],
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "kernel-imports-nothing-external",
      comment:
        "The kernel is framework-free: no npm package and no node module.",
      severity: "error",
      from: { path: "^packages/kernel/src/" },
      to: { dependencyTypes: external },
    },
    {
      name: "kernel-imports-no-workspace",
      comment: "The kernel imports no other workspace.",
      severity: "error",
      from: { path: "^packages/kernel/" },
      to: { path: "^(apps|services|packages/(?!kernel/))" },
    },
    {
      name: "domain-imports-nothing-external",
      comment:
        "domain imports nothing from npm and no node module, per docs/architecture.md.",
      severity: "error",
      from: { path: ["/src/domain/", "/src/.*/domain/"] },
      to: { dependencyTypes: external },
    },
    {
      name: "application-imports-nothing-external",
      comment:
        "Only infrastructure imports third-party code. application receives ports.",
      severity: "error",
      from: { path: ["/src/application/", "/src/.*/application/"] },
      to: { dependencyTypes: external },
    },
    {
      name: "domain-points-inward",
      comment: "domain never imports application, infrastructure or routes.",
      severity: "error",
      from: { path: ["/src/domain/", "/src/.*/domain/"] },
      to: {
        path: [
          "/src/(application|infrastructure|routes)/",
          "/src/.*/(application|infrastructure|routes)/",
        ],
      },
    },
    {
      name: "application-points-inward",
      comment: "application never imports infrastructure or routes.",
      severity: "error",
      from: { path: ["/src/application/", "/src/.*/application/"] },
      to: {
        path: [
          "/src/(infrastructure|routes)/",
          "/src/.*/(infrastructure|routes)/",
        ],
      },
    },
    {
      name: "infrastructure-points-inward",
      comment: "infrastructure never imports routes.",
      severity: "error",
      from: { path: ["/src/infrastructure/", "/src/.*/infrastructure/"] },
      to: { path: ["/src/routes/", "/src/.*/routes/"] },
    },
    {
      name: "packages-not-to-apps-or-services",
      comment: "Shared code never imports a consumer.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^(apps|services)/" },
    },
    {
      name: "apps-not-to-services",
      comment:
        "What ships to a device never imports server code. It reaches the gateway over HTTP.",
      severity: "error",
      from: { path: "^apps/" },
      to: { path: "^services/" },
    },
    {
      name: "src-not-to-test",
      comment: "Production code never imports a test file.",
      severity: "error",
      from: { path: "/src/" },
      to: { path: "/test/" },
    },
  ],
  options: {
    doNotFollow: { path: ["node_modules"] },
    exclude: { path: ["^(apps|services|packages)/[^/]+/dist/"] },
    parser: "swc",
    combinedDependencies: false,
    webpackConfig: { fileName: "scripts/dependency-cruiser-aliases.cjs" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types", "typings"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".d.ts"],
    },
  },
}
