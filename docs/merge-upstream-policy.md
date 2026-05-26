# Upstream Merge Policy

## Purpose

This document defines the automated conflict resolution rules for merging upstream changes
from `QuantumNous/new-api` into our fork (`Banezzz/new-api`).

It is read by the CI agent (`scripts/resolve-merge-conflicts.mjs`) when upstream has new
commits and `git merge upstream/main` produces conflicts.

---

## General Principles

1. **Bug fixes and security patches** → adopt upstream
2. **Custom features (Infini, EZPay, branding)** → keep ours
3. **New upstream features** → adopt, unless they conflict with our customizations
4. **When uncertain** → keep both sides, verify build
5. **Never remove upstream's new functionality** — only override when we have our own version

---

## Payment Gateways

### Always Keep OURS

These are our custom additions that upstream does not have. Any conflict touching these
code paths MUST keep our version:

- **Infini backend**: files matching `*infini*` in `controller/`, `setting/`, `model/`
- **Infini frontend (classic)**: `SettingsPaymentGatewayInfini.*`, `PaymentSetting.jsx`
  (Infini state fields, Infini tab, Infini switch cases)
- **Infini frontend (default)**: `infini-settings-section.*`, `subscription-purchase-dialog.tsx`
  (Infini imports, `hasInfini`, `handlePayInfini`), `subscription-plans-card.tsx`
  (`getInfiniMethods`, `infiniMethods`), `payment-settings-section.tsx`
  (`infiniDefaultValues`, `InfiniSettingsSection`)
- **EZPay backend**: same pattern as Infini, replace `infini` → `ezpay`
- **EZPay frontend**: same pattern as Infini, replace `Infini` → `Ezpay`
- **Routes**: `router/api-router.go` — keep our `/infini/pay`, `/ezpay/pay` routes
  alongside upstream's `/waffo-pancake/pay`
- **GetTopUpInfo data struct**: `controller/topup.go` — keep both our `enable_infini_topup`
  / `enable_ezpay_topup` fields AND upstream's `enable_redemption` /
  `payment_compliance_confirmed` / `payment_compliance_terms_version`

### Keep BOTH (merge sides)

When upstream adds new payment features AND we have our own, include both:

- `controller/topup.go` `GetTopUpInfo` — include all payment enablers from both sides
- `router/api-router.go` subscription routes — include all payment routes
- `web/classic/.../SubscriptionsTable.jsx` — keep both `enableInfini` AND
  `complianceConfirmed` props
- `web/classic/.../SubscriptionsColumnDefs.jsx` — keep both `enableInfini` AND
  `complianceConfirmed` parameters
- `web/classic/.../subscriptions/index.jsx` — keep both `enableInfini` state AND
  `complianceConfirmed` state + Banner

### Adopt Upstream

- New payment compliance system (`controller/payment_compliance.go`, compliance UI)
- Waffo Pancake subscription payment (new from upstream)
- Balance purchases feature
- Bug fixes to shared payment code (Stripe, Creem, Epay, Waffo)

---

## Frontend — Classic (`web/classic/`)

### Always Keep OURS

- **Home page** (`pages/Home/index.jsx`) — custom redesign with data stream particle
  field, floating orbs, mouse tracking. Any conflict in this file → keep ours.
- **Footer** (`components/layout/Footer.jsx`) — simplified version, upstream branding
  removed. Upstream adds a large branded footer section → keep ours (empty conflict = do
  not insert upstream's footer).
- **Navigation rail layout** — our structural redesign
- **Violet theme** — our theme foundation

### Keep BOTH

- **i18n locale files** (`en.json`, `fr.json`, `ja.json`, `ru.json`, `vi.json`,
  `zh-CN.json`, `zh-TW.json`) — merge all translation keys from both sides. When a
  conflict is a block of new keys on each side, include both blocks.

### Adopt Upstream

- Bug fixes to shared components (SiderBar, InvitationCard, RechargeCard, etc.)
- New UI features that don't conflict with our redesign
- Compliance UI (RiskAcknowledgementModal, etc.)

---

## Frontend — Default (`web/default/`)

### Always Keep OURS

- Overall UI redesign (navigation rail, violet theme, etc.)
- Our custom payment UI components

### Keep BOTH

- `subscription-purchase-dialog.tsx` — include all payment method imports (`paySubscriptionInfini`,
  `paySubscriptionEzpay`, `paySubscriptionWaffoPancake`, `paySubscriptionBalance`) and
  all payment detection (`hasInfini`, `hasEzpay`, `hasWaffoPancake`) in `hasAnyPayment`
- `subscriptions/types.ts` — include all payment response fields from both sides
  (`payment_url`, `trade_no`, `actual_amount` from ours + `session_id`, `expires_at`,
  `token`, `token_expires_at` from upstream)

### Adopt Upstream

- UI component library updates (shadcn/ui, etc.)
- New features (Waffo Pancake subscription UI, compliance dialog, etc.)
- Bug fixes to shared components
- `_sync-report.json` — keep ours (reflects our translation state)
- `zh.untranslated.json` — accept upstream's deletion

---

## Backend (Go)

### Always Keep OURS

- Custom payment handlers (Infini, EZPay)
- Custom payment settings in `setting/`

### Adopt Upstream

- Relay/channel bug fixes (`relay/channel/*`)
- New features (performance metrics, channel affinity, header nav, etc.)
- Security patches
- New Go files from upstream (new controllers, services, etc.)
- `go.mod` / `go.sum` — always adopt upstream's version
- `Dockerfile` — adopt upstream's improvements

---

## Infrastructure

### Adopt Upstream

- `Dockerfile`, `Dockerfile.dev` improvements
- `go.mod`, `go.sum` updates
- CI/CD workflow improvements
- New license files (`NOTICE`, `THIRD-PARTY-LICENSES.md`)

### Keep OURS

- `README*` — our branding
- `docker-compose.prod.yml` — our production config
- `docs/installation/` — our deployment docs

---

## Handling Novel Conflicts

When encountering a conflict NOT covered by the specific rules above:

1. **Is it a bug fix?** → adopt upstream
2. **Is it a custom feature unique to our fork?** → keep ours
3. **Is it a new feature from upstream?** → adopt upstream
4. **Is it a refactor?** → adopt upstream, unless it touches our custom code
5. **Still unsure?** → keep both sides, flag for human review in PR description

---

## Post-Resolution Verification

After resolving ALL conflicts, the agent MUST:

1. Run `go build -o /dev/null .` to verify backend compiles
2. Run `git diff --check` to verify no conflict markers remain
3. Verify JSON files are valid (i18n locale files, config files)
4. If any check fails → exit with error, do NOT create PR
