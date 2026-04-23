## 6. API Documentation（托管收银台模式）

托管收银台模式是 Infini 最推荐的接入方式。商户只需创建订单、跳转 checkout_url 并处理 Webhook，即可完成支付集成。本章节仅包含托管收银台模式的 API 文档与对应字段说明。

所有接口前缀：

`/v1/acquiring`

### 6.1 创建订单（Create Order）

**POST** /v1/acquiring/order

用于创建订单，并返回托管收银台的访问 URL (checkout_url)。

#### Headers


```json
Content-Type: application/json
Date: {GMT Time}
Authorization: Signature ...
```

#### Request Body

| 字段 | 类型 | 必填 | 说明 |
|  --- | --- | --- | --- |
| amount | string/number | 是 | 订单法币金额（最多 6 位小数） |
| request_id | string | 是 | 商户自定义生成的幂等key, UUID "a759b99a-9d22-433d-bced-ab1d2e1bea1d" |
| client_reference | string | 否 | 商户自定义订单号，建议保持唯一 |
| order_desc | string | 否 | 订单描述 |
| expires_in | number | 否 | 订单过期相对时间（Unix 秒）；不传则使用后台默认值 |
| merchant_alias | string | 否 | 收银台账单名称（覆盖后台配置） |
| success_url | string | 否 | 订单支付成功跳转回商户地址 |
| failure_url | string | 否 | 订单支付失败跳转回商户地址 |
| pay_methods | array of integers | 否 | 支付方式：[1] 加密货币，[2] 卡支付，[1,2] 两者都支持。默认使用商户配置 |


#### Response 示例


```json
{
  "order_id": "10290d05-xxxx",
  "request_id": "your request_id",
  "checkout_url": "https://checkout.infini.money/pay/xxxx",
  "client_reference": "client_reference"
}
```

### 6.2 查询订单（Query Order）

**GET** /v1/acquiring/order?order_id ={order_id}

返回订单的实时状态信息。

#### Order Status 字段说明

##### `status` - 订单处理状态

数据库存储字段，记录订单的处理状态。

| 值 | 说明 |
|  --- | --- |
| `pending` | 待支付 |
| `processing` | 处理中（已收到部分资金） |
| `paid` | 已支付 |
| `partial_paid` | 部分支付已过期 |
| `expired` | 已过期未支付 |


##### 

Webhook 事件
Webhook 中的 `status` 字段和查询接口中的 ` pay_status` 一致。

#### Response 示例


```json
{
  "order_id": "ord-123",
  "status": "processing",
  "pay_status": "processing",
  "amount": "100",
  "currency": "USD",
  "amount_confirming": "0",
  "amount_confirmed": "0.5",
  "expires_at": 1763512195,
  "created_at": 1763512000,
  "exception_tags": ["wrong_currency"],
  "client_reference": "ORDER-001"
}
```

### 6.3 重新签发托管收银台 Token（Reissue Checkout Token）

**POST** /v1/acquiring/token/reissue

用于重新生成托管收银台 URL，适用于支付页面关闭、Token 过期等场景。

#### Request Body

| 字段 | 类型 | 必填 | 说明 |
|  --- | --- | --- | --- |
| order_id | string | 是 | 订单唯一 ID |


#### Response


```json
{
  "order_id": "ord-123",
  "checkout_url": "https://checkout.infini.money/pay/xxxx"
}
```

### 6.4 支付单接口（高级功能）

> **注意：** 对于大多数商户，您只需要创建订单并跳转到收银台 URL 即可。以下支付单接口为可选功能，需要额外的开发工作。它们允许您以编程方式创建和管理支付单，而不是使用托管收银台。


#### 创建支付单

**POST** /v1/acquiring/payment

以编程方式为订单创建支付单。

**Request Body:**

- `order_id` (string, 必填): 订单 ID
- `chain` (string, 必填): 区块链网络名称
- `token_id` (string, 必填): 代币标识符
- `payment_method` (integer, 可选): 支付方式（目前仅支持 1，表示加密货币支付）


**Response:**


```json
{
  "payment_id": "pay-123",
  "amount": "100.00",
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "expires_at": 1763512195
}
```

#### 查询支付单

**GET** /v1/acquiring/payment?payment_id={payment_id}

查询支付单详情，包括交易历史。

#### 查询订单支付单列表

