# ADR 0005: Preserve structured retrieval errors in bundle/map evidence

- Status: Accepted
- Date: 2026-10-10
- Related work: RM-12 maintenance

## Context

The fetcher already records typed failure codes, but bundle/map errors retained only prose. The renderer recognized paused origins by matching an English sentence. Changing wording could silently break the pause summary. A received HTTP 429 and a later pre-request pause also need distinct evidence.

## Decision and compatibility

Add optional `errorCode` to bundle/map observations using the existing networking `FailureCode` values. Add optional `httpStatus` to bundles (maps already have it). Populate these from retrieval outcomes; leave unknown/untyped errors unclassified. Preserve `error` for human diagnostics.

`errorCode: rate-limited` with HTTP 429 means a response was received. The same code without `httpStatus` means retrieval was blocked by an origin pause, possibly after an earlier redirect hop. Render pause totals from these fields, never from error text.

This is additive schema-1 metadata. Existing fields, statuses, counts and meanings remain unchanged, so no schema increment or migration is required. Older reports without these fields remain readable; absence means unknown, not a reason to infer a code from prose. Any saved comparison must account for scanner provenance as before.

## Alternatives and consequences

A shared message constant would prevent spelling drift but leave machine meaning coupled to text. A breaking report redesign is unnecessary. Typed fields add a small amount of metadata and support consumers while retaining request evidence for individual hops. Tests connect real pause/HTTP behavior to reports and vary human wording independently.

Revisit if failure-code meanings or status enums need to change; that requires a separate compatibility review.
