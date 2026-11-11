# Worker-first-draw diagnostic, Nov11

Separate branch from bank2c0ec62, no merge or production change.

The three InstancedMeshes allocate capacity before the async worker provides transforms. Three.js initializes their instance matrices to identity and count to allocation capacity. The ordinary entry camera looks away from the origin; the downstream camera faces it. Drawing the uninitialized allocations can therefore put thousands of duplicate stalk/branch/leaf meshes at the origin in the first frames. This is a source-grounded startup defect, not proof of the whole crash cause.

All three allocations now begin with draw count0. useLayoutEffect installs the exact real worker arrays and counts before the next draw. Every generated initialized instance remains; no scene element or density is removed. No render passes or triangles added by this change. Diagnostic data exposes actual branch/leaf counts in addition to stalk count.

Before change: downstream-camera local390/1365 failed30s readiness, and390 still failed75s. Stream-only control rendered while adding bamboo reproduced timeout. After change: the same local temporary downstream-camera diagnostic at390/1365 reached4994stalks with no page errors; both real frames inspected. Temporary initialization restored. This supports the startup mechanism locally; not a hardware-wide conclusion.

Normal local Enter -> Guided Tour -> Next -> Next then reached the actual downstream stream step2 at390/1365 with reduced-motion preference. Both screenshots inspected. Actual loaded counts at stream:4794stalks,8448branches,33717leaf instances. No page errors. Script docs/verification/bank-tour.mjs preserves this journey. Test-worker-first-draw is a source contract, not visual proof. The original bank/quality/performance/device/audio/all-quadrant holds remain open.

Parent preview/pixels review required before any merge. The predecessor hosted2c0ec62 reached phone stream but desktop Guided Tour suffered reconnect and old-tab blanking twice. No renderer-crash cause inferred from that transport behavior. This successor still needs hosted normal journey proof before calling it a finished candidate.
