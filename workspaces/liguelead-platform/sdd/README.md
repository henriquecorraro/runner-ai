# LigueLead Platform SDD

This ecosystem centralizes execution planning for the LigueLead platform repositories while keeping code and human documentation inside their owning repositories.

GitHub Project: platform-v2 - https://github.com/orgs/ligue-lead-tech/projects/3

## Structure

- `tasks/`: executable ecosystem tasks for this platform queue
- use the shared `ecosystem-task-factory` skill to create tasks later, intentionally

This bootstrap does not pre-create implementation tasks. Future work for this ecosystem should be created under `ecosystems/liguelead-platform/sdd/tasks/` through `ecosystem-task-factory`.

## Docs Quality Baseline

### platform-api

- score: `10/10`
- label: `docs-ready`
- evidence files read:
  - `README.md`
  - `docs/README.md`
  - `docs/human/README.md`
- missing areas:
  - no major baseline gaps found during bootstrap

### middleware

- score: `10/10`
- label: `docs-ready`
- evidence files read:
  - `README.md`
  - `docs/README.md`
  - `docs/architecture/README.md`
  - `docs/contracts-and-routes/README.md`
  - `docs/operations/README.md`
- missing areas:
  - no major baseline gaps found during bootstrap

### platform-front

- score: `7/10`
- label: `docs-partial`
- evidence files read:
  - `README.md`
  - `docs/README.md`
  - `docs/features/README.md`
  - `docs/sdd/README.md`
- missing areas:
  - document frontend architecture boundaries, route ownership, and shared state/query conventions more explicitly
  - add deeper behavioral docs for the lead and lead-list flows called out in the repository README
  - reconcile the top-level README scope with the broader feature set already listed under `docs/features`

## Task Status

1. `done` `broadcast-schedule-estimate-interaction-cost-cap`
   Aligns interactive voice estimation in `platform-api` with the maximum plausible single-interaction cost per lead and records the rule in human docs.

2. `done` `broadcast-schedule-estimate-middleware-contract`
   Aligns the middleware runtime schema with `audience.removeBlocklist` for broadcast schedule estimate and schedule routes.

3. `done` `platform-api-multi-database-connections`
   Adds bootstrap-ready connections for `areadocliente`, `dialer`, `dialer_mailings`, and `flow` in `platform-api`.

4. `done` `lead-list-upload-block-international-numbers`
   Adjusts lead-list upload processing so CSV uploads only register Brazilian numbers and treat international numbers as invalid rows.

5. `done` `document-broadcast-sms-legacy-mailing-flow`
   Document Broadcast SMS Legacy Mailing Flow

6. `done` `broadcast-schedule-submissions-analysis-status`
   Broadcast Schedule Honors Client Submissions Analysis Status

7. `done` `document-interactive-voice-runtime-flow`
   Document Interactive Voice Runtime Flow

8. `done` `broadcast-schedule-dialer-materialization`
   Extends the new broadcast scheduling flow so voice schedules also create `dialer.dialer_campaigns` and the dynamic queue table in `dialer_mailings`.

9. `done` `broadcast-sms-mailings-db-config`
   Configure dedicated sms_mailings database connection

10. `done` `materialize-sms-broadcast-mailing-table-on-schedule`
    Materialize SMS broadcast mailing table on schedule

11. `done` `move-sms-broadcast-mailing-population-to-async-worker-with-redis-progress`
    Move SMS broadcast mailing population to async worker with Redis progress

12. `done` `add-broadcast-schedules-screen-with-queue-loading-progress-and-status`
    Add broadcast schedules screen with queue loading progress and status

13. `done` `broadcast-schedule-balance-check-on-create`
    Check broadcast schedule balance during creation

14. `done` `broadcast-schedule-balance-error-middleware-contract`
    Expose broadcast schedule balance errors through middleware

15. `done` `broadcast-schedule-remove-cost-estimate-ui`
    Remove broadcast schedule cost estimate UI and handle balance failures

16. `done` `reduce-platform-api-auth-session-context-cache-ttl`
    Reduce platform-api auth session context cache TTL

