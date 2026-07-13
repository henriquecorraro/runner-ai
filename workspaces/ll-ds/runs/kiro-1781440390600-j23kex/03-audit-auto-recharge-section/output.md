# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: audit-auto-recharge-section
- Repositories: platform-front, design-system
- Result: Verdict **KEEP_IN_APP**. AutoRechargeSection is a heavily domain-specific component with embedded business logic, multiple app-specific API mutation hooks (useCreateAutoRechargeMutation, useDeleteAutoRechargeMutation, useRetryAutoRechargeMutation, useUpdateAutoRechargeMutation), app-specific queries (useCreditPackagesQuery, useSavedCardsQuery, useAutoRechargesQuery), app context hooks (useAppAlert), app service types (AutoRechargeRule, TriggerType, CreditPackage), app utilities (getApiErrorMessage, getCreditProductThemeByCreditTypeId), and app page styles (Credits.styles). No equivalent exists in the design-system. It is not a generic UI primitive.
- Validation: Code inspection confirms 7+ app-specific imports; verdict clearly stated as KEEP_IN_APP with concrete evidence.
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: Component is ~60KB of highly coupled domain logic managing auto-recharge wizard flows, CRUD operations, and credit package selection. Not extractable without a full rewrite separating logic from presentation.
