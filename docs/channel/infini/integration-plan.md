# Infini 接入计划

基于当前仓库本地实现整理，不依赖上游开源项目默认教程。

## 1. 当前本地支付网关结构

- 充值支付入口在 [controller/topup.go](/home/dev/new-api/controller/topup.go:25)，`GetTopUpInfo` 负责把已启用渠道、最低金额、子支付方式等下发到前端。
- 支付路由集中在 [router/api-router.go](/home/dev/new-api/router/api-router.go:49)。
- 支付设置统一落在 [model/option.go](/home/dev/new-api/model/option.go:76) 初始化，并在 [model/option.go](/home/dev/new-api/model/option.go:354) 做运行时分发。
- 用户侧充值发起逻辑在 [web/src/components/topup/index.jsx](/home/dev/new-api/web/src/components/topup/index.jsx:117)。
- 订阅支付入口目前只内建 Stripe/Creem/Epay；套餐模型里只有 `StripePriceId` 和 `CreemProductId` 两个 provider 专用字段，见 [model/subscription.go](/home/dev/new-api/model/subscription.go:145)。

## 2. Infini 能力与本地结构的匹配结论

- 充值场景非常适合接入当前网关。
  Infini 的主路径是 `创建订单 -> 跳转 checkout_url -> Webhook 回调 -> 查询订单兜底`，和当前 Stripe/Waffo 这类跳转型渠道的模式一致。
- 订阅场景可以接，但不能直接照搬现有 Stripe/Creem 的字段设计。
  Infini 订阅接口不需要预建 `price_id/product_id`，而是直接提交金额、周期、邮箱、invoice 参数。
- 当前本地订阅完成逻辑本质上还是“首单成功后创建一条本地订阅记录”，见 [model/subscription.go](/home/dev/new-api/model/subscription.go:508)。
  仓库里没有现成的“续费 webhook -> 延长订阅周期”处理链路，所以 Infini 的 `subscription.update` 如果要真正支持自动续费，需要补一层新的续费语义。

## 3. 建议分阶段接入

### Phase A：先把 Infini 充值接入完整

1. 新增 provider 配置与开关

- 新建 `setting/payment_infini.go`。
- 在 `model/option.go` 注册并分发以下 Option Key：
  - `InfiniEnabled`
  - `InfiniBaseURL`
  - `InfiniSandboxBaseURL` 或 `InfiniUseSandbox`
  - `InfiniKeyId`
  - `InfiniSecretKey`
  - `InfiniWebhookSecretOrPublicKey`
  - `InfiniMerchantAlias`
  - `InfiniSuccessUrl`
  - `InfiniFailureUrl`
  - `InfiniMinTopUp`
  - `InfiniUnitPrice`
  - `InfiniPayMethods`
- 这里延续现有做法：敏感字段只写不回显。

2. 新增 provider 常量与状态入口

- 在 `model/topup.go` 增加 `PaymentMethodInfini = "infini"`。
- 在 `controller/payment_webhook_availability.go` 增加：
  - `isInfiniTopUpEnabled`
  - `isInfiniWebhookConfigured`
  - `isInfiniWebhookEnabled`
- 在 [controller/topup.go](/home/dev/new-api/controller/topup.go:25) 的 `GetTopUpInfo` 中把 Infini 注入 `pay_methods` 和 `enable_infini_topup`。

3. 新增 Infini API 客户端

- 建议新建 `service/infini.go` 或 `service/infini/client.go`。
- 统一封装：
  - `Date` header 生成
  - `Digest` 计算
  - `Authorization` HMAC 计算
  - `CreateOrder`
  - `QueryOrder`
  - `ReissueCheckoutToken`
- 所有 JSON 编解码必须走 `common.Marshal` / `common.Unmarshal`，不要直接用 `encoding/json`。

4. 新增充值控制器

- 新建 `controller/topup_infini.go`。
- 参考 Stripe/Waffo 流程：
  - 校验最小充值金额
  - 计算本地应收金额
  - 先创建本地 `TopUp` pending 订单
  - 调用 `POST /v1/acquiring/order`
  - 返回 `checkout_url`
- 本地订单建议：
  - `trade_no` 继续用本地唯一单号
  - `client_reference` 直接传本地 `trade_no`
  - `request_id` 使用独立 UUID，满足 Infini 幂等要求

5. 新增 webhook 控制器

- 路由新增：
  - `/api/infini/webhook`
  - `/api/user/infini/pay`
  - 如果保留金额预估接口风格，再加 `/api/user/infini/amount`
- webhook 处理建议映射：
  - `order.processing`：本地维持 `pending`
  - `order.completed`：本地转 `success`
  - `order.expired` + `status=expired/partial_paid`：本地转 `expired`
  - `order.late_payment`：需要单独定策略，见“待确认问题”