17. `done` `interactive-voice-redis-interaction-queue-worker`
    Interactive Voice Redis Interaction Queue Worker

18. `done` `broadcast-sms-dispatch-worker-batch-billing`
    Broadcast SMS dispatch worker with batch billing

19. `done` `broadcast-sms-dispatch-postpaid-tariff-resolution`
    Resolve postpaid SMS tariff during broadcast batch billing

20. `done` `broadcast-sms-dispatch-payment-item-fees`
    Persist payment item id in broadcast SMS batch fees

21. `done` `broadcast-sms-dispatch-balance-reflection`
    Reflect broadcast SMS batch billing in credits and balance correctly

22. `done` `broadcast-postpaid-consume-balance-first`
    Cobrar broadcast postpaid consumindo saldo antes da regra pós-paga

23. `done` `cobrar-sms-com-vari-veis-pelo-tamanho-final-por-lead`
    Cobrar SMS com variáveis pelo tamanho final por lead

24. `done` `provisionar-cr-ditos-de-broadcasts-agendados-por-tipo`
    Provisionar créditos de broadcasts agendados por tipo

25. `done` `garantir-que-agendamento-considere-cr-ditos-provisionados`
    Garantir que agendamento considere créditos provisionados

26. `done` `broadcast-voice-start-worker`
    Iniciar broadcasts de ligacao agendados no dialer

27. `done` `broadcast-voice-close-and-billing-worker`
    Fechar broadcasts de ligacao e cobrar chamadas atendidas

28. `done` `corrigir-url-audio-em-intera-es-de-voz-interativa-no-platform-api`
    Corrigir url_audio em interações de voz interativa no platform-api

29. `done` `implementar-disparo-e-cobran-a-de-sms-de-intera-o-de-voz-no-platform-api`
    Implementar disparo e cobrança de SMS de interação de voz no platform-api

30. `done` `implement-interactive-voice-sms-dispatch-and-billing-in-platform-api`
    Implement interactive voice SMS dispatch and billing in platform-api

31. `done` `standardize-broadcast-blocklist-terminology`
    Standardize Broadcast Blocklist Terminology

32. `done` `middleware-internal-redis-token-auth`
    Add Middleware Internal Redis Token Authentication

33. `done` `platform-front-call-schedule-report-page`
    Replace call schedule reports modal with a dedicated page

34. `done` `platform-front-framer-motion-transitions`
    Add Framer Motion transitions to Platform Frontend views

35. `done` `add-lead-summary-metrics-for-the-leads-screen`
    Add lead summary metrics for the Leads screen

36. `done` `expose-lead-summary-metrics-through-the-middleware-contract`
    Expose lead summary metrics through the middleware contract

37. `done` `render-leads-screen-summary-cards-for-total-missing-email-and-blocked-leads`
    Render Leads screen summary cards for total, missing email, and blocked leads

38. `done` `leads-cursor-pagination-api`
    Add cursor-based pagination to leads listing endpoint

39. `done` `leads-cursor-pagination-middleware`
    Expose cursor-paginated leads listing through middleware

40. `done` `leads-cursor-pagination-frontend`
    Implement cursor-based pagination on Leads table

41. `done` `upload-blocklist-mark-duplicate-leads`
    Mark duplicate leads as blocklist during blocklist list upload

42. `done` `upload-enrich-duplicate-leads-from-csv`
    Enrich duplicate leads with missing fields from CSV upload

43. `done` `leads-table-source-column`
    Replace blocklist column with source column on Leads table

44. `done` `leads-listing-include-list-memberships`
    Include lead list memberships in leads listing response

45. `done` `leads-list-and-date-filters`
    Add list membership and date range filters to leads listing

46. `done` `list-merge-worker-api`
    List merge async worker with Redis progress

47. `done` `list-merge-middleware-contract`
    Expose list merge endpoints through middleware

48. `done` `list-merge-frontend-modal`
    Reusable list merge modal with progress feedback

49. `done` `broadcast-schedule-page-refactor`
    Convert broadcast schedule wizard from modal to dedicated page

