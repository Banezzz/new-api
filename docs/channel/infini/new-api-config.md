# Infini 在 new-api 中的配置说明

本文档说明当前仓库里 Infini 支付网关的实际配置方式，重点回答两个问题：

- 哪些配置可以在本系统后台直接完成
- 哪些配置必须去 Infini 商户后台额外配置

当前实现已经把 Infini 接入到现有支付体系中，和 Stripe / Creem / 易支付并列，覆盖以下场景：

- 用户在线充值
- 订阅套餐购买
- Webhook 异步回调
- 充值历史与订阅支付方式展示

## 1. 配置位置总览

### 1.1 本系统后台内配置

Infini 的业务配置统一在本系统后台完成，不走 `.env`，也不需要改 `Dockerfile`。

配置入口：

- `后台 -> 设置 -> 支付设置 -> 通用设置`
- `后台 -> 设置 -> 支付设置 -> Infini 设置`

### 1.2 Infini 外部后台配置

以下配置必须在 Infini 商户/开发者后台完成：

- 生成 API 凭证
- 配置 Webhook URL
- 配置 Webhook Secret
- 订阅订单相关事件

## 2. 本系统后台里要配置什么

### 2.1 通用设置

位置：

- `后台 -> 设置 -> 支付设置 -> 通用设置`

需要填写：

| 配置项 | 必填 | 作用 |
| --- | --- | --- |
| `ServerAddress` | 是 | 系统对外访问地址。用于默认支付成功/失败跳转地址，也用于没有单独回调域名时生成 Webhook URL。 |
| `CustomCallbackAddress` | 否 | 如果回调要走单独公网域名，就填这个。填了以后，Webhook 地址优先使用它。 |

说明：

- 这两个值至少要有一个可用，否则 Infini 在系统里不会被判定为可启用。
- 当前实现里，Webhook 地址使用规则是：
  - 优先 `CustomCallbackAddress`
  - 否则使用 `ServerAddress`

### 2.2 Infini 设置

位置：

- `后台 -> 设置 -> 支付设置 -> Infini 设置`

需要填写：

| 配置项 | 必填 | 作用 | 值来自哪里 |
| --- | --- | --- | --- |
| `InfiniEnabled` | 是 | 是否启用 Infini 支付 | 你在本系统后台决定 |
| `InfiniSandbox` | 是 | 是否使用 Infini 沙盒环境 | 你在本系统后台决定，但必须和外部环境一致 |
| `InfiniBaseURL` | 否 | 自定义 API 地址。通常留空，系统会自动走官方生产/沙盒地址 | 通常留空 |
| `InfiniKeyId` | 是 | Infini API 请求签名所需 `keyId` | Infini 商户/开发者后台生成 |
| `InfiniSecretKey` | 是 | Infini API HMAC 签名私钥 | Infini 商户/开发者后台生成 |
| `InfiniWebhookSecret` | 是 | 校验 `X-Webhook-Signature` 的密钥 | Infini 商户/开发者后台配置/查看 |
| `InfiniMerchantAlias` | 否 | 支付页展示的商户名称 | 你在本系统后台决定 |
| `InfiniSuccessURL` | 否 | 支付成功跳转地址。留空时默认跳到 `/console/topup?show_history=true` | 你在本系统后台决定 |
| `InfiniFailureURL` | 否 | 支付失败跳转地址。留空时默认跳到 `/console/topup?show_history=true` | 你在本系统后台决定 |
| `InfiniUnitPrice` | 是 | 站内每个充值单位对应的 USD 金额 | 你在本系统后台决定 |
| `InfiniMinTopUp` | 是 | 最低充值数量 | 你在本系统后台决定 |
| `InfiniOrderTTLSeconds` | 否 | 订单过期秒数。`0` 表示使用 Infini 默认值 | 你在本系统后台决定 |
| `InfiniPayMethods` | 是 | 前端展示的 Infini 支付入口及对应支付方式 | 你在本系统后台决定 |

补充说明：

- `InfiniSecretKey` 和 `InfiniWebhookSecret` 只写入后端存储，保存后不会在页面回显。
- 当前实现里，Infini 订阅购买复用的是 hosted checkout 订单能力，不需要你像 Stripe / Creem 那样为每个套餐单独填写 `price_id` 或 `product_id`。

## 3. Infini 外部后台要配置什么

位置：

- `Infini 商户后台 / 开发者后台`

### 3.1 API 凭证

需要在 Infini 后台生成或查看：

- `KeyId`
- `SecretKey`

然后把它们填回本系统后台：

- `InfiniKeyId`
- `InfiniSecretKey`

### 3.2 Webhook

需要在 Infini 后台配置：

- Webhook URL
- Webhook Secret

Webhook URL 填写规则：

```text
${CustomCallbackAddress 或 ServerAddress}/api/infini/webhook
```

例如：

```text
https://api.example.com/api/infini/webhook
```

