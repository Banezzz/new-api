# Infini 集成状态与后续计划

本文基于当前仓库实现和 Infini 最新文档镜像整理：

- [托管收银台 API 文档](./docs/zh/6-api-ducumentation.md)
- [支持的公链与测试网络说明](./docs/zh/11-supported-chains.md)
- [Infini 在 new-api 中的配置说明](./new-api-config.md)

## 1. 当前实现状态

当前实现已经把 Infini 接入本地支付体系，覆盖用户充值和本地订阅套餐首单购买。

### 1.1 已接入的后端能力

- 配置项在 [setting/payment_infini.go](/home/dev/new-api/setting/payment_infini.go) 中定义。
- 支付开关和 webhook 可用性判断在 [controller/payment_webhook_availability.go](/home/dev/new-api/controller/payment_webhook_availability.go) 中处理。
- Infini API 客户端在 [service/infini.go](/home/dev/new-api/service/infini.go) 中实现，包含：
  - HMAC-SHA256 请求签名
  - `Digest` 头生成
  - `CreateOrder`
  - `QueryOrder`
  - `ReissueOrderToken`
  - Webhook HMAC 验签
- 充值入口在 [controller/topup_infini.go](/home/dev/new-api/controller/topup_infini.go) 中实现：
  - `/api/user/infini/amount`
  - `/api/user/infini/pay`
  - `/api/infini/webhook`
- 订阅套餐购买入口在 [controller/subscription_payment_infini.go](/home/dev/new-api/controller/subscription_payment_infini.go) 中实现：
  - `/api/subscription/infini/pay`

所有 JSON 编解码必须继续走 `common.Marshal` / `common.Unmarshal`。

### 1.2 已接入的前端能力

- 后台支付设置页已经包含 Infini 设置区块：
  - [web/default/src/features/system-settings/integrations/infini-settings-section.tsx](/home/dev/new-api/web/default/src/features/system-settings/integrations/infini-settings-section.tsx)
- 用户充值入口已经识别 `infini` 前缀支付方式：
  - [web/default/src/features/wallet/lib/payment.ts](/home/dev/new-api/web/default/src/features/wallet/lib/payment.ts)
  - [web/default/src/features/wallet/hooks/use-payment.ts](/home/dev/new-api/web/default/src/features/wallet/hooks/use-payment.ts)
- 订阅购买弹窗已经包含 Infini 支付：
  - [web/default/src/features/subscriptions/components/dialogs/subscription-purchase-dialog.tsx](/home/dev/new-api/web/default/src/features/subscriptions/components/dialogs/subscription-purchase-dialog.tsx)

## 2. 最新 Infini 文档对当前实现的影响

### 2.1 `pay_methods` 扩展不需要代码变更

新版文档把托管收银台订单的 `pay_methods` 从原来的加密货币和卡支付扩展为：

| 值 | 含义 |
| --- | --- |
| `1` | 加密货币 |
| `2` | 卡支付 |
| `3` | Binance Pay |
| `5` | Apple Pay |
| `6` | Google Pay |

当前代码不需要改：

- `InfiniCreateOrderRequest.PayMethods` 使用 `omitempty`。
- 默认 `Infini` 支付入口没有配置 `pay_methods`，因此创建订单时会省略该字段。
- 字段省略后，Infini 会使用商户后台配置的默认支付方式，能自然吃到后台已开启的全部方式。
- 管理员如果想拆出独立入口，可以在 `InfiniPayMethods` 中配置 `[1]`、`[2]`、`[3]`、`[5]`、`[6]` 或组合值。

因此这次只需要更新 [new-api-config.md](./new-api-config.md) 的推荐配置说明。

### 2.2 新增 `currency` 字段不需要代码变更

新版 `POST /v1/acquiring/order` 增加了可选 `currency` 字段，默认值是 `USD`。

当前代码不需要改：

- 本地 Infini 充值和订阅首单金额都按 USD 计价。
- 不传 `currency` 时，Infini 默认使用 USD，和当前业务语义一致。

如果以后要支持多币种定价，再新增 `InfiniCurrency` 配置并写入 `InfiniCreateOrderRequest`。