50. `done` `normalize-lead-from-platform-to-client-platforms-table`
    Normalize lead from_platform field into client_platforms lookup table

51. `done` `leads-source-platform-filter`
    Add source platform filter to Leads listing screen

52. `done` `component-size-prop-dropdown-textfield-search`
    Add size prop to DropdownSelect, TextField and SearchInput

53. `done` `create-list-from-leads-filter`
    Create or populate list from active leads filter

54. `done` `sms-phone-verification-backend`
    SMS phone verification module for account creation

55. `done` `sms-phone-verification-frontend`
    SMS phone verification screen with countdown resend

56. `done` `credit-packages-catalog-api`
    Credit packages catalog and registration validation API

57. `done` `credit-packages-catalog-middleware`
    Expose credit packages and registration status through middleware

58. `done` `credit-packages-catalog-frontend`
    Credit packages catalog screen with registration guard

56. `open` `credit-packages-catalog-api`
    Credit packages catalog and registration validation API

57. `open` `credit-packages-catalog-middleware`
    Expose credit packages and registration status through middleware

58. `open` `credit-packages-catalog-frontend`
    Credit packages catalog screen with registration guard

59. `implemented` `rename-credits-entry-point-and-open-the-credits-area`
    Rename credits entry point and open the Credits area

60. `implemented` `build-the-initial-credits-overview-screen`
    Build the initial Credits overview screen

61. `implemented` `implement-credit-purchase-package-selection-rules`
    Implement credit purchase package selection rules

62. `implemented` `keep-credit-package-options-in-one-desktop-row`
    Keep credit package options in one desktop row

63. `open` `63-credit-card-vault-and-management-api`
    Implement credit-card vaulting and card management API

64. `open` `64-credit-purchase-card-payment-api`
    Implement credit purchase card-payment API flow

65. `done` `65-credit-payment-middleware-contracts`
    Expose credit payment and card routes through middleware

66. `done` `66-credit-purchase-payment-ui`
    Build credit purchase payment UI and card registration flow

67. `done` `67-credit-payment-reconciliation-and-observability`
    Add credit payment reconciliation and observability

68. `done` `purchase-history-api`
    Purchase history API endpoint for credit payments

69. `done` `purchase-history-order-detail`
    Purchase history order detail endpoint

70. `done` `purchase-history-frontend`
    Purchase history page in the frontend SPA

71. `done` `credit-charge-retry-button`
    Retry button for failed credit card charges

72. `implemented` `platform-front-auto-recharge-banner-ripple-entry`
    Build auto-recharge banner CTA with ripple entry

73. `implemented` `platform-front-auto-recharge-wizard-trigger-quantity`
    Build auto-recharge wizard trigger and quantity steps

74. `implemented` `platform-front-auto-recharge-card-submit-list-polish`
    Finish auto-recharge card step submit flow and rule list polish

75. `implemented` `platform-front-alert-feedback-foundation`
    Create shared alert feedback hook

76. `open` `platform-front-alert-feedback-login-page`
    Add alert feedback to Login page

77. `open` `platform-front-alert-feedback-register-page`
    Add alert feedback to Register page

78. `open` `platform-front-alert-feedback-verify-phone-page`
    Add alert feedback to Verify Phone page

79. `open` `platform-front-alert-feedback-leads-page`
    Add alert feedback to Leads page

80. `open` `platform-front-alert-feedback-lists-page`
    Add alert feedback to Lists page

81. `open` `platform-front-alert-feedback-list-leads-page`
    Add alert feedback to List Leads page

82. `open` `platform-front-alert-feedback-uploads-page`
    Add alert feedback to Uploads page

83. `open` `platform-front-alert-feedback-campaigns-page`
    Add alert feedback to Campaigns page

84. `open` `platform-front-alert-feedback-shortener-page`
    Add alert feedback to Link Shortener page

85. `open` `platform-front-alert-feedback-sms-page`
    Add alert feedback to SMS page

86. `open` `platform-front-alert-feedback-audios-page`
    Add alert feedback to Audios page

