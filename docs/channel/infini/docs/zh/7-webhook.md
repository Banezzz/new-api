## 7. Webhook（订单与订阅状态回调）

Infini 会在订单或订阅状态发生变更时，向商户预先配置的 Webhook 地址发送 HTTP POST 请求，通知最新状态与异常情况，便于商户进行发货、开通服务、库存解锁及客服处理。

### 7.1 可订阅事件与事件类型

在商户后台可以配置订阅类型，不同订阅类型对应的事件如下：

**订单事件：**

- 订阅 order.create → 会收到：
  - order.create
- 订阅 order.update → 会收到：
  - order.processing
  - order.completed
  - order.expired
  - order.late_payment


**订单事件类型说明：**

- order.created：订单创建成功，进入待支付状态。
- order.processing：订单进入处理中（收到部分支付或存在确认中的链上交易）。
- order.completed：订单金额已满足，订单状态为 paid。
- order.expired：订单在有效期内未完成支付，已过期。
- order.late_payment：订单过期后（24 小时内）收到付款。


**订阅事件：**

- 订阅 subscription.update → 会收到：
  - subscription.update
- 订阅 subscription.cancel → 会收到：
  - subscription.cancel


**订阅事件类型说明：**

- subscription.update：订阅状态更新（如首次支付完成后激活、续费支付成功后计费周期更新）。
- subscription.cancel：订阅已取消（商户 API 取消、用户退订、或系统因未支付自动取消）。


#### 7.1.1 测试工具