**GET** /v1/acquiring/payment/list?order_id={order_id}

获取与订单关联的所有支付单记录。

### 6.5 资金提取（Fund Withdraw）

**POST** /v1/acquiring/fund/withdraw

用于从 Infini 账户提取资金到外部钱包地址。

#### Request Body

| 字段 | 类型 | 必填 | 说明 |
|  --- | --- | --- | --- |
| chain | string | 是 | 区块链网络（见下方支持的链） |
| token_type | string | 是 | 代币类型，例如 "USDT" |
| amount | string | 是 | 提取金额 |
| wallet_address | string | 是 | 目标钱包地址 |
| note | string | 否 | 可选的提取备注 |


#### 支持的链和代币

**沙盒环境：**

| Chain | 支持的 Token |
|  --- | --- |
| TTRON | USDT |


**生产环境：**

| Chain | 支持的 Token | 手续费 |
|  --- | --- | --- |
| ETHEREUM | USDT, USDC | 5 |
| BSC | USDT, USDC | 0.5 |
| SOLANA | USDT, USDC | 1 |
| ARBITRUM | USDT, USDC | 0.5 |
| TRON | USDT | 3 |


*注意：*

- *链名称和代币类型必须使用大写*
- *手续费以您提取的代币类型扣除。例如，提取 USDT 则扣除相应数量的 USDT；提取 USDC 则扣除相应数量的 USDC*


#### 请求示例


```json
{
  "chain": "ETHEREUM",
  "token_type": "USDT",
  "amount": "6",
  "wallet_address": "0x5f716e5775b18409917e2a2f0762d29d6c385cb0",
  "note": "123"
}
```

#### 响应示例


```json
{"code":0,"message":"","data":{"request_id":"e94b4e88-36c2-4550-907e-839742cf5fae"}}
```

### 6.5.1 查询提取订单状态（Query Withdraw Order Status）

**GET** /v1/acquiring/fund/withdraw

通过 `request_id` 查询提取订单的状态。

#### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|  --- | --- | --- | --- |
| request_id | string | 是 | `POST /fund/withdraw` 返回的 `request_id` |


#### 响应字段

| 字段 | 类型 | 说明 |
|  --- | --- | --- |
| status | string | 订单状态：`pending`、`processing`、`completed` |
| amount | string | 提取总金额（原始请求金额） |
| fee | string | Infini 提取手续费 |
| actual_amount | string | 目标地址实际到账金额（amount 减去 fee） |
| transaction_hash | string | 链上交易哈希（未上链时为空） |
| chain | string | 链名称 |
| token_type | string | 代币类型，例如 `USDT`、`USDC` |


#### 状态说明

| 状态 | 说明 |
|  --- | --- |
| pending | 提取订单已创建，等待提交或审核中 |
| processing | 交易已提交上链，等待确认 |
| completed | 链上交易已确认成功 |


#### 响应示例


```json
{
  "code": 0,
  "message": "",
  "data": {
    "status": "pending",
    "amount": "11",
    "fee": "0.1",
    "actual_amount": "10.9",
    "transaction_hash": "",
    "chain": "TRON",
    "token_type": "USDT"
  }
}
```


```json
{
  "code": 0,
  "message": "",
  "data": {
    "status": "completed",
    "amount": "11",
    "fee": "0.1",
    "actual_amount": "10.9",
    "transaction_hash": "0xabc123...",
    "chain": "ETHEREUM",
    "token_type": "USDT"
  }
}
```

### 6.6 创建订阅（Create Subscription）

**POST** /v1/acquiring/subscription

用于创建订阅，并返回托管收银台的访问 URL (checkout_url)。首次支付订单将同时创建。

#### Headers


```json
Content-Type: application/json
Date: {GMT Time}
Authorization: Signature ...
```

#### Request Body

| 字段 | 类型 | 必填 | 说明 |
|  --- | --- | --- | --- |
| amount | string/number | 是 | 订单法币金额（最多 6 位小数） |
| request_id | string | 是 | 商户自定义生成的幂等key，UUID 格式 |
| client_reference | string | 否 | 商户自定义订单号 |
| expires_in | number | 否 | 订单过期相对时间（Unix 秒）；不传则使用后台默认值 |
| merchant_alias | string | 否 | 收银台账单名称（覆盖后台配置） |
| success_url | string | 否 | 支付成功跳转回商户地址 |
| failure_url | string | 否 | 支付失败跳转回商户地址 |
| pay_methods | array of integers | 否 | 支付方式：[1] 加密货币，[2] 卡支付，[1,2] 两者都支持。默认使用商户配置 |
| subscription | object | 是 | 订阅参数（见下方） |