87. `open` `platform-front-alert-feedback-broadcasts-page`
    Add alert feedback to Broadcasts page

88. `open` `platform-front-alert-feedback-broadcast-schedule-wizard-page`
    Add alert feedback to Broadcast Schedule Wizard page

89. `open` `platform-front-alert-feedback-credits-page`
    Add alert feedback to Credits page

90. `open` `platform-front-alert-feedback-credit-purchase-page`
    Add alert feedback to Credit Purchase page

91. `open` `platform-front-alert-feedback-credit-history-page`
    Add alert feedback to Credit History page

92. `open` `platform-front-alert-feedback-complete-registration-page`
    Add alert feedback to Complete Registration page

93. `implemented` `platform-api-structured-error-handler`
    Add structured and performant platform-api error handling logs

94. `implemented` `platform-api-user-activity-audit-log`
    Add relational user activity audit log with Redis Stream batching

95. `done` `fix-repeat-purchase-custom-price-fallback`
    Fix CUSTOM_PRICE_NOT_FOUND on repeat purchase by falling back to package range pricing

96. `done` `add-trailing-newline-to-readme-in-all-repos`
    Add trailing newline to README in all repos

97. `done` `worker-orchestrator-infra`
    Worker orchestrator infrastructure

98. `done` `worker-extract-loops`
    Extract worker process-once loops from standalone workers

99. `done` `worker-orchestrator-background`
    Background orchestrator: audit-events + auto-recharges + mercadopago + lead-lists

100. `done` `worker-orchestrator-broadcast`
     Broadcast orchestrator: mailing + sms-dispatch + voice-close

101. `done` `worker-orchestrator-interactive`
     Interactive voice orchestrator: interactions + sms-dispatch

102. `done` `worker-orchestrator-infra-config`
     Update Makefile, docker-compose, and package.json for orchestrator workers

103. `open` `worker-orchestrator-prod-scripts`
     Add production entry-point scripts for orchestrator workers

104. `done` `lead-upload-s3-storage`
     Lead list upload: store CSV in S3 instead of local /tmp

105. `done` `lead-upload-csv-download`
     Lead list upload: download original CSV via backend proxy

106. `open` `auto-recharge-recurring-items-migration`
     Create auto_recharge_items table and consolidate recurring data

107. `open` `auto-recharge-recurring-api-refactor`
     Refactor auto-recharge API to support recurring with multiple items

108. `open` `auto-recharge-frontend-wizard-refactor`
     Refactor auto-recharge frontend wizard for recurring multi-product flow

109. `open` `auto-recharge-middleware-contracts-update`
     Update middleware auto-recharge contracts for recurring items

110. `open` `auto-recharge-ui-adjustments`
     Auto-recharge UI adjustments: colors, order, and quantity presets

111. `done` `ecosystem-runner-github-sync-validation-2026-06-18`
     Validate deterministic GitHub sync lifecycle

112. `done` `auto-recharge-low-balance-independent-processing`
     Keep low-balance auto-recharge processing independent per product

113. `done` `auto-recharge-low-balance-multi-product-wizard`
     Build one low-balance auto-recharge wizard for multiple products

114. `done` `auto-recharge-recurring-per-product-tariff-preview`
     Show per-product tariffs in recurring auto-recharge previews

115. `done` `auto-recharge-failure-message-and-new-card-retry`
     Auto Recharge Failure Message and New Card Retry

116. `done` `auto-recharge-real-db-validation-scenario`
     Auto Recharge Real Database Validation Scenario

117. `done` `auto-recharge-same-card-retry-action`
     Auto Recharge Same Card Retry Action

118. `done` `route-lead-summary-totals-through-areadocliente-replica`
     Route lead summary totals through areadocliente replica

119. `done` `fix-campaign-edit-dialog`
     Fix campaign edit dialog opening and update flow

120. `done` `fix-sms-short-link-nested-dialog-close`
     Fix SMS short-link nested dialog close behavior

121. `done` `fix-short-links-copy-button-active-visual-state`
     Fix short-links copy button active visual state

