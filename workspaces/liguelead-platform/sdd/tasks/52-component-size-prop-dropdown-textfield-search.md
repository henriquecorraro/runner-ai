---
id: component-size-prop-dropdown-textfield-search
title: "Add size prop to DropdownSelect, TextField and SearchInput"
scope: component-size-prop-dropdown-textfield-search
status: done
repositories:
  - platform-front
validation:
  - npm run lint
  - npm run build
---

# Goal

Add a `size` prop (`sm | md | lg`) to `DropdownSelect`, `TextField`, and the Table's `SearchInput` components to allow compact filter toolbars.

# Implementation

## Size values

- `sm`: min-height 32px, font-size 13px, padding 0 8px
- `md`: min-height 40px, font-size 14px, padding 0 12px (current default)
- `lg`: min-height 48px, font-size 14px, padding 0 16px

## DropdownSelect

- Add optional `size?: 'sm' | 'md' | 'lg'` prop (default `md`).
- Pass size to `DropdownTrigger` as a transient styled-prop `$size`.
- Adjust `min-height`, `padding`, and `font-size` in `DropdownTrigger` based on `$size`.

## TextField

- The `size` prop type already exists but is unused. Wire it to `InputWrap` as `$size`.
- Adjust `min-height`, `padding`, and `font-size` in `InputWrap` and `Input` based on `$size`.

## SearchInput (Table)

- Add optional `size?: 'sm' | 'md' | 'lg'` prop (default `md`).
- Adjust `min-height`, `padding`, and `font-size` in `SearchInputField` based on `$size`.

## Leads screen

- Pass `size="sm"` to all toolbar `DropdownSelect` components and the Table search input on the Leads page.
