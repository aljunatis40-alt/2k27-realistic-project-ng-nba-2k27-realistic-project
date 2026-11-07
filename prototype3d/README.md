# 3D prototype foundation

This folder is an isolated Three.js + TypeScript starter. It does not replace the root 2D playable prototype.

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Local development
```bash
cd prototype3d
npm install
npm run dev
npm run build
```

## Included starter modules
- Typed gameplay event bus
- Fixed-step-ready ball physics
- Broadcast camera profiles
- Rolling replay snapshot buffer
- Priority commentary queue
- Tagalog/English localization
- Instanced crowd foundation

These are starter modules, not a complete game. They require integration into a Three.js scene, player controller, authoritative MatchState, asset pipeline, and Android device testing.
