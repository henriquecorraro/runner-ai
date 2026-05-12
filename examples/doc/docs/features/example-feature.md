# Example Feature

This file is an example of a feature-level doc.

## Goal

Explain one feature in human terms so a contributor can change it safely.

## Affected Behavior

- receives user input
- validates required fields
- persists or forwards the resulting action
- exposes observable status for support and debugging

## Contracts To Keep In Sync

- request or form shape
- state transitions
- related logs or reports
- downstream integrations

## Maintenance Notes

- If the feature changes transport format, update the contract notes.
- If the feature changes state transitions, document the new allowed flow.
- If the feature depends on background processing, explain where failures surface.
