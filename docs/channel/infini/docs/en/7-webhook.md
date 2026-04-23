## 7. Webhook (Order & Subscription Status Callback)

Infini sends HTTP POST requests to the merchant's pre-configured Webhook address when order or subscription status changes, notifying the latest status and exceptions, facilitating shipping, service activation, inventory unlock, and customer service handling.

### 7.1 Subscribable Events and Event Types

Subscription types can be configured in the merchant backend, with different subscription types corresponding to the following events:

**Order events:**

- Subscribe to order.create → will receive:
  - order.create
- Subscribe to order.update → will receive:
  - order.processing
  - order.completed
  - order.expired
  - order.late_payment


**Order Event Type Description:**

- order.created: Order created successfully, entering awaiting payment status.
- order.processing: Order entering processing (received partial payment or pending on-chain transaction confirmations).
- order.completed: Order amount satisfied, order status is paid.
- order.expired: Order not completed within validity period, expired.
- order.late_payment: Payment received after order expiration (within 24 hours).


**Subscription events:**

- Subscribe to subscription.update → will receive:
  - subscription.update
- Subscribe to subscription.cancel → will receive:
  - subscription.cancel


**Subscription Event Type Description:**

- subscription.update: Subscription status updated (e.g. activated after first payment, billing period renewed after successful renewal payment).
- subscription.cancel: Subscription canceled (by merchant API, user unsubscribe, or system due to non-payment).


#### 7.1.1 Testing Tool

