export default {
  dialect: "sqlite",
  schema: [
    "./src/infrastructure/drizzle-run-table.ts",
    "./src/infrastructure/drizzle-price-table.ts",
    "./src/infrastructure/router/drizzle-router-catalog-store.ts",
  ],
  out: "./drizzle",
}