122. `done` `fix-short-link-dialog-shorten-submit`
     Fix short-link dialog shorten submit execution

123. `done` `fix-short-links-page-overlapping-layout`
     Fix short-links page overlapping layout

124. `done` `fix-sms-url-sanitization`
     Fix SMS URL sanitization when saving messages

125. `done` `animate-credit-package-cart-addition`
     Animate credit package addition in purchase summary

126. `done` `broadcast-schedule-report-header-api`
     Add broadcast schedule report header fields to API contracts

127. `done` `broadcast-schedule-report-header-ui`
     Build broadcast schedule report header in frontend

128. `done` `broadcast-schedule-report-header-middleware`
     Update middleware broadcast schedule report header contracts

129. `done` `broadcast-voice-report-kpis-api`
     Add voice report KPI fields to platform API

130. `done` `broadcast-voice-report-kpis-middleware`
     Expose voice report KPI fields in middleware contract

131. `done` `broadcast-voice-report-kpis-ui`
     Render voice report KPI fields in frontend schedule report

132. `done` `broadcast-report-metric-cards-and-charged-amount`
     Broadcast voice report metric cards and charged amount summary

133. `done` `implement-pause-and-resume-controls-for-running-voice-broadcasts`
     Implement pause and resume controls for running voice broadcasts

134. `done` `add-execution-timeline-and-pause-summary-to-voice-broadcast-reports`
     Add execution timeline and pause summary to voice broadcast reports

135. `done` `persist-voice-report-engagement-and-status-analytics`
     Persist voice report engagement and status analytics

136. `done` `expose-voice-report-analytics-through-middleware`
     Expose voice report analytics through middleware

137. `done` `render-voice-report-engagement-status-and-duration-charts`
     Render voice report engagement, status, and duration charts

138. `done` `replace-lambda-sms-dispatch-with-twilio-for-verification-sms`
     Replace Lambda SMS dispatch with Twilio for verification SMS

139. `done` `i18n-install-and-configure-i18next-with-language-detector`
     i18n: Install and configure i18next with language detector

140. `done` `i18n-create-locale-aware-formatters-helper`
     i18n: Create locale-aware formatters helper

141. `done` `i18n-create-language-selector-component-in-header`
     i18n: Create language selector component in Header

142. `done` `i18n-translate-shared-global-components-common-namespace`
     i18n: Translate shared global components (common namespace)

143. `done` `i18n-translate-auth-pages-login-register-verifyphone`
     i18n: Translate Auth pages (Login, Register, VerifyPhone)

144. `done` `i18n-translate-leads-page`
     i18n: Translate Leads page

145. `done` `i18n-translate-lists-tags-and-listleads-pages`
     i18n: Translate Lists (Tags) and ListLeads pages

146. `done` `i18n-translate-uploads-page`
     i18n: Translate Uploads page

147. `done` `i18n-translate-campaigns-page`
     i18n: Translate Campaigns page

148. `done` `i18n-translate-sms-page`
     i18n: Translate SMS page

149. `done` `i18n-translate-audios-page`
     i18n: Translate Audios page

150. `done` `i18n-translate-linkshortener-page`
     i18n: Translate LinkShortener page

151. `done` `i18n-translate-broadcasts-pages`
     i18n: Translate Broadcasts pages

152. `done` `i18n-translate-credits-pages-dashboard-purchase-history`
     i18n: Translate Credits pages (dashboard, purchase, history)

153. `done` `i18n-translate-completeregistration-page`
     i18n: Translate CompleteRegistration page

154. `done` `i18n-translate-integrations-pages`
     i18n: Translate Integrations pages

155. `done` `i18n-translate-remaining-hardcoded-strings-in-dialogs-and-shared-components`
     i18n: Translate remaining hardcoded strings in dialogs and shared components

156. `done` `sms-dispatch-totals-csv`
     SMS dispatch: populate total_send_sms and generate CSV report

157. `done` `sms-report-endpoint`
     SMS report endpoint: metrics from actions + timeline

158. `done` `sms-report-frontend`
     Frontend: SMS report view with cards, timeline and CSV download

