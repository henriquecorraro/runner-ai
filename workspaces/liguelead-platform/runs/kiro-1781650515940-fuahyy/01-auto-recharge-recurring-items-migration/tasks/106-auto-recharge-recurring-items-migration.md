---
id: auto-recharge-recurring-items-migration
title: Create auto_recharge_items table and consolidate recurring data
scope: auto-recharge-recurring-consolidation
status: open
repositories:
  - platform-api
validation:
  - npm run typecheck
  - npm run build
github_draft_issue_node_id: DI_lADOBpMd-c4BapTczgKofn8
github_project_item_id: 201178555
github_project_item_node_id: PVTI_lADOBpMd-c4BapTczgv9vbs
github_project_item_url: "https://github.com/orgs/ligue-lead-tech/projects/6?pane=issue&itemId=201178555"
github_project_status: Todo
---

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
