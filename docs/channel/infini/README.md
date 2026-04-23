# Infini Documentation Mirror

Saved from `https://developer.infini.money` for local reference.

## Scope

- `docs/en/*.md`: English docs pages
- `docs/zh/*.md`: Chinese docs pages
- `openapi*.md`: OpenAPI overview pages
- `openapi/**/paths/**/*.md`: OpenAPI operation pages
- `_bundle/openapi.json`
- `_bundle/openapi.yaml`
- `url-list.txt`: final Markdown URL list used for download

## Discovery Method

This mirror was not built from `sitemap.xml` alone.

Pages were enumerated from multiple live entry pages:

- `/`
- `/docs/en/1-overview`
- `/docs/zh/1-overview`
- `/openapi`
- `/openapi/currency`
- `/openapi/fund`
- `/openapi/order`
- `/openapi/payment`

Then all visible `View as Markdown` links were extracted and deduplicated.

## Count

- Markdown pages: `36`
- OpenAPI bundle files: `2`

## Local Integration Docs

- [Infini 在 new-api 中的配置说明](./new-api-config.md)

## Note

The site homepage `/` resolves to the English overview entry and does not expose a separate standalone Markdown page beyond `docs/en/1-overview.md`.