159. `done` `sms-report-backfill-script`
     Script: backfill SMS report CSV for 2026 finished broadcasts

160. `done` `leads-page-add-delete-soft-delete-iconbutton-per-lead-row`
     Leads page: add delete (soft-delete) IconButton per lead row

161. `done` `list-leads-page-add-iconbutton-to-remove-lead-from-current-tag`
     List leads page: add IconButton to remove lead from current tag

162. `done` `campaigns-page-fix-search-to-filter-results-correctly`
     Campaigns page: fix search to filter results correctly

163. `done` `tags-page-display-tag-names-with-border-style-chips-matching-leads-page`
     Tags page: display tag names with border-style chips matching leads page

164. `done` `tags-page-fix-search-filtering-to-work-correctly`
     Tags page: fix search filtering to work correctly

165. `done` `schedules-page-replace-info-icon-with-chart-icon-for-completed-schedules`
     Schedules page: replace info icon with chart icon for completed schedules

166. `done` `sms-page-remove-activate-deactivate-option-keep-only-delete`
     SMS page: remove activate/deactivate option, keep only delete

167. `done` `audios-page-remove-activate-deactivate-option-keep-only-delete`
     Audios page: remove activate/deactivate option, keep only delete

168. `done` `fix-blocklist-list-association`
     Fix blocklist: associate leads with readonly blocklist list when marked as blocked

169. `done` `leads-page-add-block-unblock-iconbutton`
     Leads page: add block/unblock IconButton per lead row

170. `done` `broadcast-action-aggregate-report-api`
     Broadcast Action Aggregate Report API

171. `done` `broadcast-action-aggregate-report-middleware-contract`
     Broadcast Action Aggregate Report Middleware Contract

172. `done` `broadcast-action-report-page`
     Broadcast Action Internal Report Page

173. `done` `campaign-analytics-report-api`
     Implement campaign analytics report API

174. `done` `campaign-analytics-report-middleware-contract`
     Expose campaign analytics report middleware contract

175. `done` `campaign-analytics-report-page`
     Build campaign analytics report page

176. `done` `platform-api-opaque-session-login-logout`
     Implement Opaque Session Login and Logout in Platform API

177. `done` `middleware-opaque-session-auth-contract`
     Expose Platform Opaque Session Authentication Through Middleware

178. `done` `platform-front-opaque-session-login-logout`
     Keep Public ID Contract with Opaque Session Login and Logout

179. `done` `fix-leads-listing-use-index`
     Fix leads listing USE INDEX for general pagination

180. `done` `fix-leads-list-by-list-performance`
     Fix listByList query performance (570s → 28ms)

181. `done` `fix-leads-search-phone-only`
     Restrict leads search to phone only + conditional USE INDEX

182. `done` `account-user-management-api`
     Implement tenant-safe account user management API

183. `done` `account-user-management-middleware-contracts`
     Expose account user management through middleware contracts

184. `done` `account-user-management-frontend`
     Build account user management page

185. `done` `user-notification-preferences-and-delivery-core`
     Implement per-user notification preferences and channel delivery core

186. `done` `route-send-and-balance-events-through-notification-preferences`
     Route send and balance events through notification preferences

187. `done` `notification-preferences-middleware-contracts`
     Expose notification preference and user-scoped inbox contracts

188. `done` `notification-preferences-settings-ui`
     Add per-user notification channels to settings

189. `done` `add-save-only-action-to-broadcast-creation`
     Add save-only action to broadcast creation

190. `done` `enforce-csv-download-permissions`
     Enforce CSV download permissions

191. `done` `email-two-factor-authentication-api`
     Implement email two-factor authentication API

192. `done` `email-two-factor-authentication-middleware-contracts`
     Expose email two-factor authentication contracts

193. `done` `email-two-factor-authentication-frontend`
     Build email two-factor authentication settings and login challenge

194. `open` `broadcast-execution-progress-api`
     Broadcast schedule execution progress endpoint

195. `open` `broadcast-execution-progress-middleware`
     Middleware contract and route for execution progress

