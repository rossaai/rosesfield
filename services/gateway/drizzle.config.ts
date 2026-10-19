export default {
  dialect: "sqlite",
  schema: [
    "./src/session/session-tables.ts",
    "./src/share/share-tables.ts",
    "./src/spend/spend-tables.ts",
  ],
  out: "./drizzle",
}
