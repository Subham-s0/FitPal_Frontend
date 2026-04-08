# Toggle Button Animations

This document describes the smooth animation system for toggle buttons/tabs across the FitPal application.

## Components

### `ToggleButton`
A reusable component for individual toggle buttons with smooth transitions.

**Props:**
- `active` - Whether the button is currently active
- `onClick` - Click handler
- `children` - Button label/content
- `className` - Optional additional styles
- `size` - `"sm"` | `"md"` | `"lg"` (default: `"md"`)
- `variant` - `"default"` | `"pill"` | `"minimal"` (default: `"default"`)

**Example:**
```tsx
import { ToggleButton } from "@/shared/ui/toggle-button";

<ToggleButton
  active={window === "WEEK"}
  onClick={() => setWindow("WEEK")}
  size="md"
  variant="default"
>
  Week
</ToggleButton>
```

### `ToggleGroup`
A container for multiple toggle buttons with smooth indicator animation.

**Props:**
- `value` - Current active value
- `onValueChange` - Change handler
- `options` - Array of values or `{ value, label }` objects
- `size` - `"sm"` | `"md"` | `"lg"` (default: `"md"`)
- `variant` - `"default"` | `"pill"` | `"minimal"` (default: `"default"`)
- `formatLabel` - Optional label formatter function
- `className` - Optional container className

**Example:**
```tsx
import { ToggleGroup } from "@/shared/ui/toggle-button";

<ToggleGroup
  value={window}
  onValueChange={setWindow}
  options={["WEEK", "MONTH"] as const}
  formatLabel={(v) => v[0] + v.slice(1).toLowerCase()}
/>
```

## Animation Features

All toggle buttons now include:

1. **Smooth transitions** - 300ms cubic-bezier easing
2. **Scale effects** - Hover scale (1.02x) and active press (0.98x) for inactive buttons
3. **Glow effects** - Active buttons have subtle animated glow (on default variant)
4. **GPU acceleration** - Using `transform-gpu` and `will-change-transform` for optimal performance
5. **Color transitions** - Smooth color changes between states

## Legacy Support

For backward compatibility, the following constants are exported:

```tsx
import { TOGGLE_BASE, TOGGLE_IDLE, TOGGLE_ACTIVE, TOGGLE_BAR } from "@/shared/ui/toggle-button";

<button className={`${TOGGLE_BASE} ${active ? TOGGLE_ACTIVE : TOGGLE_IDLE}`}>
  Label
</button>
```

## Updated Files

The following files have been updated with smooth toggle animations:

- ✅ `GymMembersPage.tsx` - Window and range filters
- ✅ `AdminCmsView.tsx` - CMS section tabs
- ✅ `ManageGyms.tsx` - Gym profile view tabs
- 🔄 Additional files to be updated as needed

## Animation Specifications

### Timing
- **Duration**: 300ms
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (smooth ease-in-out)

### Scale Effects
- **Hover**: `scale(1.02)` - Subtle grow on hover (inactive buttons only)
- **Active Press**: `scale(0.98)` - Slight shrink on click (inactive buttons only)
- **Active State**: `scale(1)` - No scale effect for active buttons

### Colors (Default Variant)
- **Active**: 
  - Border: `border-orange-500/50`
  - Background: `bg-orange-500`
  - Text: `text-white`
  - Shadow: `0 0 20px rgba(251,146,60,0.15)`
  
- **Inactive**:
  - Border: `border-white/10`
  - Background: `bg-white/[0.03]`
  - Text: `text-zinc-400`
  - Hover: `border-white/20 text-white`

## Performance Considerations

- Uses `transform-gpu` for hardware acceleration
- Uses `will-change-transform` to hint browser optimization
- Transitions are limited to transform and color properties (no expensive properties like width/height)

## Future Enhancements

Potential improvements:
- Spring physics animations (using framer-motion or similar)
- Ripple effects on click
- Sound effects (optional, accessibility-friendly)
- Haptic feedback for mobile devices
