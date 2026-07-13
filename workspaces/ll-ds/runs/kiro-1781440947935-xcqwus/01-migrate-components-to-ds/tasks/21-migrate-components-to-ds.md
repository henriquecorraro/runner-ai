---
id: migrate-components-to-ds
title: Migrate 5 DS-candidate components from platform-front to design-system
scope: ds-migration-audit
status: open
repositories:
  - design-system
  - platform-front
validation:
  - "npm run lint && npm run build passes on design-system"
  - "npm run lint && npm run build passes on platform-front"
  - All 5 components exported from design-system/src/package/components/index.ts
  - No remaining local copies of migrated components in platform-front/src/components/
depends_on:
  - audit-animated-check
  - audit-avatar
  - audit-dropdown-select
  - audit-loading
  - audit-motion
---

## Objective

Migrate 5 components from `platform-front/src/components/` to `design-system/src/package/components/`, then update platform-front to consume them from the DS package.

## Components to Migrate

| Component | Source Path | Target Path |
|-----------|------------|-------------|
| AnimatedCheck | `platform-front/src/components/AnimatedCheck/` | `design-system/src/package/components/AnimatedCheck/` |
| Avatar | `platform-front/src/components/Avatar/` | `design-system/src/package/components/Avatar/` |
| DropdownSelect | `platform-front/src/components/DropdownSelect/` | `design-system/src/package/components/DropdownSelect/` |
| Loading | `platform-front/src/components/Loading/` | `design-system/src/package/components/Loading/` |
| motion (AnimatedCard + Transition) | `platform-front/src/components/motion/` | `design-system/src/package/components/motion/` |

## Phase 1 — Migrate components into design-system

### 1. AnimatedCheck
- Copy files to DS
- Replace hardcoded color references with theme token props (use DS internal `resolveColor`)
- Add `size` prop (default: current hardcoded value)
- Export from `design-system/src/package/components/index.ts`

### 2. Avatar
- Copy files to DS
- Add configurable `size` prop (default: `36`)
- Export from `design-system/src/package/components/index.ts`

### 3. DropdownSelect
- Copy files to DS
- Replace hardcoded Portuguese strings with required props:
  - `searchPlaceholder: string`
  - `emptyText: string`
  - `noResultsText: string`
  - `loadingText: string`
  - `triggerLabel: string`
- Replace `resolveColor` import to use DS internal path (avoid circular import)
- Keep `action` slot pattern as-is (render prop)
- Export from `design-system/src/package/components/index.ts`

### 4. Loading
- Copy files to DS
- Remove hardcoded Portuguese `LOADING_COPY` — make `title` and `description` required props
- Replace variant names `auth`/`page` with generic names (`bordered`/`dashed` or `sm`/`lg`)
- Export from `design-system/src/package/components/index.ts`

### 5. motion (AnimatedCard + Transition)
- Copy files to DS
- Move `platform-front/src/motion/presets.ts` alongside components (or into DS foundation and export)
- Replace `@/motion/presets` path alias with relative or DS-internal import
- Add `framer-motion` as peerDependency in `design-system/src/package/package.json`
- Export from `design-system/src/package/components/index.ts`

## Phase 2 — Push design-system changes to branch v2

After all components are migrated and DS builds successfully:

```bash
cd /home/rick/projetos/design-system
git add .
git commit -m "feat: migrate AnimatedCheck, Avatar, DropdownSelect, Loading, motion from platform-front"
git push origin v2
```

## Phase 3 — Reinstall DS in platform-front

```bash
cd /home/rick/projetos/platform-front
npm install github:ligue-lead-tech/design-system#v2
```

This updates the lockfile to point to the latest v2 commit containing the new components.

## Phase 4 — Update platform-front imports

For each migrated component:
1. Delete the source files from `platform-front/src/components/<Component>/`
2. Update all imports across platform-front to use `@liguelead/design-system` instead of local path
3. For DropdownSelect: pass the Portuguese strings as props at each call site:
   - `searchPlaceholder="Buscar..."`
   - `emptyText="Nenhum item"`
   - `noResultsText="Nenhum resultado encontrado"`
   - `loadingText="Carregando..."`
   - `triggerLabel` — context-dependent, check each usage
4. For Loading: pass `title` and `description` props at each call site (use existing LOADING_COPY values)
5. For motion: update import path from `@/components/motion` to DS export

## Constraints

- Do NOT change component behavior or visual output — migration must be transparent
- Existing tests (if any) must pass after migration
- Do NOT add new dependencies to design-system besides `framer-motion` as peerDependency
- DS changes must be on branch `v2`
- platform-front installs DS via `github:ligue-lead-tech/design-system#v2`

## Validation

Run in order:
```bash
cd /home/rick/projetos/design-system && npm run lint && npm run build
git -C /home/rick/projetos/design-system push origin v2
cd /home/rick/projetos/platform-front && npm install github:ligue-lead-tech/design-system#v2
cd /home/rick/projetos/platform-front && npm run lint && npm run build
```
