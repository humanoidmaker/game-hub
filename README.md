# GameHub — 111 Free Browser Games

A standalone web application featuring 111 browser games across 9 categories, all running client-side with zero backend required.

## Features

- **111 Games** across 9 categories: Board, Card, Puzzle, Arcade, Sports, Party, Strategy, Music, Idle
- **Zero backend** — all games run entirely in the browser
- **Code-split loading** — each game loads on demand via dynamic import
- **Recently played** tracking (localStorage)
- **High scores** saved locally per game
- **Fullscreen mode** for immersive gameplay
- **Search & filter** by category
- **Mobile responsive** — touch controls on all games

## Games Include

- Chess, Checkers, Ludo, Snakes & Ladders, Carrom
- Solitaire, Blackjack, Poker, Memory Match
- Sudoku, Minesweeper, 2048, Word Guess
- Snake, Tetris-style Block Stack, Bubble Shooter
- Cricket, Basketball, Bowling, Archery
- Trivia, Hangman, Typing Speed
- Tower Defense, Dungeon Crawler
- And 90+ more...

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS (dark theme)
- React Router v6
- Canvas API for game rendering
- Web Audio API for sound effects
- No backend, no database, no API calls

## Setup

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Build

```bash
npm run build
# Output in dist/ — serve with any static file server
```

## Deploy

Can be deployed as a static site (Vercel, Netlify, nginx) or via Docker:

```bash
docker build -t game-hub .
docker run -p 3000:3000 game-hub
```
