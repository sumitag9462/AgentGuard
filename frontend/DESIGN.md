# AgentEval Design System

## Dial Configuration
Following the Taste-Skill philosophy, here are the target design dials for the application surfaces:
- **Landing Page**: Variance = 8, Motion = 7, Density = 3
- **Dashboard**: Variance = 6, Motion = 4, Density = 7
- **Trace Viewer**: Variance = 4, Motion = 3, Density = 9
- **Failure Investigation**: Variance = 5, Motion = 4, Density = 8

## Visual Identity
**Precision & Trust.** Avoid generic "magic AI" patterns (e.g. glowing orbs, purple-blue gradients, overused glassmorphism). The system should feel like a cold, precise engineering environment.

## Typography Hierarchy
- **Display Sans**: Geist or Inter (for highly technical density). We will stick to `Inter` (or `Geist` if imported) for a neutral, technical B2B feel, as appropriate for a strict developer tool.
- **Mono**: `JetBrains Mono` or `Geist Mono` for technical data, JSON, traces, and metrics.
- Avoid serifs entirely.
- Avoid huge headings.

## Color System (Semantic)
Colors must communicate state, not decoration.
- **Background Base**: `#09090b` (Zinc-950) or pure black. Deep, stark contrast.
- **Surface Panels**: `#18181b` (Zinc-900) for raised surfaces, but avoid nesting too many cards. Use borders and negative space instead.
- **Text Primary**: `#fafafa` (Zinc-50)
- **Text Secondary**: `#a1a1aa` (Zinc-400)
- **Status - Safe/Passed**: `#10b981` (Emerald)
- **Status - Warning/Attention**: `#f59e0b` (Amber)
- **Status - Critical/Blocked**: `#ef4444` (Red/Rose)
- **Status - Neutral/Info**: `#3b82f6` (Blue)
*Note: We will remove the current ambient mesh gradients and purple glows.*

## Spatial Design & Hierarchy
- Avoid "Card in a Card in a Card". Use tables, inline metadata, and grouping with `border-t`, `divide-y`, or negative space.
- Maximize information density in the Trace Viewer and Failures page. 
- Use CSS Grid instead of complex flex-math.

## Motion & Interaction (Emil Kowalski Philosophy)
- **Rule of Thumb**: Motion must communicate state changes, causality, hierarchy, or progress. 
- **Feedback**: Scale buttons slightly (`scale(0.97)`) on `:active`. 
- **Transitions**: Use `ease-out` (e.g., `cubic-bezier(0.23, 1, 0.32, 1)`) for UI entries. UI animations must be fast (<200ms).
- **Stagger**: When lists appear, use subtle stagger (30-50ms) to create a cascading effect.
- **No motion on repetitive actions**.

## Accessibility
- Contrast ratio must meet WCAG AA.
- Form inputs and focus states must be clear (`focus-visible`).
- Handle `prefers-reduced-motion` for all complex animations.
