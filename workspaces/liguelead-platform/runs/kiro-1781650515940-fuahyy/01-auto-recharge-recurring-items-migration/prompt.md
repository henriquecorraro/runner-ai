You are running one Ecosystem AI Runner task for a centralized ecosystem SDD.

Ecosystem: liguelead-platform
Task: auto-recharge-recurring-items-migration
Title: Create auto_recharge_items table and consolidate recurring data

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

## platform-api
Repository label: Platform API
Repository root: /home/rick/projetos/platform-api

Repository guidance:
- Docs hints: Keep repository-local human docs in docs/human aligned with module boundaries, routes, business rules, and operational behavior.
- Default validation: npm run typecheck ; npm test ; npm run build

### auto-recharge-recurring-items-migration
Task id: auto-recharge-recurring-items-migration
Task title: Create auto_recharge_items table and consolidate recurring data
Task status: open
Task scope: auto-recharge-recurring-consolidation
Task validation: npm run typecheck ; npm run build

```md
## Migration file

Create `migrations/016-create-auto-recharge-items.sql`:

```sql
CREATE TABLE IF NOT EXISTS `auto_recharge_items` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `auto_recharge_id` int unsigned NOT NULL,
  `credit_type_id` int unsigned NOT NULL,
  `recharge_amount` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_item_per_type` (`auto_recharge_id`, `credit_type_id`),
  KEY `idx_items_auto_recharge_id` (`auto_recharge_id`),
  CONSTRAINT `fk_items_auto_recharge` FOREIGN KEY (`auto_recharge_id`) REFERENCES `auto_recharges` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing recurring rules: consolidate per client into one rule per trigger_value (day)
-- For each group (client_id, trigger_value) with trigger_type='recurring', keep the one with the lowest id as the parent
-- and move all credit_type_id + recharge_amount pairs into auto_recharge_items

-- Step 1: Insert items for ALL existing recurring rules (each becomes an item of its parent)
INSERT INTO auto_recharge_items (auto_recharge_id, credit_type_id, recharge_amount)
SELECT
  parent.id AS auto_recharge_id,
  ar.credit_type_id,
  ar.recharge_amount
FROM auto_recharges ar
INNER JOIN (
  SELECT client_id, trigger_value, MIN(id) AS id
  FROM auto_recharges
  WHERE trigger_type = 'recurring' AND deleted_at IS NULL AND active = 1
  GROUP BY client_id, trigger_value
) parent ON parent.client_id = ar.client_id AND parent.trigger_value = ar.trigger_value
WHERE ar.trigger_type = 'recurring'
  AND ar.deleted_at IS NULL
  AND ar.active = 1
  AND ar.credit_type_id IS NOT NULL;

-- Step 2: Soft-delete duplicate recurring rules (keep only the parent per group)
UPDATE auto_recharges ar
INNER JOIN (
  SELECT client_id, trigger_value, MIN(id) AS keep_id
  FROM auto_recharges
  WHERE trigger_type = 'recurring' AND deleted_at IS NULL AND active = 1
  GROUP BY client_id, trigger_value
) parent ON parent.client_id = ar.client_id AND parent.trigger_value = ar.trigger_value
SET ar.deleted_at = NOW()
WHERE ar.trigger_type = 'recurring'
  AND ar.deleted_at IS NULL
  AND ar.active = 1
  AND ar.id != parent.keep_id;

-- Step 3: Nullify credit_type_id and recharge_amount on surviving recurring parent rows
-- (these values now live in auto_recharge_items)
UPDATE auto_recharges
SET credit_type_id = NULL, recharge_amount = 0
WHERE trigger_type = 'recurring'
  AND deleted_at IS NULL
  AND active = 1
  AND id IN (SELECT auto_recharge_id FROM auto_recharge_items);

-- Step 4: Migrate existing low_balance rules into auto_recharge_items too (1 item each)
INSERT IGNORE INTO auto_recharge_items (auto_recharge_id, credit_type_id, recharge_amount)
SELECT id, credit_type_id, recharge_amount
FROM auto_recharges
WHERE trigger_type = 'low_balance'
  AND deleted_at IS NULL
  AND active = 1
  AND credit_type_id IS NOT NULL;
```

## Sequelize model

Create `src/modules/auto-recharges/models/auto-recharge-item.model.ts`:

```typescript
import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { AutoRechargeModel } from "./auto-recharge.model";

@Table({
  tableName: "auto_recharge_items",
  underscored: true,
  timestamps: false,
})
export class AutoRechargeItemModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER.UNSIGNED)
  declare id: number;

  @ForeignKey(() => AutoRechargeModel)
  @AllowNull(false)
  @Column({ type: DataType.INTEGER.UNSIGNED, field: "auto_recharge_id" })
  declare autoRechargeId: number;

  @AllowNull(false)
  @Column({ type: DataType.INTEGER.UNSIGNED, field: "credit_type_id" })
  declare creditTypeId: number;

  @AllowNull(false)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: "recharge_amount" })
  declare rechargeAmount: number;

  @BelongsTo(() => AutoRechargeModel)
  declare autoRecharge: AutoRechargeModel;
}
```

## Update AutoRechargeModel

Add HasMany association to `AutoRechargeModel`:

```typescript
import { HasMany } from "sequelize-typescript";
import { AutoRechargeItemModel } from "./auto-recharge-item.model";

// Add inside the class:
@HasMany(() => AutoRechargeItemModel)
declare items: AutoRechargeItemModel[];
```

## Register model

Add `AutoRechargeItemModel` to the Sequelize model registration array in `src/infra/database/sequelize.ts` (or wherever models are registered).

## Constraints

- Do NOT remove `credit_type_id` or `recharge_amount` columns from `auto_recharges` table — low_balance still uses them as a single-item shortcut during the transition. They become redundant for recurring only.
- The migration must be idempotent (use IF NOT EXISTS, INSERT IGNORE where appropriate).
- After migration, all recurring auto_recharges must have their items in `auto_recharge_items` and no duplicates per client per day.
```

Mandatory output file:
/home/rick/projetos/ecosystem-ai-runner/ecosystems/liguelead-platform/runs/kiro-1781650515940-fuahyy/01-auto-recharge-recurring-items-migration/output.md

Before finishing, create that output file with this Markdown contract:

# Ecosystem AI Runner Output

- Status: success | blocked | failed
- Mode: centralized-ecosystem
- Task: auto-recharge-recurring-items-migration
- Repositories:
- Result:
- Validation:
- Docs Updated:
- Gaps:
- Needs Rework:
- Notes:

The output file must stay short and operational. After writing it, read it back before ending your response.
