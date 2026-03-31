# Bamboo Forest: UX & Content Strategy Enhancement Report II

## 1. Context & Objective
Following up on the previous UX enhancements, this report proposes the next iteration of improvements for the Bamboo Forest application. The primary goal is to further deepen the "anti-game" meditative experience by increasing content depth (interactive poetry) and expanding feature functionality (Zen Mode).

## 2. Proposed Enhancements

### Enhancement A: True "Zen Mode" (Feature & UX)
*   **Description:** A dedicated, globally accessible "Zen Mode" toggle that, when activated, smoothly fades out *all* non-essential HUD elements (including navigation, the new breath guide, info buttons, and zone descriptions), leaving only the 3D environment and the ambient audio.
*   **Rationale:** While the current `isIdle` state rewards stillness by fading out some text, a true meditative experience requires intent. Giving the user an explicit "Zen Mode" button empowers them to choose complete visual immersion without having to maintain physical stillness (i.e., they can wander the environment without any UI overlays breaking the illusion).
*   **Impact:** Empowers users, maximizes the "beast mode" WebGL visuals, and provides the ultimate clutter-free experience.
*   **Priority:** High

### Enhancement B: Interactive Haikus (Content Depth & Engagement)
*   **Description:** Expanding on the transient zone poetry introduced previously, each zone will now feature multiple poetic reflections (haikus). When the `isIdle` state triggers the display of a poem, the text becomes a subtle, interactive element. Clicking the text will gently crossfade to another poem in that zone's collection.
*   **Rationale:** A single poem per zone limits long-term engagement. By offering a curated array of haikus, we encourage users to linger longer and discover more content, deepening the lore and philosophical reflection.
*   **Impact:** Greatly increases content depth and replayability. It transforms a static reward into an active discovery mechanic.
*   **Priority:** High

## 3. Implementation Plan

1.  **`src/App.tsx`:** Introduce a global `zenMode` state.
2.  **`src/components/UI.tsx`:** Add a Zen Mode toggle button to the peripheral controls. Ensure all other UI elements (including the breathing guide) respect `zenMode` by hiding when it is active.
3.  **`src/components/Overlay.tsx`:** Update the `zoneConfig` to hold an array of poems. Add a state to track the active poem index. Add a click handler to the poem text to cycle through them. Hide the overlay completely when `zenMode` is active.
4.  **`src/components/TourOverlay.tsx`:** Hide the tour trigger button when `zenMode` is active.