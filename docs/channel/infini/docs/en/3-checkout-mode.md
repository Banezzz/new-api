## 3. Integration Mode: Hosted Checkout

Hosted Checkout is a standardized payment integration solution provided by Infini. Merchants only need to call one API to create an order and redirect users to the Infini-hosted payment page to complete the entire process from currency selection, payment guidance to on-chain transaction monitoring.

### 3.1 Mode Overview

In this mode, Infini will be responsible for:

- UI display of the payment page (supporting multiple languages)
- Currency, network, and multiple payment method selection logic (including on-chain payments, Binance Pay, Onramp purchase, and other expandable capabilities)
- Generation and display of payment guidance, QR codes, payment addresses, or third-party payment links
- On-chain transaction monitoring, payment confirmation, and status synchronization
- Order status updates and Webhook callback push
- Exception scenario handling (timeout, partial payment, duplicate payment, late payment, etc.)


> Hosted Checkout mode supports future expansion of more payment methods, and merchants do not need to modify front-end logic additionally.


### 3.2 Integration Flow

The typical flow of Hosted Checkout mode is as follows:

1. **Merchant system initiates order creation request**


- Call POST /v1/acquiring/order
- Provide order amount, currency, expiration time, merchant display name (optional)
- Returns order_id and checkout_url


1. **Merchant front-end redirects user to checkout_url**


- User enters hosted checkout page
- Displays currency, network, payment amount, countdown, and other information


1. **User completes on-chain payment**


- Select token and network
- Make on-chain transfer
- Infini automatically detects the transaction and starts confirmation


1. **Infini processes payment status**


- Update order status based on on-chain confirmations (processing/paid/expired, etc.)


1. **User views payment result**


- Hosted checkout displays payment success page


1. **Infini pushes Webhook to merchant**


- Webhook notifies order status changes
- Merchant executes business actions such as shipping and granting permissions based on events


### 3.3 Minimum Integration Work for Merchants

Hosted Checkout mode only requires implementing the following three items to go live:

- **Call Create Order API**
- **Redirect user to checkout_url**
- **Handle Webhook callback events**