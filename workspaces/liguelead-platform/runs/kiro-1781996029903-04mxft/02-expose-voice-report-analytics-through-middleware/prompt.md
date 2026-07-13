You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: expose-voice-report-analytics-through-middleware
Title: Expose voice report analytics through middleware

Skill operating instructions:
- ENGLISH FIRST for ecosystem SDD artifacts: task files, titles, body text, textual frontmatter, Task Status entries, SDD README updates, run prompts, and output summaries must be written in English.
- Before editing code, read and follow the umbrella skill when it exists:
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-operating-mode/SKILL.md (global)
  - /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills/ecosystem-task-executor/SKILL.md (execution)
- If ecosystem-local skills exist in /home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/skills, inspect and follow them.
- If a listed skill path is missing, continue with the instructions already present in this prompt.

Execution goals:
- Execute the task below completely.
- Keep all centralized ecosystem SDD updates and the mandatory output file in English.
- Run the narrowest useful validation in each touched repository.
- Do not revert unrelated user changes.

Repositories and task:

## middleware
Repository label: Middleware API
Repository root: /home/rick/projetos/middleware

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/ updated when route contracts, auth strategies, backend targets, or operational behavior change.; Regenerate docs/public-api artifacts with npm run docs:openapi whenever route catalogs or Zod schemas change.
- Default validation: npm run build ; npm test ; npm run docs:openapi

### expose-voice-report-analytics-through-middleware
Task id: expose-voice-report-analytics-through-middleware
Task title: Expose voice report analytics through middleware
Task status: open
Task scope: broadcast-voice-report-analytics
Task validation: npm run build ; npm test ; npm run docs:openapi

```md
## Route contract

- Update the existing proxy contract for `GET /broadcasts/schedules/:id/report`.
- Preserve authentication, client scoping, backend target, path, and error passthrough.
- Add the following response fields without changing existing fields:

```ts
type VoiceReportAnalytics = {
  engagement: {
    totalDialed: number;
    answered: number;
    fullyListened: number;
    audioDurationSeconds: number | null;
    fullyListenedThresholdPercent: 90;
    answeredPercentOfDialed: number;
    fullyListenedPercentOfAnswered: number;
  };
  statusDistribution: Array<{
    key: "answered" | "not_answered" | "busy_congestion" | "invalid_no_route";
    label: string;
    total: number;
    percentOfDialed: number;
  }>;
};
```

## Constraints

- Update Zod schemas, inferred types, route fixtures, contract tests, and generated OpenAPI artifacts.
- Require nonnegative integer totals.
- Require percentages in `0..100`.
- Require `audioDurationSeconds` to be a positive integer or `null`.
- Require exactly `90` for `fullyListenedThresholdPercent`.
- Reject unsupported status keys; do not expose a separate voicemail/mailbox key.
- Do not calculate analytics in middleware.
- Do not rename or remove `summary`, `durationBuckets`, `timeline`, or `pauses`.
- Update repository-local API documentation.

## Validation

```bash
npm run build
npm test
npm run docs:openapi
```
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781996029903-04mxft/02-expose-voice-report-analytics-through-middleware/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: expose-voice-report-analytics-through-middleware
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
