# AgentEval Frontend Design System

This document outlines the core design philosophy, variance dials, and token architecture for the AgentEval frontend.

## Design Thesis

**"Precision under pressure."**

The AgentEval interface is an engineering instrument — precise, trustworthy, high-signal. It communicates the same rigor that the product applies to testing AI agents.

### Visual Personality
- **Technical**: Monospace for data, tabular numbers, structured layouts
- **Forensic**: Evidence chains, causal relationships, root cause analysis
- **Trustworthy**: Semantic color, clear thresholds, explained decisions
- **Controlled**: Restrained palette, deliberate spacing, minimal decoration
- **Analytical**: Meaningful data visualization, comparative views, trend awareness
- **Modern**: Clean typography, subtle motion, responsive
- **Premium**: Polished interactions, consistent details, no rough edges

## Design Variance Dials

The visual intensity of the application changes depending on the context:

| Surface | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
|---|---|---|---|
| Landing | 7 | 6 | 3 |
| Command Center | 5 | 4 | 7 |
| Operational Pages | 4 | 3 | 7 |
| Forensic/Trace Pages | 4 | 3 | 9 |
| Mobile | 3 | 3 | 5 |

## Token Architecture (Tailwind `@theme`)

### Typography System
- **Display**: Inter 48px/1.1 (bold, -0.02em tracking) — `text-display`
- **H1**: Inter 28px/1.2 (semibold, -0.02em tracking) — `text-h1`
- **H2**: Inter 20px/1.3 (semibold, -0.01em tracking) — `text-h2`
- **H3**: Inter 16px/1.4 (medium, -0.01em tracking) — `text-h3`
- **Body**: Inter 14px/1.5 (regular) — `text-body`
- **Body Small**: Inter 13px/1.5 (regular) — `text-body-sm`
- **Caption**: Inter 12px/1.5 (regular) — `text-caption`
- **Label**: Inter 11px/1.3 (bold, uppercase, 0.05em tracking) — `text-label`
- **KPI**: JetBrains Mono 48px/1.0 (bold, tabular, -0.02em tracking) — `text-kpi`
- **Mono**: JetBrains Mono 13px/1.6 — `text-mono`
- **Mono Small**: JetBrains Mono 11px/1.5 — `text-mono-sm`

### Color System
- **Canvas**: `#09090b` (base background) — `bg-canvas`
- **Surface**: `#111113` (elevated background) — `bg-surface`
- **Panel**: `#18181b` (cards and sections) — `bg-panel`
- **Panel Hover**: `#27272a` (interactive surfaces) — `bg-panel-hover`
- **Raised**: `#1e1e21` (elevated cards) — `bg-raised`
- **Border Subtle**: `#27272a` — `border-border-subtle`
- **Border Strong**: `#3f3f46` — `border-border-strong`

### Semantic Palette
- **Safe**: `#10b981` (passed/healthy/approved)
- **Warning**: `#f59e0b` (degraded/risk/attention)
- **Critical**: `#ef4444` (failed/blocked/violation)
- **Info**: `#3b82f6` (analytical/informational)
- **Accent**: `#6366f1` (primary action, AI-derived)

### Primitives
- **Button**: Use `Button.tsx` (primary, secondary, ghost, danger) with sizing and loading state
- **Badge**: Use `Badge.tsx` (success, warning, danger, info, default, accent). Helpers: `SeverityBadge`, `StatusBadge`
- **Section**: Use `Section.tsx` (panel, raised, inset, transparent) to structure content. Replaces `Card` overuse.
- **Metric**: Use `Metric.tsx` for standardized KPI display (value, unit, trend, delta)
- **StatusIndicator**: Use `StatusIndicator.tsx` for inline status dots and pulses
- **Skeleton**: Use `Skeleton.tsx` for loading states
- **EmptyState**: Use `EmptyState.tsx` for consistent empty state views

### Responsive Design
- The application uses a standard 12-column grid system implicitly via Tailwind.
- The sidebar collapses to a hamburger menu on screens `<1024px` (`lg` breakpoint).
- All tables must be wrapped in `overflow-x-auto`.
- Use stacking (flex-col) for most side-by-side elements on mobile.
