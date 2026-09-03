# Image generation WebMCP tools

Iterum treats generated imagery as reviewable design material, not approved campaign content. These tools are available on authenticated cloud project routes.

## Shared workflow

1. ChatGPT calls a cost-bearing tool without `costApproval`.
2. Iterum returns the current model, image count, conservative output-cost estimate, excluded input costs, and a `quoteFingerprint`. No generation starts.
3. After the designer accepts the disclosure, ChatGPT repeats the exact request with:

```json
{
  "costApproval": {
    "accepted": true,
    "quoteFingerprint": "imgq-v1-…"
  }
}
```

4. Convex records the run before calling OpenAI, stores returned WebP files, and records the OpenAI request ID or structured failure.
5. Every output becomes a pending reference in Iterum's existing Review Tray. Generation never invokes a separate approval system and never places an output directly on the board.

## Tools

### `generate_image_candidates`

Creates one to four studies from an approved creative route and selected image-bearing board items. The full route thesis, palette, image treatment, composition principles, preserve list, avoid list, and designer prompt are sent as one art-direction instruction.

### `edit_image_candidate`

Creates a child version of an existing generated asset. The previous asset remains available. A normalized crop can identify the edit focus and a public HTTPS mask can constrain the painted area. The mask must meet OpenAI's image-edit requirements.

### `generate_campaign_applications`

Adapts one approved board asset and an approved route into one to four named formats: poster, story, landing-page hero, or square. It generates the image layer only. Iterum explicitly instructs the model not to render logos or final campaign typography.

### `get_image_generation_run`

Returns the durable run ledger: operation, model, quality, prompt, preserve/avoid lists, reference IDs, output specifications, cost disclosure, board versions, output lineage, provider request ID, failures, and each proposal's current approval state.

## Invariants

- Only approved routes may drive generation.
- Only board assets—not pending proposals—may drive campaign applications.
- Generated outputs are labeled separately from sourced references.
- Generated images use `reference-only` rights status until the designer establishes a project-specific usage policy.
- Edits increment immutable lineage versions and never overwrite a previous asset.
- Present mode renders board items, so pending generated proposals remain hidden.
- Raster text is never canonical campaign typography.
- Repeating an idempotency key with different inputs fails instead of charging twice for a different request.

## Provider configuration

Image execution runs inside an authenticated Convex action and requires `OPENAI_API_KEY` in the Convex deployment environment:

```sh
npx convex env set OPENAI_API_KEY <your-key>
```

The quote boundary and all non-provider contract tests work without this secret. Real generation does not.

Pricing is a snapshot, not a billing guarantee. Iterum currently estimates output cost with the published GPT Image 2 1024×1024 rate and separately discloses that prompt and reference-image input tokens are additional. See the [OpenAI image generation cost guide](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency).
