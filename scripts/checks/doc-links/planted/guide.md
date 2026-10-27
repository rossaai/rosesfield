# Planted guide

The control of `check-doc-links.ts`. It must refuse exactly one dead link and one missing graph name.

- [A live link](workflows/README.md#the-workflows-by-model)
- [A live folder](workflows/kept-graph/)
- [A dead link](workflows/gone-graph/README.md)
- [An outside link](https://example.com/missing)
- [An anchor](#planted-guide)
- A link inside code is not read: `[code](workflows/also-gone/README.md)`
