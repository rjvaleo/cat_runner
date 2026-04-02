# Lode Purrer 🐈🐟💨

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide_Icons-FFD700?style=for-the-badge&logo=lucide&logoColor=black)

**Lode Purrer** is a high-stakes, feline-themed reimagining of the classic _Lode Runner_. Play as a clever cat on a mission to collect every golden fish while outsmarting an escalating army of persistent dogs across 100 unique levels.

## 🌟 Key Features

- **100 Unique Levels**: 20 meticulously hand-crafted levels followed by 80 procedurally generated challenges.
- **Dynamic Difficulty**: Dogs increase in speed by **10% every 10 levels**.
- **The "Pee" Mechanic**: Press `P` to leave a puddle on the floor. Dogs that step in it are significantly slowed down, giving you time to escape.
- **AI-Powered Infinite Mode**: Once you pass level 100, the **Google Gemini API** takes over, generating infinite new levels with custom themes on the fly.
- **Cat Physics**: Precise double-jumping, climbing, and the ability to "claw" through bricks above you (`S` key).
- **Aesthetic Themes**: Visual styles evolve every 10 levels, culminating in a **Psychedelic RGB** finale for levels 91-100.

## 🛠️ Technical Stack

- **Framework**: [React 19](https://react.dev/) utilizing modern hooks (`useCallback`, `useRef`, `useEffect`) for a high-performance 60FPS game loop.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a responsive, modern UI with custom animations and glassmorphism effects.
- **Intelligence**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini SDK) for advanced procedural level generation and safety-checked grid layouts.
- **Icons**: [Lucide React](https://lucide.dev/) for crisp, scalable interface elements.
- **Audio**: Integrated SFX system for immersive feedback (Walking, Jumping, Barking, Gold Collection).
- **Engine**: Custom-built tile-based physics engine with gravity, terminal velocity, and sub-pixel collision detection.

## 🎮 Controls

| Action               | Key          |
| :------------------- | :----------- |
| **Move / Climb**     | `Arrow Keys` |
| **Double Jump**      | `Spacebar`   |
| **Pee (Slow Dogs)**  | `P`          |
| **Dig (Left/Right)** | `Z` / `X`    |
| **Claw (Above)**     | `S`          |

## 🌈 Level Themes

- **1-10**: Classic Amber (The Beginning)
- **11-20**: Azure Abyss (Icy Hues)
- **21-30**: Emerald Forest (Green)
- **31-40**: Royal Amethyst (Purple)
- **41-50**: Cyber Neon (Pink Glow)
- **51-60**: Autumn Blaze (Orange)
- **61-70**: Danger Zone (Red/Black Stripes)
- **71-80**: Shadow Deep (Blue/Black Stripes)
- **81-90**: Peppermint Path (Red/White Pinstripes)
- **91-100**: **Psychedelic RGB** (Animated cycling with black outlines)

## 🚀 Getting Started

**Run locally:**

```bash
npm install
npm run dev
```

**Build for production:**

```bash
npm run build
```

For AI level generation beyond level 100, create a `.env` file in the project root:

```
GEMINI_API_KEY=your_key_here
```

**GitHub Pages deployment** is handled automatically via GitHub Actions on every push to `main`. See [PORTING.md](./PORTING.md) for the full setup guide.

---

## 🔧 Porting from Google AI Studio

This project was originally exported from Google AI Studio. If you are porting another Studio project to run locally or deploy to GitHub Pages, see **[PORTING.md](./PORTING.md)** for a complete checklist of required changes.

---

_Created with ❤️ by a Senior Frontend Engineer & Cat Lover._
