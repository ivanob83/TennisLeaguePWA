# Development Plan

Version: 1.0  
Status: Draft  
Last updated: 2026-02-21

---

## Overview

This document defines a sprint-based plan for building the Tennis League PWA.
The plan assumes 2-week sprints and targets the MVP scope.

---

## Sprint 0 - Preparation

- Confirm MVP scope and success criteria (done)
- Align domain terms across all docs (done)
- Repo setup (lint, format, commit conventions) (done)
- Initialize Laravel + Inertia + React skeleton (done)
- SQLite migrations and seed data
- Decide UI direction (kit or custom)

---

## Sprint 1 - Core Domain and Auth

- Models + migrations: League, Season, Player, Match, Round, Ranking, News
- CRUD for League and Season (Organizer)
- Auth + roles (Organizer/Player)
- Inertia layout, routing, basic pages

---

## Sprint 2 - Players and Scheduling

- CRUD for Player
- Register players into Season
- Create rounds and matches (manual)
- Schedule match date/time
- Basic validations (no self-match, unique round numbers)
- Views: schedule list and match detail

---

## Sprint 3 - Results and Rankings

- Record match results and update match state
- Ranking recalculation service
- Rankings view
- Audit trail for result changes

---

## Sprint 4 - News and PWA Baseline

- News CRUD and listing
- PWA manifest and service worker
- Offline cache for read-only views
- Notifications stub (no delivery yet)

---

## Sprint 5 - Stabilization and Release

- Edge cases (dispute, walkover placeholders)
- Tests: unit and feature (ranking + match flows)
- Query performance checks
- UI polish and accessibility pass
- Final documentation and release checklist

---

## Open Items

- Ranking algorithm details
- Offline conflict resolution specifics
- Notification delivery strategy