196. `open` `broadcast-execution-progress-frontend`
     Frontend execution progress UI for active broadcast schedules

197. `done` `rcs-verification-dispatch`
     RCS as primary verification channel with SMS fallback

198. `done` `rcs-agents-migration`
     RCS Agents: create database migration

199. `done` `rcs-agents-backend-module`
     RCS Agents: backend module with CRUD + file upload

200. `done` `rcs-agents-middleware-routes`
     RCS Agents: middleware proxy routes and contracts

201. `done` `rcs-agents-frontend`
     RCS Agents: frontend listing + multi-step registration form

202. `done` `rcs-agents-frontend-ds-refactor`
     RCS Agents: refactor frontend to use Design System components

203. `done` `simplify-rcs-agent-client-registration-fields`
     Simplify RCS agent client registration fields

204. `done` `platform-front-reusable-promotional-banner`
     Add reusable promotional banner dialog

205. `done` `limit-rcs-enablement-request-per-client`
     Limit RCS enablement requests to one per client

206. `done` `allow-rcs-retry-after-rejection`
     Allow a new RCS request after rejection

207. `done` `track-promotional-banner-engagement`
     Track promotional banner engagement across legacy and new platforms

208. `done` `tour-setup`
     Guided tour: feature scaffold and platform-level tour

209. `done` `tour-leads`
     Guided tour: Leads page

210. `done` `tour-tags`
     Guided tour: Tags and Tag Leads pages

211. `done` `tour-uploads`
     Guided tour: Uploads page

212. `done` `tour-campaigns`
     Guided tour: Campaigns page

213. `done` `tour-audios-sms`
     Guided tour: Audios and SMS pages

214. `done` `tour-broadcasts`
     Guided tour: Broadcasts pages (actions, schedules, form)

215. `done` `tour-shortener`
     Guided tour: Link Shortener page

216. `done` `tour-integrations`
     Guided tour: Integrations and Webhooks pages

217. `done` `tour-rcs`
     Guided tour: RCS Agents pages

218. `done` `tour-credits`
     Guided tour: Credits, Purchase, and History pages

219. `done` `tour-settings`
     Guided tour: Settings page

220. `done` `tour-rename-broadcast-template`
     Guided tour: rename broadcast to template, agendamentos to historico

221. `done` `tour-i18n`
     Guided tour: internationalize all tour step texts (pt-BR, en, es-ES)

222. `done` `client-dashboard-and-template-page-ux-polish`
     Polish Client Dashboard And Template Empty State

223. `done` `standardize-inline-form-error-alerts`
     Standardize Inline Form Error Alerts

224. `done` `broadcast-template-content-reference-integrity`
     Enforce Broadcast Template Content Reference Integrity

225. `done` `legacy-broadcast-template-backfill-preview`
     Preview Legacy Content To Broadcast Template Backfill

226. `done` `legacy-broadcast-template-backfill-materialize`
     Materialize Broadcast Templates From Recent Legacy Content

227. `done` `legacy-broadcast-template-backfill-link-schedules`
     Link Last-Year Legacy Schedules To Materialized Broadcast Templates

228. `done` `broadcast-template-content-creation-contract`
     Create Broadcast Template And Content As One Idempotent Operation

229. `done` `broadcast-template-inline-content-authoring`
     Unify Template And Sending Content Authoring In One Wizard

230. `done` `broadcast-template-navigation-consolidation`
     Consolidate Audio And SMS Navigation Into Templates

231. `done` `broadcast-template-unification-rollout-runbook`
     Validate And Roll Out Unified Broadcast Template Journey

232. `done` `broadcast-template-customer-journey-cutover`
     Cut Over Customer Content Creation To Unified Templates

233. `done` `broadcast-create-send-from-template`
     Create Send Directly From A Filtered Broadcast Template

234. `done` `broadcast-create-send-sidebar-active-state`
     Fix Create Send Sidebar Active State

235. `done` `mp-webhook-middleware-route`
     Add MercadoPago webhook proxy route to middleware

236. `done` `credit-orders-persist-user-id`
     Persist userId on payment creation for credit orders
