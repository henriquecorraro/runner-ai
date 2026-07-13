# Ecosystem AI Runner Output

- Status: success
- Mode: centralized-ecosystem
- Task: audit-sidebar
- Repositories: platform-front, design-system
- Result: Verdict is KEEP_IN_APP. The Sidebar component is domain-specific: it hardcodes app routes (/campaigns, /leads, /broadcasts, etc.), imports app branding assets (@/assets/logo.png), embeds business logic (hasApprovedPurchase conditional filtering), and tightly couples to react-router-dom NavLink with app-specific path matching. No equivalent exists in the design-system.
- Validation: Code inspection of all 3 files in src/components/Sidebar/; grep for Sidebar in design-system returned zero matches.
- Docs Updated: none
- Gaps: none
- Needs Rework: no
- Notes: The styled primitives (MenuContainer, SidebarSection, etc.) could theoretically be extracted as a generic navigation shell, but the component as-is is not a DS candidate without a full redesign separating structure from content.