- 优先按 `client_reference` 找本地订单；拿不到时再查 `order_id` 映射。
- 使用 `X-Webhook-Event-Id` 做幂等去重。

6. 前端设置页与用户充值入口

- 后台设置页新增 `web/src/pages/Setting/Payment/SettingsPaymentGatewayInfini.jsx`。
- 用户侧充值入口沿用 [web/src/components/topup/index.jsx](/home/dev/new-api/web/src/components/topup/index.jsx:194) 的模式：
  - 在 `preTopUp` / `onlineTopUp` 中分支处理 `infini`
  - 结果直接 `window.open(checkout_url, '_blank')`
- 充值历史支付方式展示要补 `infini`，位置在 [web/src/components/topup/modals/TopupHistoryModal.jsx](/home/dev/new-api/web/src/components/topup/modals/TopupHistoryModal.jsx:39)。

### Phase B：把 Infini 接到“当前本地订阅体系”的同等能力

1. 先实现“首单订阅购买”

- 新建 `controller/subscription_payment_infini.go`。
- 新路由：
  - `/api/subscription/infini/pay`
- 请求时用本地套餐字段组装 `POST /v1/acquiring/subscription`：
  - `amount` <- `plan.PriceAmount`
  - `merchant_sub_id` <- 本地唯一订阅单号或稳定业务 ID
  - `plan_name` <- `plan.Title`
  - `payer_email` <- 当前用户邮箱
  - 周期 <- 本地套餐 duration 映射
- 订阅首单成功后，仍复用 [model/subscription.go](/home/dev/new-api/model/subscription.go:508) 的 `CompleteSubscriptionOrder` 逻辑落本地。

2. 为套餐补 Infini 专用配置

- 当前套餐模型只有 `StripePriceId` / `CreemProductId`，不适合 Infini。
- 建议新增字段至少包含：
  - `InfiniEnabled` 或 `InfiniSubscriptionEnabled`
  - `InfiniInvoiceLeadDays`
  - `InfiniInvoiceDueDays`
  - `InfiniPayMethods`
- 否则前端无法像现在这样“按套餐控制是否显示某个支付按钮”。

3. 前端订阅购买弹窗补 Infini

- 入口在 [web/src/components/topup/modals/SubscriptionPurchaseModal.jsx](/home/dev/new-api/web/src/components/topup/modals/SubscriptionPurchaseModal.jsx:68)。
- 当前逻辑只认：
  - Stripe: `stripe_price_id`
  - Creem: `creem_product_id`
  - Epay: 全局开关 + methods
- Infini 需要补一套新的“是否显示按钮”判断和点击处理。

### Phase C：如果要支持“真正的自动续费”，再补续费生命周期

- 当前仓库里没有现成的 recurring renewal webhook 处理。
- Infini 的 `subscription.update` / `subscription.cancel` 不能只当作“首单购买完成”的替代品。
- 如果要完整支持自动续费，需要新增：
  - 订阅远端 ID 与本地 `UserSubscription` 的映射
  - 周期续费到账后的延长/重置逻辑
  - 取消订阅后的本地状态同步
  - 历史续费账单记录

## 4. 关键差异与风险

1. Webhook 验签资料描述不一致

- 文档一处写的是 `X-Webhook-Signature` HMAC-SHA256。
- 另一处写“后台会展示 Webhook 公钥用于验签”。
- HMAC 和“公钥验签”是两套不同模型，编码前必须确认真实规则。

2. 事件名文档存在不一致

- 文本描述里同时出现了 `order.create` 和 `order.created`。
- 示例 payload 里是 `order.create`。
- 这个需要以真实 webhook 为准。

3. `expires_in` 描述存在歧义

- 文档写“相对时间”，但又写“Unix 秒”。
- 落代码前最好用沙盒实际请求确认它是“秒数偏移”还是“绝对时间戳”。

4. Infini 订阅周期能力小于本地套餐模型

- Infini 订阅只支持 `DAY` / `MONTH`。
- 本地套餐支持 `year/month/day/hour/custom`。
- `hour/custom` 不能直接映射，`year` 需要折算成 `MONTH * 12`。

5. OpenAPI bundle 不含订阅接口

- `openapi.json/yaml` 覆盖了 currency/fund/order/payment。
- 订阅接口只出现在文档章节 `6-api-ducumentation.md`，实现时要以该文档为准。

## 5. 推荐实施顺序

1. 先完成 Phase A，让 Infini 充值可用。
2. 再完成 Phase B，让 Infini 出现在订阅购买入口，但先只保证“首单购买”与当前本地逻辑对齐。
3. 如果业务确实需要自动续费，再做 Phase C。

## 6. 已保存的参考资料

- 文档镜像目录：`docs/channel/infini/`
- 下载清单：`docs/channel/infini/url-list.txt`
- 抓取说明：`docs/channel/infini/README.md`