如果你只是想检查事件是否有被触发以及真实的webhook字段，你可以使用 [Webhook Cool](https://webhook.cool/) 这个测试工具，它会提供给你一个唯一的 WEBHOOK URL 来接收这些事件。

### 7.2 Webhook Payload 字段说明

#### 订单 Webhook Payload 字段

Webhook 请求的 body 为 JSON 格式，字段包括：

- event：事件类型（如 order.create）
- order_id：订单唯一标识
- client_reference：商户侧订单号（即 client_reference）
- amount：订单应付金额（法币金额）
- currency：订单币种（如 USD）
- status：订单状态：
  - pending
  - processing
  - paid
  - partial_paid
  - expired
- amount_confirming：确认中金额（链上交易存在但尚未达到确认要求）
- amount_confirmed：已确认金额（链上确认完成）
- created_at：订单创建时间（Unix 时间戳，秒）
- updated_at：订单最近一次更新时间（Unix 时间戳，秒）
- exception_tags（如果有）：订单异常标签数组（如 ["underpaid", "late"]），详见「业务核心概念」章节


> 说明：


- amount_confirmed + amount_confirming 反映链上已识别到的总支付金额。
- 订单状态与是否过期、已确认/确认中金额共同构成订单当前语义。


#### 订阅 Webhook Payload 字段

订阅 Webhook 请求的 body 为 JSON 格式，字段包括：

- event：事件类型（`subscription.update` 或 `subscription.cancel`）
- subscription_id：系统生成的订阅 ID
- merchant_sub_id：商户自定义订阅 ID
- plan_name：订阅计划名称
- trigger_method：扣费触发方式（如 `invoice`）
- status：订阅状态：
  - pending
  - active
  - canceled
- currency：订阅币种（如 USD）
- amount：每期扣款金额
- interval_unit：扣款周期单位（`DAY` 或 `MONTH`）
- interval_count：每个扣款周期的间隔数量
- payer_email：付款人邮箱
- current_period_start：当前计费周期开始时间（Unix 时间戳，秒）
- current_period_end：当前计费周期结束时间（Unix 时间戳，秒）
- subscription_end_at：订阅终止时间（Unix 时间戳，秒）
- next_invoice_at：下次发送 Invoice 的时间（Unix 时间戳，秒）
- cancel_reason：取消原因（仅订阅被取消时返回）
- canceled_at：取消时间（Unix 时间戳，秒；仅订阅被取消时返回）
- created_at：订阅创建时间（Unix 时间戳，秒）
- updated_at：订阅最近一次更新时间（Unix 时间戳，秒）


### 7.3 Webhook 请求 Headers

Infini 在发送 Webhook 时，会附带以下 HTTP Header 用于安全校验与幂等处理：

- Content-Type: application/json
- X-Webhook-Timestamp：Unix 时间戳（秒）
- X-Webhook-Event-Id：事件唯一标识，用于幂等去重
- X-Webhook-Signature：HMAC-SHA256 签名，用于商户侧验签


> 建议商户使用 X-Webhook-Event-Id 做幂等处理，避免重复消费同一事件。


### 7.4 Webhook 示例 Payload

以下示例展示典型场景下的 Webhook 内容。

#### 7.4.1 场景 1：订单创建（order.created）

订单创建后，状态为 pending，等待用户付款。


```json
{
  "event": "order.create",
  "order_id": "10290d05-8f5c-4ecb-84f0-f78d6f30557f",
  "client_reference": "",
  "amount": "1",
  "currency": "USD",
  "status": "pending",
  "amount_confirmed": "0",
  "amount_confirming": "0",
  "created_at": 1763512195,
  "updated_at": 1763512195
}
```

#### 7.4.2 场景 2：订单处理中（收到款项在确认中，order.processing）

收到付款，但交易仍在区块链确认中。


```json
{
  "event": "order.processing",
  "order_id": "20290d05-8f5c-4ecb-84f0-f78d6f30557f",
  "client_reference": "",
  "amount": "1",
  "currency": "USD",
  "status": "processing",
  "amount_confirmed": "0",
  "amount_confirming": "0.5",
  "created_at": 1763512349,
  "updated_at": 1763512403
}
```

#### 7.4.3 场景 3：订单处理中（收到部分款项已确认，order.processing）

部分付款已经在区块链上确认。


```json
{
  "event": "order.processing",
  "order_id": "20290d05-8f5c-4ecb-84f0-f78d6f30557f",
  "client_reference": "",
  "amount": "1",
  "currency": "USD",
  "status": "processing",
  "amount_confirmed": "0.5",
  "amount_confirming": "0",
  "created_at": 1763512349,
  "updated_at": 1763512453
}
```

#### 7.4.4 场景 4：订单完成（收到完整付款，order.completed）

收到足额付款并确认，订单完成。


```json
{
  "event": "order.completed",
  "order_id": "20290d05-8f5c-4ecb-84f0-f78d6f30557f",
  "client_reference": "",
  "amount": "1",
  "currency": "USD",
  "status": "paid",
  "amount_confirmed": "1",
  "amount_confirming": "0",
  "created_at": 1763512349,
  "updated_at": 1763512573
}
```

#### 7.4.5 场景 5：订单过期（完全未付款，order.expired）

订单超时未收到任何付款。


```json
{
  "event": "order.expired",
  "order_id": "10290d05-8f5c-4ecb-84f0-f78d6f30557f",
  "client_reference": "",
  "amount": "1",
  "currency": "USD",
  "status": "expired",
  "amount_confirmed": "0",
  "amount_confirming": "0",
  "created_at": 1763512195,
  "updated_at": 1763512255
}
```

#### 7.4.6 场景 6：订单过期（收到部分款项，order.expired + partial_paid）

订单超时但收到了部分付款，未达到订单金额。


```json
{
  "event": "order.expired",
  "order_id": "60290d05-8f5c-4ecb-84f0-f78d6f30557f",
  "client_reference": "",
  "amount": "1",
  "currency": "USD",
  "status": "partial_paid",
  "amount_confirmed": "0.5",
  "amount_confirming": "0",
  "created_at": 1763514565,
  "updated_at": 1763514765
}
```

#### 7.4.7 场景 7：订单过期后收到付款（晚到付款，order.late_payment）

订单过期后 24 小时内收到付款。


```json
{
  "event": "order.late_payment",
  "order_id": "30290d05-8f5c-4ecb-84f0-f78d6f30557f",
  "client_reference": "",
  "amount": "1",
  "currency": "USD",
  "status": "expired",
  "amount_confirmed": "1",
  "amount_confirming": "0",
  "created_at": 1763512622,
  "updated_at": 1763512815
}
```

> 提示：


- late_payment 场景下，订单状态仍为 expired，但 amount_confirmed 已达到订单金额，商户可根据业务策略决定是否发货或退款。
- 建议结合异常标签（如 late、underpaid、overpaid）进行业务决策。


#### 7.4.8 场景 8：订阅激活（subscription.update）

首次支付完成后，订阅从 pending 状态变为 active。


```json
{
  "event": "subscription.update",
  "subscription_id": "sub-9f3c1f2e",
  "merchant_sub_id": "msub_001",
  "plan_name": "Monthly Plan",
  "trigger_method": "invoice",
  "status": "active",
  "currency": "USD",
  "amount": "9.99",
  "interval_unit": "MONTH",
  "interval_count": 1,
  "payer_email": "user@example.com",
  "current_period_start": 1740000000,
  "current_period_end": 1742678400,
  "next_invoice_at": 1742592000,
  "created_at": 1740000000,
  "updated_at": 1740000100
}
```

#### 7.4.9 场景 9：订阅续费（subscription.update）

续费支付完成后，计费周期更新至下一个周期。


```json
{
  "event": "subscription.update",
  "subscription_id": "sub-9f3c1f2e",
  "merchant_sub_id": "msub_001",
  "plan_name": "Monthly Plan",
  "trigger_method": "invoice",
  "status": "active",
  "currency": "USD",
  "amount": "9.99",
  "interval_unit": "MONTH",
  "interval_count": 1,
  "payer_email": "user@example.com",
  "current_period_start": 1742678400,
  "current_period_end": 1745356800,
  "next_invoice_at": 1745270400,
  "created_at": 1740000000,
  "updated_at": 1742678500
}
```

#### 7.4.10 场景 10：订阅取消（subscription.cancel）

订阅被商户 API 取消、用户退订、或系统因未支付自动取消。


```json
{
  "event": "subscription.cancel",
  "subscription_id": "sub-9f3c1f2e",
  "merchant_sub_id": "msub_001",
  "plan_name": "Monthly Plan",
  "trigger_method": "invoice",
  "status": "canceled",
  "currency": "USD",
  "amount": "9.99",
  "interval_unit": "MONTH",
  "interval_count": 1,
  "payer_email": "user@example.com",
  "current_period_start": 1742678400,
  "current_period_end": 1745356800,
  "cancel_reason": "by_merchant_api",
  "canceled_at": 1743000000,
  "created_at": 1740000000,
  "updated_at": 1743000000
}
```

### 7.5 接收 Webhook 与安全校验

Infini 会向你配置的 Webhook URL 发起 POST 请求，建议接收端遵循以下原则：

1. 校验所有必需 Header 是否存在：


- X-Webhook-Signature
- X-Webhook-Timestamp
- X-Webhook-Event-Id


1. 验证签名合法性（见下一小节）。
2. 基于 X-Webhook-Event-Id 实现幂等处理（如仅处理一次）。
3. 业务逻辑应 **异步处理**，快速返回 HTTP 200，避免超时。


### 7.6 Webhook 签名校验（Signature Verification）

验签步骤：

1. 从 Header 中读取：


- X-Webhook-Signature（签名）
- X-Webhook-Timestamp（时间戳）
- X-Webhook-Event-Id（事件 ID）


1. 获取原始请求体字符串 payload。
2. 组装签名内容字符串：



```
{timestamp}.{event_id}.{payload}
```

1. 使用你的 WEBHOOK_SECRET 做 HMAC-SHA256 计算：



```python
signed_content = f"{timestamp}.{event_id}.{payload}"
expected_sig = hmac.new(
WEBHOOK_SECRET.encode(),
signed_content.encode(),
hashlib.sha256
).hexdigest()
```

1. 对比 expected_sig 与 X-Webhook-Signature 是否一致。


#### 7.6.1 Python 验签示例


```python
@app.route('/webhook', methods=['POST'])
def webhook_verification():
    signature = request.headers.get('X-Webhook-Signature')
    timestamp = request.headers.get('X-Webhook-Timestamp')
    event_id = request.headers.get('X-Webhook-Event-Id')

    if not all([signature, timestamp, event_id]):
        return jsonify({"error": "Missing required headers"}), 400

    payload = request.get_data(as_text=True)
    signed_content = f"{timestamp}.{event_id}.{payload}"
    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode(),
        signed_content.encode(),
        hashlib.sha256
    ).hexdigest()

    if expected_sig != signature:
        return jsonify({"error": "Invalid signature"}), 401

    # Process valid webhook
    return jsonify({"status": "ok"})
```

### 7.7 Webhook 重试策略

若商户端未返回 HTTP 200，Infini 会对该事件进行重试。

- **最多重试：8 次**
- **前 3 次重试间隔：30 秒**
- **第 4～8 次采用递增退避策略**，示例：


| 尝试次数 | 说明 | 间隔时间（示例） |
|  --- | --- | --- |
| 第 1 次 | 首次发送 | 立即 |
| 第 2 次 | 第 1 次失败 | 30 秒 |
| 第 3 次 | 第 2 次失败 | 30 秒 |
| 第 4 次 | 第 3 次失败 | 30 秒 |
| 第 5 次 | 第 4 次失败 | 60 秒 |
| 第 6 次 | 第 5 次失败 | 120 秒 |
| 第 7 次 | 第 6 次失败 | 240 秒 |
| 第 8 次 | 第 7 次失败 | 480 秒 |


> 若最终多次重试仍失败，该事件将被标记为投递失败，建议商户通过日志与对账工具进行排查。