**subscription 对象：**

| 字段 | 类型 | 必填 | 说明 |
|  --- | --- | --- | --- |
| merchant_sub_id | string | 是 | 商户自定义订阅 ID（同一商户下必须唯一） |
| plan_name | string | 是 | 订阅计划名称 |
| amount | string/number | 是 | 后续每期扣款金额（最多 6 位小数） |
| interval_unit | string | 是 | 扣款周期单位：`DAY` 或 `MONTH` |
| interval_count | integer | 是 | 每个扣款周期的间隔数量 |
| payer_email | string | 是 | 付款人邮箱（用于发送续费 Invoice 通知） |
| invoice_lead_days | integer | 是 | 周期结束前提前发送续费 Invoice 的天数（最小：0）。invoice 模式下必填 |
| invoice_due_days | integer | 是 | Invoice 创建后的到期天数（最小：1）。invoice 模式下必填 |
| subscription_end_at | integer | 否 | 订阅终止时间，Unix 时间戳（0 = 永不终止） |
| canceled_url | string | 否 | 退订后的跳转 URL |


#### Response 示例


```json
{
  "order_id": "10290d05-xxxx",
  "request_id": "your request_id",
  "client_reference": "client_reference",
  "checkout_url": "https://checkout.infini.money/subscription/xxxx",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "subscription": {
    "subscription_id": "sub-xxxx",
    "merchant_sub_id": "msub_001",
    "status": "pending"
  }
}
```

### 6.7 查询订阅（Query Subscription）

**GET** /v1/acquiring/subscription?merchant_sub_id={merchant_sub_id}

根据商户订阅 ID 查询订阅详情。

#### 订阅状态字段说明

| 值 | 说明 |
|  --- | --- |
| `pending` | 等待首次支付 |
| `active` | 订阅生效中 |
| `canceled` | 已取消 |


#### Response 示例


```json
{
  "subscription_id": "sub-xxxx",
  "merchant_sub_id": "msub_001",
  "plan_name": "Monthly Plan",
  "trigger_method": "invoice",
  "status": "active",
  "currency": "USD",
  "first_amount": "10.00",
  "amount": "9.99",
  "interval_unit": "MONTH",
  "interval_count": 1,
  "current_period_start": 1740000000,
  "current_period_end": 1742678400,
  "subscription_end_at": 0,
  "next_invoice_at": 1742592000,
  "payer_email": "user@example.com",
  "created_at": 1740000000,
  "updated_at": 1740000100
}
```

### 6.8 取消订阅（Cancel Subscription）

**POST** /v1/acquiring/subscription/cancel

用于取消一个有效的订阅。取消后，订阅在当前计费周期结束前仍然可用。

#### Request Body

| 字段 | 类型 | 必填 | 说明 |
|  --- | --- | --- | --- |
| merchant_sub_id | string | 是 | 商户自定义订阅 ID |
| cancel_reason | string | 是 | 取消原因：`user_request`（用户请求）、`by_merchant_api`（商户 API 调用）、`by_operation`（运营操作） |
| note | string | 否 | 可选的取消备注 |


#### Response 示例


```json
{
  "subscription_id": "sub-xxxx",
  "merchant_sub_id": "msub_001",
  "status": "canceled",
  "canceled_at": 1742678400,
  "cancel_reason": "by_merchant_api"
}
```

### 6.9 Webhook（订单与订阅状态回调）

商户可在后台配置 Webhook 接收地址。订单或订阅状态变化时，Infini 会主动推送以下事件：

**订单事件：**

- order.created
- order.processing
- order.completed
- order.expired
- order.late_payment


**订阅事件：**

- subscription.update
- subscription.cancel


#### Webhook Headers

| Header | 说明 |
|  --- | --- |
| X-Webhook-Timestamp | Unix 时间戳 |
| X-Webhook-Event-Id | 事件唯一 ID |
| X-Webhook-Signature | Webhook HMAC 签名 |


