# RSC Boundary Marker

Visualize the `'use client'` boundary in your React codebase from the caller's side.

## Features

- **Automatic Detection**: Automatically identifies Components with `'use client'` imported in your React components
- **Visual Markers**: Shows clear visual indicators (`Client Component`) next to the Components with `'use client'`.

## How It Works

The extension scans your React files and marks any usage of Components with `"use client"` directive, and mark them with a visual indicator.

```jsx
// File with "use client" directive
// components/Button.tsx
export default function Button() {
  return <button>Click me</button>
}

// Usage in your component
import Button from './components/Button'

export default function Page() {
  return (
    <div>
      <Button /> Client Component
      {/* Marker shows this is a Client Component */}
    </div>
  )
}
```

## Supported Files

- `.jsx`, `.tsx` files
- Automatically detects `"use client"` directives
- Supports index file imports (`./components` → `./components/index.tsx`)

## Requirements

- Visual Studio Code 1.105.0 or higher

---

Made with ❤️ for React developers