如果你配置了：

- `CustomCallbackAddress=https://callback.example.com`

那么 Webhook URL 应填：

```text
https://callback.example.com/api/infini/webhook
```

如果没有配置 `CustomCallbackAddress`，而是只配置了：

- `ServerAddress=https://api.example.com`

那么 Webhook URL 应填：

```text
https://api.example.com/api/infini/webhook
```

Webhook Secret 的处理方式：

- 在 Infini 后台配置或查看 Webhook Secret
- 再把同一个值填回本系统后台的 `InfiniWebhookSecret`

### 3.3 事件订阅

需要在 Infini 后台订阅订单相关事件。

建议：

- 直接订阅 `order` 相关事件全集

当前系统实际处理的事件包括：

- `order.create`
- `order.created`
- `order.processing`
- `order.completed`
- `order.expired`
- `order.late_payment`

其中真正影响本地订单状态的主要是：

- `order.completed`
- `order.expired`
- `order.late_payment`

## 4. 推荐填写顺序

### 第一步：先配本系统通用地址

在本系统后台：

- `后台 -> 设置 -> 支付设置 -> 通用设置`

填写：

- `ServerAddress`
- 如有需要再填 `CustomCallbackAddress`

### 第二步：去 Infini 后台生成凭证并配置 Webhook

在 Infini 后台完成：

- 生成 `KeyId`
- 生成 `SecretKey`
- 配置 Webhook URL
- 配置或查看 `Webhook Secret`
- 订阅 `order` 相关事件

### 第三步：回到本系统后台填写 Infini 设置

在本系统后台：

- `后台 -> 设置 -> 支付设置 -> Infini 设置`

填写：

- `InfiniSandbox`
- `InfiniKeyId`
- `InfiniSecretKey`
- `InfiniWebhookSecret`
- `InfiniMerchantAlias`
- `InfiniUnitPrice`
- `InfiniMinTopUp`
- `InfiniOrderTTLSeconds`
- `InfiniPayMethods`

最后再打开：

- `InfiniEnabled`

### 第四步：联调验证

至少验证下面四项：

- 用户充值能拉起 Infini Checkout
- 订阅套餐购买能拉起 Infini Checkout
- 支付成功后本地订单能完成
- 支付过期后本地订单能转为过期

## 5. 推荐的 `InfiniPayMethods` 配置

如果你想让 Infini 在前端和其他支付网关并列展示，建议直接使用下面的 JSON：

```json
[
  {
    "name": "Infini",
    "type": "infini",
    "pay_methods": [1, 2],
    "color": "rgba(var(--semi-indigo-5), 1)"
  },
  {
    "name": "Infini Crypto",
    "type": "infini:crypto",
    "pay_methods": [1]
  },
  {
    "name": "Infini Card",
    "type": "infini:card",
    "pay_methods": [2]
  }
]
```

含义：

- `pay_methods: [1]` 表示加密货币
- `pay_methods: [2]` 表示卡支付
- `pay_methods: [1, 2]` 表示同时支持

## 6. 哪些配置是系统内完成，哪些是外部完成

### 6.1 系统内后台可直接完成

- `ServerAddress`
- `CustomCallbackAddress`
- `InfiniEnabled`
- `InfiniSandbox`
- `InfiniBaseURL`
- `InfiniMerchantAlias`
- `InfiniSuccessURL`
- `InfiniFailureURL`
- `InfiniUnitPrice`
- `InfiniMinTopUp`
- `InfiniOrderTTLSeconds`
- `InfiniPayMethods`

### 6.2 必须在 Infini 外部后台完成后再回填

- `InfiniKeyId`
- `InfiniSecretKey`
- `InfiniWebhookSecret`
- `Webhook URL`
- `order` 相关事件订阅

## 7. 最终验收清单

在你准备上线前，逐项确认：

- 本系统后台已经填写 `ServerAddress` 或 `CustomCallbackAddress`
- Infini 后台已经配置正确的 Webhook URL
- Infini 后台和本系统后台使用的是同一套环境
- 如果本系统开启了 `InfiniSandbox=true`，外部也必须使用沙盒凭证和沙盒回调
- `InfiniKeyId` / `InfiniSecretKey` / `InfiniWebhookSecret` 已正确回填
- `InfiniPayMethods` 已配置
- 前端充值页能看到 Infini 入口
- 订阅购买弹窗能看到 Infini 支付入口
- 支付成功后，本地充值或订阅订单状态正确更新

## 8. 结论

对当前仓库而言，Infini 不是通过 `.env` 或 `Dockerfile` 配的，而是：

- 本系统后台负责保存业务配置和密钥
- Infini 外部后台负责生成凭证、配置 Webhook 和事件订阅

两边都要配，但职责是分开的：

- 本系统后台决定“本系统如何使用 Infini”
- Infini 外部后台决定“Infini 如何回调本系统、给本系统什么密钥”
