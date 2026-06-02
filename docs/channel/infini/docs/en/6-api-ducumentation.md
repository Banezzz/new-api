## 6. API Documentation (Hosted Checkout Mode)

> **Recommended:** You can use [infini-skill](https://github.com/infini-money/infini-skill) to integrate with Infini APIs faster. The skill provides ready-to-use integration capabilities and can help you connect to the hosted checkout flow before implementing the raw APIs below.


Hosted Checkout mode is Infini's most recommended integration method. Merchants only need to create orders, redirect to checkout_url, and handle Webhooks to complete payment integration. This chapter only contains API documentation and corresponding field descriptions for Hosted Checkout mode.

All API prefix:

`/v1/acquiring`

### 6.1 Create Order

**POST** /v1/acquiring/order

Used to create an order and return the hosted checkout access URL (checkout_url).

#### Headers


```json
Content-Type: application/json
Date: {GMT Time}
Authorization: Signature ...
```

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| amount | string/number | Yes | Order fiat amount (up to 6 decimal places) |
| request_id | string | Yes | Merchant-generated idempotency key, UUID "a759b99a-9d22-433d-bced-ab1d2e1bea1d" |
| client_reference | string | No | Merchant custom order number, recommended to be unique |
| order_desc | string | No | Order description |
| expires_in | number | No | Order expiration relative time (Unix seconds); use backend default if not provided |
| merchant_alias | string | No | Merchant display name (overrides backend configuration) |
| success_url | string | No | Redirect address after successful order payment |
| failure_url | string | No | Redirect address after failed order payment |
| pay_methods | array of integers | No | Payment methods: [1] crypto, [2] card, [3] Binance Pay, [5] Apple Pay, [6] Google Pay, [1,2,3,5,6] all three are supported. Defaults to merchant config |
| currency | string | No | Order currency (USD, EUR, KWR, GBP, SGD, JPY, AUD, HKD), default to USD |


#### Response Example


```json
{
  "order_id": "10290d05-xxxx",
  "request_id": "your request_id",
  "checkout_url": "https://checkout.infini.money/pay/xxxx",
  "client_reference": "client_reference"
}
```

### 6.2 Query Order

**GET** /v1/acquiring/order?order_id ={order_id}

Returns real-time order status information.

#### Order Status Field Description

##### `status` - Payment Progress Status

Database stored field recording the order's processing status.

| Value | Description |
|  --- | --- |
| `pending` | Awaiting payment |
| `processing` | Processing (partial funds received) |
| `paid` | Paid |
| `partial_paid` | Partial payment expired |
| `expired` | Expired without payment |


#### Response Example


```json
{
  "order_id": "ord-123",
  "status": "processing",
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

### 6.3 Reissue Checkout Token

**POST** /v1/acquiring/token/reissue

Used to regenerate the hosted checkout URL, suitable for scenarios such as payment page closure or Token expiration.

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| order_id | string | Yes | Unique order ID |


#### Response


```json
{
  "order_id": "ord-123",
  "checkout_url": "https://checkout.infini.money/pay/xxxx"
}
```

### 6.4 Payment APIs (Advanced)

> **Note:** For most merchants, you only need to create an order and redirect to the checkout URL. The Payment APIs below are optional and require additional development work. They allow you to programmatically create and manage payments instead of using the hosted checkout.


#### Create Payment

**POST** /v1/acquiring/payment

Create a payment for an order programmatically.

**Request Body:**

- `order_id` (string, required): Order ID
- `chain` (string, required): Blockchain network name
- `token_id` (string, required): Token identifier
- `payment_method` (integer, optional): Payment method (currently only supports 1 for crypto)


**Response:**


```json
{
  "payment_id": "pay-123",
  "amount": "100.00",
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "expires_at": 1763512195
}
```

#### Query Payment

**GET** /v1/acquiring/payment?payment_id={payment_id}

Query payment details including transaction history.

#### List Payments

**GET** /v1/acquiring/payment/list?order_id={order_id}

Get all payments associated with an order.

### 6.5 Fund Withdraw

**POST** /v1/acquiring/fund/withdraw

Used to withdraw funds from your Infini account to an external wallet address.

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| chain | string | Yes | Blockchain network (see supported chains below) |
| token_type | string | Yes | Token type, e.g. "USDT" |
| amount | string | Yes | Withdrawal amount |
| wallet_address | string | Yes | Destination wallet address |
| note | string | No | Optional note for the withdrawal |


#### Supported Chains and Tokens

**Sandbox Environment:**

| Chain | Supported Tokens |
|  --- | --- |
| TTRON | USDT |


**Production Environment:**

| Chain | Supported Tokens | Fee |
|  --- | --- | --- |
| ETHEREUM | USDT, USDC | 5 |
| BSC | USDT, USDC | 0.5 |
| SOLANA | USDT, USDC | 1 |
| ARBITRUM | USDT, USDC | 0.5 |
| TRON | USDT | 3 |


*Note:*

- *Chain names and token types must be in uppercase*
- *Fees are deducted in the same token type as your withdrawal. For example, if you withdraw USDT, the fee is deducted in USDT; if you withdraw USDC, the fee is deducted in USDC*


#### Request Example


```json
{
  "chain": "ETHEREUM",
  "token_type": "USDT",
  "amount": "6",
  "wallet_address": "0x5f716e5775b18409917e2a2f0762d29d6c385cb0",
  "note": "123"
}
```

#### Response Example


```json
{"code":0,"message":"","data":{"request_id":"e94b4e88-36c2-4550-907e-839742cf5fae"}}
```

### 6.5.1 Query Withdraw Order Status

**GET** /v1/acquiring/fund/withdraw

Query the status of a withdraw order by its `request_id`.

#### Request Parameters

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| request_id | string | Yes | The `request_id` returned from `POST /fund/withdraw` |


#### Response Fields

| Field | Type | Description |
|  --- | --- | --- |
| status | string | Order status: `pending`, `processing`, `completed` |
| amount | string | Total withdraw amount (original requested amount) |
| fee | string | Infini withdraw fee |
| actual_amount | string | Actual received amount at destination (amount minus fee) |
| transaction_hash | string | On-chain transaction hash (empty if not yet submitted on-chain) |
| chain | string | Chain name |
| token_type | string | Token identifier, e.g. `USDT`, `USDC` |


#### Status Values

| Status | Description |
|  --- | --- |
| pending | Withdraw order created, waiting to be submitted or under review |
| processing | Transaction submitted on-chain, pending confirmations |
| completed | Transaction confirmed on-chain successfully |
| failed | Transaction failed on-chain |
| cancelled | Withdraw order cancelled (e.g. over-limit cancelled) |


#### Response Example


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

### 6.6 Create Subscription

**POST** /v1/acquiring/subscription

Used to create a subscription and return the hosted checkout access URL (checkout_url). The first payment order is created simultaneously.

#### Headers


```json
Content-Type: application/json
Date: {GMT Time}
Authorization: Signature ...
```

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| amount | string/number | Yes | Order fiat amount (up to 6 decimal places) |
| request_id | string | Yes | Merchant-generated idempotency key, UUID format |
| client_reference | string | No | Merchant custom order number |
| expires_in | number | No | Order expiration relative time (Unix seconds); use backend default if not provided |
| merchant_alias | string | No | Merchant display name (overrides backend configuration) |
| success_url | string | No | Redirect URL after successful payment |
| failure_url | string | No | Redirect URL after failed payment |
| pay_methods | array of integers | No | Payment modes: [1] crypto, [2] card, [1,2] both. Defaults to merchant config |
| subscription | object | Yes | Subscription parameters (see below) |


**subscription object:**

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| merchant_sub_id | string | Yes | Merchant-defined subscription ID (must be unique per merchant) |
| plan_name | string | Yes | Subscription plan name |
| amount | string/number | Yes | Recurring amount per billing period (up to 6 decimal places) |
| interval_unit | string | Yes | Billing interval unit: `DAY` or `MONTH` |
| interval_count | integer | Yes | Number of intervals per billing cycle |
| payer_email | string | Yes | Payer email address (used for invoice notifications) |
| invoice_lead_days | integer | Yes | Days before period end to send renewal invoice (min: 0). Required in invoice mode |
| invoice_due_days | integer | Yes | Days after invoice creation before it expires (min: 1). Required in invoice mode |
| subscription_end_at | integer | No | Unix timestamp for subscription termination (0 = never) |
| canceled_url | string | No | Redirect URL after subscription cancellation |


#### Response Example


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

### 6.7 Query Subscription

**GET** /v1/acquiring/subscription?merchant_sub_id={merchant_sub_id}

Returns the subscription detail by merchant subscription ID.

#### Subscription Status Field Description

| Value | Description |
|  --- | --- |
| `pending` | Awaiting first payment |
| `active` | Active subscription |
| `canceled` | Canceled |


#### Response Example


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

### 6.8 Cancel Subscription

**POST** /v1/acquiring/subscription/cancel

Used to cancel an active subscription. The subscription remains usable until the end of the current billing period.

#### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| merchant_sub_id | string | Yes | Merchant-defined subscription ID |
| cancel_reason | string | Yes | Cancel reason: `user_request`, `by_merchant_api`, or `by_operation` |
| note | string | No | Optional cancellation note |


#### Response Example


```json
{
  "subscription_id": "sub-xxxx",
  "merchant_sub_id": "msub_001",
  "status": "canceled",
  "canceled_at": 1742678400,
  "cancel_reason": "by_merchant_api"
}
```

### 6.9 Card

Card endpoints are used to apply for, list, and retrieve information for cards issued to your members. They use the same **`/v1/acquiring`** prefix as the other merchant APIs in this chapter.

#### Card identifier (important)

- The only card identifier merchants use is the internal **`id`**: **`data.id`** from **`POST /v1/acquiring/card/apply`**, **`cards[].id`** from **`GET /v1/acquiring/card/list`**, and the **`id`** you pass to **`GET /v1/acquiring/card/status`** / **`POST /v1/acquiring/card/reveal`** must all be the same value.


#### Authentication and Permissions

- All endpoints use the same HMAC-SHA256 authentication as the rest of the merchant API: **`Date`**, **`Digest`** (when the request has a body), and **`Authorization`** with **`keyId`** — see [Chapter 4: Authorization and Security Mechanisms](/docs/en/4-authorization).


**API key permissions:**

| Permission | Endpoints |
|  --- | --- |
| `card.create` | `POST /v1/acquiring/card/apply`, `GET /v1/acquiring/card/list`, `GET /v1/acquiring/card/status` |
| `card.reveal` | `POST /v1/acquiring/card/reveal` |


> **IP whitelist:** API keys that include `card.create` or `card.reveal` must be configured with a non-empty IP whitelist when created or updated in the merchant dashboard.


#### Response Envelope

All endpoints use the standard `code` / `message` / `data` envelope. Business success is indicated by `code === 0`; a non-zero `code` indicates an error and `message` carries the details.

#### 6.9.1 Apply Card

**POST** /v1/acquiring/card/apply

Creates a card application / top-up flow for a member.

- **Required permission:** `card.create`


On success, **`data.id`** is your card’s internal **`id`** (shared with list, status, and reveal — see **Card identifier** above).

##### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| product_id | integer | Yes | Product ID from backend configuration (minimum 1) |
| top_up_amount | string | Yes | Initial top-up amount (decimal string) |
| token_type | string | Yes | Token type, e.g. `USDT`, `USDC` |
| user_email | string | Yes | Member login email; must belong to the merchant account tied to your **API key** (`keyId` in `Authorization`) |
| holder_name | string | Yes | Name printed / held on the card |
| card_alias | string | No | Optional nickname for the card |


##### Request Example


```json
{
  "product_id": 1,
  "top_up_amount": "100.00",
  "token_type": "USDT",
  "user_email": "jane@example.com",
  "holder_name": "Jane Doe",
  "card_alias": "Travel card"
}
```

##### Response Example


```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": "a441831c-a5c7-4bed-8f61-793738afd5bc",
    "status": "init",
    "total_top_up_amount": "100.00",
    "total_fee": "1.00",
    "total_pay_amount": "101.00",
    "message": ""
  }
}
```

##### Response Fields

| Field | Type | Description |
|  --- | --- | --- |
| id | string | Internal card **`id`**; matches **`cards[].id`**, **`GET /v1/acquiring/card/status`**, and **`POST /v1/acquiring/card/reveal`** |
| status | string | Lifecycle status: `init`, `pending`, `active`, `suspend`, `deleted` |
| total_top_up_amount | string | Total top-up amount |
| total_fee | string | Total fee |
| total_pay_amount | string | Total amount the user pays |
| message | string | Optional status message |


#### 6.9.2 List Cards

**GET** /v1/acquiring/card/list

Returns a paginated list of cards for the merchant. Each **`cards[].id`** matches apply, card status polling, and reveal.

- **Required permission:** `card.create`


##### Query Parameters

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| status | string | No | Filter by card status; comma-separate multiple values, e.g. `active,pending` |
| card_alias | string | No | Filter by card alias |
| page | integer | No | Page number, starting at 1 (default 1) |
| page_size | integer | No | Items per page, 1–100 (default 20) |


##### Response Example


```json
{
  "code": 0,
  "message": "",
  "data": {
    "cards": [
      {
        "id": "a441831c-a5c7-4bed-8f61-793738afd5bc",
        "mask": "411111******1111",
        "holder_name": "Jane Doe",
        "card_alias": "Travel card",
        "status": "active",
        "currency": "USD",
        "available_balance": "50.25",
        "user_id": "usr_01HXYZ",
        "created_at": 1714464000,
        "updated_at": 1714550400
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

##### `data.cards[]` Fields

| Field | Type | Description |
|  --- | --- | --- |
| id | string | Internal card **`id`** (same everywhere in this chapter) |
| mask | string | Masked PAN; empty until issuance / activation is complete |
| holder_name | string | Cardholder name |
| card_alias | string | Card alias |
| status | string | Card status |
| currency | string | Card currency |
| available_balance | string | Available balance |
| user_id | string | Cardholder user ID |
| created_at | integer (int64) | Created at, **Unix seconds** |
| updated_at | integer (int64) | Updated at, **Unix seconds** |


#### 6.9.3 Get Card Status

**GET** `/v1/acquiring/card/status?id={id}`

Returns lifecycle status and summary fields for one card. After **`POST /v1/acquiring/card/apply`**, poll until **`status`** becomes **`active`**.

- **Required permission:** `card.create`


##### Query parameters

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| id | string | Yes | Internal card **`id`** — same as **`data.id`** from apply or **`cards[].id`** from the list |


##### Response example

While **`pending`**, **`mask`** may be empty and **`available_balance`** may read **`0`**.


```json
{
  "code": 0,
  "message": "",
  "data": {
    "id": "a441831c-a5c7-4bed-8f61-793738afd5bc",
    "status": "pending",
    "card_alias": "Travel card",
    "mask": "",
    "holder_name": "Jane Doe",
    "currency": "USD",
    "available_balance": "0",
    "user_id": "usr_01HXYZ",
    "created_at": 1714464000,
    "updated_at": 1714464100
  }
}
```

##### Response fields

| Field | Type | Description |
|  --- | --- | --- |
| id | string | Echoes the queried **`id`** |
| status | string | **`init`** / **`pending`** / **`active`** / **`suspend`** / **`deleted`** |
| card_alias | string | Optional card alias |
| mask | string | Masked PAN; empty until issuance finishes |
| holder_name | string | Cardholder name |
| currency | string | Card currency |
| available_balance | string | Available balance; may be **`0`** before activation |
| user_id | string | Cardholder user ID |
| created_at | integer (int64) | Created at, **Unix seconds** |
| updated_at | integer (int64) | Updated at, **Unix seconds** |


#### 6.9.4 Reveal Card

**POST** /v1/acquiring/card/reveal

Returns the full PAN, CVV, and expiry — **sensitive data**. Do not log or persist these values in client applications.

The request body **`id`** must match the internal identifier described under **Card identifier**.

- **Required permission:** `card.reveal`


##### Request Body

| Field | Type | Required | Description |
|  --- | --- | --- | --- |
| id | string | Yes | Same **`id`** as **`data.id`** from **`POST /v1/acquiring/card/apply`** or **`cards[].id`** from **`GET /v1/acquiring/card/list`**. |


##### Request Example


```json
{
  "id": "a441831c-a5c7-4bed-8f61-793738afd5bc"
}
```

##### Response Example


```json
{
  "code": 0,
  "message": "",
  "data": {
    "card_number": "4111111111111111",
    "cvv": "123",
    "expiration_mmyy": "1228",
    "card_currency": "USD"
  }
}
```

##### Response Fields

| Field | Type | Description |
|  --- | --- | --- |
| card_number | string | Full PAN |
| cvv | string | Card CVV |
| expiration_mmyy | string | Expiration in **MMYY** (four characters), e.g. `1228` for December 2028 |
| card_currency | string | Card currency |


### 6.10 Webhook (Order & Subscription Status Callback)

Merchants can configure Webhook receiving address in the backend. When order or subscription status changes, Infini will actively push the following events:

**Order events:**

- order.created
- order.processing
- order.completed
- order.expired
- order.late_payment


**Subscription events:**

- subscription.update
- subscription.cancel


#### Webhook Headers

| Header | Description |
|  --- | --- |
| X-Webhook-Timestamp | Unix timestamp |
| X-Webhook-Event-Id | Unique event ID |
| X-Webhook-Signature | Webhook HMAC signature |


#### Webhook Payload Example


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

#### Subscription Webhook Payload Example


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

> **Note:** `next_invoice_at`, `cancel_reason`, and `canceled_at` are only included when the corresponding values are present. For example, `cancel_reason` and `canceled_at` only appear in `subscription.cancel` events.


For Webhook signature verification methods, please refer to **Chapter 4: Authorization and Security Mechanisms**.

### 6.11 Error Codes

All error response format:


```json
{
  "code": 40001,
  "message": "Invalid request",
  "detail": "expires_at must be greater than current timestamp"
}
```

#### Common Error Codes

| HTTP | Code | Description |
|  --- | --- | --- |
| 400 | 40003 | amount must be positive |
| 400 | 40006 | amount must be greater than 0.01 |
| 401 | 401 | Invalid HMAC signature |
| 404 | 40401 | Order does not exist |
| 409 | 40902 | client_reference duplicate |
| 409 | 40906 | Order expired |
| 404 | 43000 | Subscription not found |
| 400 | 43002 | Subscription already canceled |


### 6.12 Python Example (Hosted Checkout Mode)

The following example demonstrates the complete flow: Create Order → Redirect to Checkout → Webhook → Reissue Token.

#### 6.12.1 Create Order


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
        json={
            "amount": amount,
            "currency": "USD",
            "client_reference": "ORDER-2024-001",
            "description": "Product purchase",
            "expires_at": int(time.time()) + 3600
        },
        headers={
            "Date": gmt_time,
            "Authorization": f'Signature keyId="{key_id}",algorithm="hmac-sha256",headers="@request-target date",signature="{signature}"',
            "Content-Type": "application/json"
        }
    )

    response.raise_for_status()
    return response.json()
```

#### 6.12.2 Frontend Redirect to Checkout


```python
@app.route('/create-payment', methods=['POST'])
def create_payment():
    order = create_order(amount=request.json['amount'])
    return {"checkout_url": order["checkout_url"]}
```

#### 6.12.3 Webhook Callback Handling


```python
@app.route('/webhook', methods=['POST'])
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

#### 6.12.4 Reissue Checkout Token


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
        json={"order_id": order_id},
        headers={
            "Date": gmt_time,
            "Authorization": f'Signature keyId="{key_id}",algorithm="hmac-sha256",headers="@request-target date",signature="{signature}"',
            "Content-Type": "application/json"
        }
    )

    response.raise_for_status()
    return response.json()
```