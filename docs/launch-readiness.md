# Launch Readiness

This document captures the first paid-launch operating model for Chroma Node.

## First Successful Grade

1. Install the app and confirm FFmpeg diagnostics show `FFmpeg ready`.
2. Import one supported MP4 or MOV clip.
3. Use the Grade workspace to adjust primaries, curves, qualifier, or power windows.
4. Capture a still when the grade reaches a useful comparison point.
5. Export with a workflow preset:
   - Review: draft H.264 for quick feedback.
   - Social: standard H.264 with audio passthrough when source audio exists.
   - Archive: ProRes master when the installed FFmpeg build supports it.
6. If export fails, create a support bundle before retrying so diagnostics preserve the failure context.

## Pricing Gates

| Tier | Export | AI | Scopes | Marketplace | Support |
| --- | --- | --- | --- | --- | --- |
| Free | Up to 1080p, 10 exports/month | Off | Basic | Off | Standard |
| Trial | Up to 1080p, 25 exports/month | On | Advanced | Off | Standard |
| Paid | Up to 4K, 100 exports/month | On | Advanced | On | Standard |
| Pro | HDR/unlimited exports | On | Advanced | On | Priority |

Implementation mapping:

- Export resolution and monthly export limits are enforced through `checkExportEntitlement()`.
- AI suggestion application is gated through the `aiAssistedGrading` entitlement.
- Marketplace, priority support, and additional pro controls should use the same `checkFeatureEntitlement()` IPC boundary when UI flows are added.

## Telemetry And Metrics

Telemetry remains disabled until the user grants consent. Events are redacted before queueing and can be flushed to either a configured HTTP endpoint or a local JSONL export path.

| Metric | Events |
| --- | --- |
| Activation | `app:start`, `license:trial-start`, `license:activate` |
| Export completion | `export:complete`, `export:fail` |
| Retention | `app:start`, `app:quit` |
| Conversion | `license:activate`, `purchase:initiated`, `purchase:completed` |
| Support load | `support:submit`, `crash:capture` |

Manual review workflow:

1. Export local telemetry JSONL during private beta.
2. Count event totals by day and tier.
3. Compare export failures against support bundle manifests.
4. Promote only redacted aggregate metrics into launch reporting.

## Troubleshooting

- FFmpeg unavailable: open diagnostics, install or bundle a supported FFmpeg build, then restart the app.
- Encoder unavailable: choose another codec or install an FFmpeg build with the required encoder.
- Export blocked by license: start a trial or activate a paid key; project files remain editable.
- AI suggestion blocked: activate a trial, paid, or pro entitlement.
- Telemetry queue not flushing: verify consent is granted and a provider endpoint or JSONL export path is configured.
- Support request: create a redacted bundle with logs, project diagnostics, and media metadata selected.
