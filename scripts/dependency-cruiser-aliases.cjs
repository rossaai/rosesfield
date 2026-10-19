const { join } = require("node:path")

const repositoryRoot = join(__dirname, "..")

module.exports = {
  resolve: {
    alias: {
      "@": join(repositoryRoot, "apps", "platform", "src"),
    },
  },
}