### 2.3 企业卡 Card API 不属于当前支付网关流程

新版文档新增了企业卡相关接口：

- `POST /v1/acquiring/card/apply`
- `GET /v1/acquiring/card/list`
- `GET /v1/acquiring/card/status`
- `POST /v1/acquiring/card/reveal`

当前代码不需要改：

- 这些接口是发卡、查卡、敏感卡信息查询能力。
- 当前 Infini 集成只负责托管收银台收款，用于充值和订阅套餐购买。
- 如果将来要在本系统内做企业卡管理，应作为独立模块设计，不能塞进充值支付链路。

### 2.4 Shasta 测试网更新不影响生产逻辑

新版支持链文档把 Tron 测试网说明从 Nile 改为 Shasta，并更新了测试币水龙头和浏览器说明。

当前代码不需要改：

- 生产环境不依赖测试网链名。
- 代码只负责选择 Infini 生产或沙盒 API base URL。
- 测试网链选择发生在 Infini 托管收银台和钱包侧。

只有在沙盒链上测试时，需要按文档使用 Shasta Testnet。

## 3. 当前设计取舍

### 3.1 充值使用托管订单 API

充值流程使用：

```text
POST /v1/acquiring/order
```

关键字段：

- `amount`：本地计算后的应收 USD 金额
- `request_id`：本地生成 UUID，满足幂等要求
- `client_reference`：本地 `trade_no`
- `success_url` / `failure_url`：支付完成后返回本系统页面
- `pay_methods`：默认省略，或按管理员配置限制

Webhook 完成后按 `client_reference` 找本地订单并完成充值。

### 3.2 订阅套餐购买目前复用托管订单 API

当前 `/api/subscription/infini/pay` 不是调用 Infini 的 recurring subscription API，而是复用托管订单 API 创建一次性收银台订单。

这是有意取舍：

- 本地订阅体系当前核心语义是“用户购买一个本地套餐，支付成功后创建本地订阅记录”。
- 当前仓库没有完整的“远端 recurring 续费 -> 本地续期”的生命周期处理。
- 复用托管订单 API 可以与 Stripe / Creem / EZPay 等首单购买逻辑保持一致。

Webhook 成功后仍复用：

```text
model.CompleteSubscriptionOrder(...)
```

## 4. 仍需关注的后续事项

### 4.1 真正的 Infini 自动续费尚未实现

如果业务要使用 Infini 的 `/v1/acquiring/subscription`，需要新增独立设计，而不是简单替换当前首单购买逻辑。

至少要补：

- 远端 `subscription_id` 与本地 `UserSubscription` 的映射
- `subscription.update` 续费成功后的本地周期延长逻辑
- `subscription.cancel` 后的本地状态同步
- 续费账单历史记录
- 本地套餐周期到 Infini `DAY` / `MONTH` 的映射策略

### 4.2 Webhook 幂等目前依赖本地订单状态

当前 webhook 会加本地订单锁，并且只处理 `pending` 状态订单，因此重复的完成事件不会重复充值或重复开通订阅。

如果需要严格按 Infini `X-Webhook-Event-Id` 去重，可以新增 webhook event 表记录已处理事件 ID。

### 4.3 `expires_in` 仍按相对秒数处理

文档写法是“订单过期相对时间（Unix 秒）”。当前 `InfiniOrderTTLSeconds` 按相对秒数传入。

如果沙盒实测发现 Infini 接口实际要求绝对 Unix timestamp，需要再调整配置语义和字段名。

### 4.4 多币种需要独立产品设计

当前默认 USD 与现有业务一致。

如果要支持 `EUR`、`GBP`、`SGD`、`JPY`、`AUD`、`HKD` 等新版文档列出的币种，需要同步设计：

- 后台配置项
- 汇率或定价规则
- 日志和账单展示
- 退款/对账语义

## 5. 当前结论

这次 Infini 文档更新后，当前代码不需要改。

已同步的必要文档更新是：

- 官方文档镜像
- 支付方式配置说明
- 本集成状态文档
