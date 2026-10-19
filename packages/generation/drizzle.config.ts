export default {
  dialect: "sqlite",
  schema: [
    "./src/infrastructure/drizzle-run-table.ts",
    "./src/infrastructure/drizzle-price-table.ts",
  ],
  out: "./drizzle",
}