#### Webhook Payload 示例


```json
{
  "event": "order.completed",
  "order_id": "ord-123",
  "client_reference": "ORDER-001",
  "amount": "100",
  "currency": "USD",
  "status": "paid",
  "amount_confirmed": "100",
  "amount_confirming": "0",
  "created_at": 1763512195,
  "updated_at": 1763512573,
  "exception_tags": []
}
```

#### Subscription Webhook Payload 示例


```json
{
  "event": "subscription.update",
  "subscription_id": "sub-xxxx",
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
  "cancel_reason": "by_merchant_api",
  "canceled_at": 1742678400,
  "created_at": 1740000000,
  "updated_at": 1740000100
}
```

> **注意：** `next_invoice_at`、`cancel_reason` 和 `canceled_at` 仅在对应值存在时才包含。例如，`cancel_reason` 和 `canceled_at` 仅出现在 `subscription.cancel` 事件中。


Webhook 验签方法请参考 **章节 4：授权与安全机制**。

### 6.10 错误码（Error Codes）

所有错误返回格式：


```json
{
  "code": 40001,
  "message": "Invalid request",
  "detail": "expires_at must be greater than current timestamp"
}
```

#### 常见错误码

| HTTP | Code | 描述 |
|  --- | --- | --- |
| 400 | 40003 | amount 必须为正数 |
| 400 | 40006 | amount 必须大于 0.01 |
| 401 | 401 | HMAC 签名无效 |
| 404 | 40401 | 订单不存在 |
| 409 | 40902 | client_reference 重复 |
| 409 | 40906 | 订单已过期 |
| 404 | 43000 | 订阅不存在 |
| 400 | 43002 | 订阅已取消 |


### 6.11 Python 示例（托管收银台模式）

以下示例展示完整流程：创建订单 → 跳转收银台 → Webhook → 重新签发 Token。

#### 6.11.1 创建订单


```python
import hmac, hashlib, base64, time
from datetime import datetime, timezone
import requests

key_id = "merchant-001-prod"
secret_key = b"your-secret-key"

def create_order(amount):
method = "POST"
path = "/v1/acquiring/order"
gmt_time = datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')

signing_string = f"{key_id}\n{method} {path}\ndate: {gmt_time}\n"
signature = base64.b64encode(
hmac.new(secret_key, signing_string.encode(), hashlib.sha256).digest()
).decode()

response = requests.post(
f"https://openapi.infini.money{path}",
json ={
"amount": amount,
"currency": "USD",
"client_reference": "ORDER-2024-001",
"description": "Product purchase",
"expires_at": int(time.time()) + 3600
},
headers ={
"Date": gmt_time,
"Authorization": f'Signature keyId="{key_id}",algorithm="hmac-sha256",headers="@request-target date",signature="{signature}"',
"Content-Type": "application/json"
}
)

response.raise_for_status()
return response.json()
```

#### 6.11.2 前端跳转到收银台


```python
@app.route('/create-payment', methods =['POST'])
def create_payment():
order = create_order(amount = request.json['amount'])
return {"checkout_url": order["checkout_url"]}
```

#### 6.11.3 Webhook 回调处理


```python
@app.route('/webhook', methods = ['POST'])
def handle_webhook():
event = request.json

if event['event'] == 'order.completed':
process_fulfillment(event['order_id'], event['amount_confirmed'])
elif event['event'] == 'order.processing':
update_order_progress(event['order_id'], event['status'])
elif event['event'] == 'order.expired':
mark_order_expired(event['order_id'])

return {"status": "ok"}
```

#### 6.11.4 重新签发收银台 Token


```python
def reissue_checkout_token(order_id):
method = "POST"
path = "/v1/acquiring/token/reissue"
gmt_time = datetime.now(timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')

signing_string = f"{key_id}\n{method} {path}\ndate: {gmt_time}\n"
signature = base64.b64encode(
hmac.new(secret_key, signing_string.encode(), hashlib.sha256).digest()
).decode()

response = requests.post(
f"https://api.infini.money{path}",
json ={"order_id": order_id},
headers ={
"Date": gmt_time,
"Authorization": f'Signature keyId="{key_id}",algorithm="hmac-sha256",headers="@request-target date",signature="{signature}"',
"Content-Type": "application/json"
}
)

response.raise_for_status()
return response.json()
```