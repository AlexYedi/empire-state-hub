# E-06 · X surfaces on the hub (Empire)

**Repo:** empire-state-hub · the content contract is E-05 in the pipeline repo

1. **Share on X.** A plain intent link (`https://x.com/intent/post?text=<title>&url=<page url>`) on room pages and, once E-02 lands, on long reads. No SDK, widget or tracking script.
2. **X cards.** `twitter:card = summary_large_image`, plus title, description and image, on rooms and long reads. Reuse the Open Graph image (E-01 item 9, or E-02 Phase 4).

## Must not
Load any third-party X script · add env vars.

**Done when:** the links render with correctly encoded params, an X card validator reads the metadata, and `pnpm check && pnpm lint && pnpm build` pass.
