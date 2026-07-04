# AeroNotch Project Guide for Claude

This file provides quick information about the project structure and tools used.

## Tech Stack

- **Package Manager**: `pnpm` (not npm/yarn)
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend**: Tauri 2 (Rust)
- **Testing**: Vitest
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: Zustand

## Key Scripts

- `pnpm dev`: Start Vite dev server
- `pnpm build`: Build for production
- `pnpm tauri dev`: Run Tauri app in dev mode
- `pnpm tauri build`: Build Tauri app for production
- `pnpm test`: Run Vitest tests
- `pnpm test:watch`: Run Vitest in watch mode

## Project Structure

- `src/`: React frontend code
- `src-tauri/`: Rust backend code
- `public/`: Static assets

## Important Notes

- Always use `pnpm` instead of `npm` or `yarn`
- Tauri commands should be prefixed with `pnpm tauri`
- Tests are run with `pnpm test`
