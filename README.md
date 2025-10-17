# RSC Boundary Marker

Visualize the boundary between RSC (React Server Components) and Client Components in your React codebase.

## Features

- **Automatic Detection**: Automatically identifies Client Component imports in your React components
- **Visual Markers**: Shows clear visual indicators (`Client Component`) next to Client Components

## How It Works

The extension scans your React files and marks any usage of Client Components (files with `"use client"` directive) with a visual indicator.

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
