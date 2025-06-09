
# Valorwell Client Portal

A React-based client portal application that can be run as a standalone app or consumed as a micro-frontend module.

## Project info

**URL**: https://lovable.dev/projects/e3e17a11-5778-4ffa-9bb2-28525054bb7d

## Dual Mode Operation

This application supports two modes of operation:

### 1. Standalone Mode (Development)
Run the portal as an independent application for development:

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### 2. Micro-Frontend Module Mode
Build the portal as a module for consumption by a shell application:

```sh
# Install dependencies
npm install

# Build as library/module
npm run build:lib
```

This outputs `dist/valorwell-portal.js` which can be consumed by a shell application.

## Micro-Frontend Integration

### Consuming the Module

```typescript
import { ValorwellPortal } from './path/to/valorwell-portal.js';

// Basic usage
<ValorwellPortal />

// With configuration
<ValorwellPortal 
  basePath="/portal" 
  supabaseUrl="https://your-project.supabase.co"
  supabaseKey="your-anon-key"
  onAuthStateChange={(user, session) => {
    console.log('Auth state changed:', user, session);
  }}
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `basePath` | `string` | `''` | Base path for routing (e.g., `/portal`) |
| `supabaseUrl` | `string` | `undefined` | Supabase project URL |
| `supabaseKey` | `string` | `undefined` | Supabase anon key |
| `onAuthStateChange` | `function` | `undefined` | Callback for auth state changes |

### Environment Variables

Create a `.env` file based on `.env.example`:

```sh
cp .env.example .env
```

The following environment variables are supported:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

## Configuration Priority

The application resolves Supabase configuration in the following order:

1. **Runtime props** (highest priority) - passed to `ValorwellPortal` component
2. **Environment variables** - from `.env` file or environment
3. **Fallback values** (lowest priority) - hardcoded development values

## Development Workflow

### Local Development
```sh
npm run dev
```

### Building for Production (Standalone)
```sh
npm run build
```

### Building as Module
```sh
npm run build:lib
```

### Type Checking
```sh
npm run type-check
```

## Technologies

This project is built with:

- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **React** - UI framework
- **React Router** - Client-side routing
- **Supabase** - Backend and authentication
- **shadcn-ui** - Component library
- **Tailwind CSS** - Styling
- **Tanstack Query** - Data fetching

## Architecture

### Standalone Mode
```
App.tsx (BrowserRouter + AuthProvider + Routes)
├── Public Routes (/, /login, /signup)
├── Protected Routes (/dashboard, /profile, etc.)
└── Auth Protected Routes with role checks
```

### Module Mode
```
ValorwellPortal (exported component)
├── Configurable basePath for routing
├── Runtime Supabase configuration
├── Auth state callbacks for shell integration
└── Same route structure as standalone
```

## Authentication

The portal uses Supabase authentication with:

- Email/password login and signup
- Password reset functionality
- Role-based access control
- Session persistence
- Auth state synchronization with shell apps (in module mode)

## Deployment

### Standalone Deployment
Deploy the built assets from `npm run build` to any static hosting service.

### Module Deployment
1. Build the module: `npm run build:lib`
2. Publish the `dist/valorwell-portal.js` file
3. Import and use in your shell application

## Custom Domains

For custom domains, refer to the [Lovable documentation](https://docs.lovable.dev/tips-tricks/custom-domain/).

## Support

For issues and questions, please refer to the project documentation or contact the development team.
