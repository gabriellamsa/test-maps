# Interactive Google Maps Integration

A modern, responsive Google Maps integration built with Next.js and TypeScript. This component provides a seamless way to implement interactive maps in your web applications.

## Features

- 🔍 Location search with Google Places Autocomplete
- 📍 Automatic geolocation detection
- 🎯 Interactive markers with animation
- 🎨 Clean, modern UI with Tailwind CSS
- 📱 Fully responsive design
- ⚡ Built with Next.js 15 and TypeScript

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- A Google Maps API key with Places API enabled

### Installation

1. Clone the repository:

```bash
git clone [your-repository-url]
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your Google Maps API key:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

4. Run the development server:

```bash
npm run dev
```

## Usage

The map component can be easily integrated into any Next.js application:

```tsx
import Map from "@/components/Map";

export default function YourPage() {
  return (
    <div className="container mx-auto">
      <Map />
    </div>
  );
}
```

## Environment Variables

| Variable                          | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Your Google Maps API key with Places API enabled |

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
