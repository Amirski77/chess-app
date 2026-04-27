# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A web-based chess game with a reactive music soundtrack — nFactorial Incubator 2026 submission.
Submission deadline: Tuesday, April 28, 23:59 Almaty time.

Goal: solid "Strong" level chess app + reactive music as differentiator.

## Differentiator: Reactive Soundtrack

As the player plays, music dynamically responds to game state:

- Stockfish evaluation drives volume of layered audio tracks
- Captures, checks, and checkmate trigger sound events
- Goal: chess feels like an emotional experience, not a transaction

## Tech Stack (do not deviate without my approval)

- Next.js 14 with App Router
- TypeScript (strict mode)
- Tailwind CSS for styling
- chess.js — chess rules and move validation
- react-chessboard — board UI component
- stockfish.js — AI opponent and position evaluation
- howler.js — multi-layer audio playback with crossfading
- Supabase — authentication (email/password initially) and game history
- Vercel — deployment

## Coding Conventions

- TypeScript strict mode, avoid `any`
- Tailwind utility classes only, no CSS modules
- Server Components by default, `"use client"` only when needed
- File naming: PascalCase for components, camelCase for utilities
- Comments in English, concise, only when logic is non-obvious

## Strict Rules

- ALWAYS show your plan before changes touching more than one file
- DO NOT add libraries I haven't approved
- DO NOT modify `.env.local` — I will fill in keys myself
- DO NOT rewrite working code "for improvements" unless asked
- After each working feature: suggest a clear git commit message
- Mobile-first: verify everything works at 375px viewport width
- If something breaks: suggest `git reset` to last working state, don't patch over

## Files Claude Should Never Touch

- `.env.local`
- `node_modules`
- `.git` directory
- `public/audio` (I'll add music files manually)

## Workflow

- Small steps, one feature at a time
- After each step: I run `npm run dev` and verify in browser
- Commit after every working feature