If you just want to check if events are triggered and see the real webhook fields, you can use [Webhook Cool](https://webhook.cool/) testing tool, which provides you with a unique WEBHOOK URL to receive these events.

### 7.2 Webhook Payload Field Description

#### Order Webhook Payload Fields

Webhook request body is in JSON format, including fields:

- event: Event type (e.g. order.create)
- order_id: Unique order identifier
- client_reference: Merchant-side order number (i.e. client_reference)
- amount: Order payable amount (fiat amount)
- currency: Order currency (e.g. USD)
- status: Order status:
  - pending
  - processing
  - paid
  - partial_paid
  - expired
- amount_confirming: Confirming amount (on-chain transaction exists but has not reached confirmation requirement)
- amount_confirmed: Confirmed amount (on-chain confirmation completed)
- created_at: Order creation time (Unix timestamp, seconds)
- updated_at: Order last update time (Unix timestamp, seconds)
- exception_tags (if any): Order exception tag array (e.g. ["underpaid", "late"]), see "Core Business Concepts" chapter for details


> Note:


- amount_confirmed + amount_confirming reflects the total payment amount identified on-chain.
- Order status combined with expiration status, confirmed/confirming amounts constitute the current order semantics.


#### Subscription Webhook Payload Fields

Subscription webhook request body is in JSON format, including fields:

- event: Event type (`subscription.update` or `subscription.cancel`)
- subscription_id: System-generated subscription ID
- merchant_sub_id: Merchant-defined subscription ID
- plan_name: Subscription plan name
- trigger_method: Billing trigger method (e.g. `invoice`)
- status: Subscription status:
  - pending
  - active
  - canceled
- currency: Subscription currency (e.g. USD)
- amount: Recurring amount per billing period
- interval_unit: Billing interval unit (`DAY` or `MONTH`)
- interval_count: Number of intervals per billing cycle
- payer_email: Payer email address
- current_period_start: Current billing period start time (Unix timestamp, seconds)
- current_period_end: Current billing period end time (Unix timestamp, seconds)
- subscription_end_at: Subscription termination time (Unix timestamp, seconds)
- next_invoice_at: Next invoice send time (Unix timestamp, seconds)
- cancel_reason: Cancel reason (included only when subscription is canceled)
- canceled_at: Cancel time (Unix timestamp, seconds; included only when subscription is canceled)
- created_at: Subscription creation time (Unix timestamp, seconds)
- updated_at: Subscription last update time (Unix timestamp, seconds)


### 7.3 Webhook Request Headers

When sending Webhooks, Infini includes the following HTTP Headers for security verification and idempotent processing:

- Content-Type: application/json
- X-Webhook-Timestamp: Unix timestamp (seconds)
- X-Webhook-Event-Id: Unique event identifier, used for idempotent deduplication
- X-Webhook-Signature: HMAC-SHA256 signature, used for merchant-side signature verification


> It is recommended that merchants use X-Webhook-Event-Id for idempotent processing to avoid duplicate consumption of the same event.


### 7.4 Webhook Example Payloads

The following examples show Webhook content in typical scenarios.

#### 7.4.1 Scenario 1: Order Created (order.created)

After order creation, status is pending, waiting for user payment.


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

#### 7.4.2 Scenario 2: Order Processing (Payment Received, Confirming, order.processing)

Payment received, but transaction still confirming on blockchain.


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

#### 7.4.3 Scenario 3: Order Processing (Partial Payment Confirmed, order.processing)

Partial payment has been confirmed on blockchain.


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

#### 7.4.4 Scenario 4: Order Completed (Full Payment Received, order.completed)

Full payment received and confirmed, order completed.


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

#### 7.4.5 Scenario 5: Order Expired (No Payment, order.expired)

Order timeout without receiving any payment.


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

#### 7.4.6 Scenario 6: Order Expired (Partial Payment Received, order.expired + partial_paid)

Order timeout but received partial payment, not reaching order amount.


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

#### 7.4.7 Scenario 7: Payment After Order Expiration (Late Payment, order.late_payment)

Payment received within 24 hours after order expiration.


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

> Tips:


- In late_payment scenarios, order status remains expired, but amount_confirmed has reached the order amount. Merchants can decide whether to ship or refund based on business strategy.
- It is recommended to make business decisions combined with exception tags (such as late, underpaid, overpaid).


#### 7.4.8 Scenario 8: Subscription Activated (subscription.update)

After first payment is completed, the subscription transitions from pending to active.


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

#### 7.4.9 Scenario 9: Subscription Renewed (subscription.update)

Renewal payment completed, billing period advanced to the next cycle.


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

#### 7.4.10 Scenario 10: Subscription Canceled (subscription.cancel)

Subscription canceled by merchant API, user unsubscribe, or system due to non-payment.


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

### 7.5 Receiving Webhook and Security Verification

Infini will initiate POST requests to your configured Webhook URL. It is recommended that the receiving end follows these principles:

1. Verify that all required Headers exist:


- X-Webhook-Signature
- X-Webhook-Timestamp
- X-Webhook-Event-Id


1. Verify signature legitimacy (see next section).
2. Implement idempotent processing based on X-Webhook-Event-Id (process only once).
3. Business logic should be **processed asynchronously**, quickly return HTTP 200 to avoid timeout.


### 7.6 Webhook Signature Verification

Verification steps:

1. Read from Headers:


- X-Webhook-Signature (signature)
- X-Webhook-Timestamp (timestamp)
- X-Webhook-Event-Id (event ID)


1. Get raw request body string payload.
2. Assemble signature content string:



```
{timestamp}.{event_id}.{payload}
```

1. Use your WEBHOOK_SECRET for HMAC-SHA256 calculation:



```python
signed_content = f"{timestamp}.{event_id}.{payload}"
expected_sig = hmac.new(
    WEBHOOK_SECRET.encode(),
    signed_content.encode(),
    hashlib.sha256
).hexdigest()
```

1. Compare expected_sig with X-Webhook-Signature for consistency.


#### 7.6.1 Python Verification Example


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

### 7.7 Webhook Retry Strategy

If the merchant does not return HTTP 200, Infini will retry the event.

- **Maximum retries: 8 times**
- **First 3 retry intervals: 30 seconds**
- **4th-8th retries use incremental backoff strategy**, example:


| Attempt | Description | Interval (Example) |
|  --- | --- | --- |
| 1st | First send | Immediate |
| 2nd | 1st failed | 30 seconds |
| 3rd | 2nd failed | 30 seconds |
| 4th | 3rd failed | 30 seconds |
| 5th | 4th failed | 60 seconds |
| 6th | 5th failed | 120 seconds |
| 7th | 6th failed | 240 seconds |
| 8th | 7th failed | 480 seconds |


> If multiple retries still fail, the event will be marked as delivery failed. It is recommended that merchants investigate through logs and reconciliation tools.