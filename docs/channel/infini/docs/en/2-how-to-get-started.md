## 2. How to Integrate and Use Infini API

This chapter will guide you through the complete process from registering an account, configuring keys, to API integration and Webhook setup, helping you quickly start using Infini's digital currency payment capabilities.

### Step 1: Register an Infini Business Account

- [**Production Environment Registration**：https://business.infini.money/register ](https://business.infini.money/register)
- [**Test Environment Registration**：https://business-sandbox.infini.money/register](https://business-sandbox.infini.money/register)
- **Production Environment API**：
https://openapi.infini.money
- **Test Environment API**：
https://openapi-sandbox.infini.money


After registration, you can log in to the merchant backend for further configuration.

### Step 2: Configure Checkout Basic Information

Go to **「Payments -> Cashier Settings」** in the backend to configure the following according to business needs:

- **Merchant Display Name**: Used to display the merchant or business line name on the payment page to improve user recognition. The initial default is the company name filled in during customer registration.


> If a merchant display name is passed through the API when creating an order, **the API parameter takes precedence**; the backend configuration serves as the default value.


- **Default Order Expiration Time**: Controls the valid payment time window for orders; orders not paid before expiration will be automatically marked as expired, and partially paid orders after expiration will be automatically marked as partial_paid. The initial default is 24 hours.


> If **expires_in** is passed through the API when creating an order, **the API parameter takes precedence**; the backend configuration only serves as the default expiration time.


### Step 3: Get Keys and Configure Security Policies on the Developer Page

Go to the backend「Developer」page and complete the following operations:

1. Generate and save key pair


- After creating an API key, the system will display:
  - Merchant Public Key
  - Merchant Private Key
- ⚠️ Important Note: The private key is only displayed once
Please be sure to back it up properly during the first display; if lost, you need to regenerate a new key pair.


1. Configure IP Whitelist


- When creating a key, you can configure an **IP whitelist** that is allowed to access the API.
- It is recommended to only fill in your production/test server outbound IP to enhance API call security.


### Step 4: Integrate API and Configure Webhook Notifications

1. Complete API Integration


- Complete the HMAC signature process according to documentation requirements.
- Develop the following interfaces according to business processes:
  - Create Order
  - Query Order
- It is recommended to debug in the test environment first, then switch to the production environment.


1. Configure Webhook Notification Address


- Fill in on the backend「Developer」page:
  - Webhook receiving URL
  - Subscribed event types
- The page will display **Infini's Webhook public key**, used for HMAC signature verification of callback notifications to ensure the notification source is authentic and reliable.


### Step 5: Use Website Builder Platform Plugins (In Development)

If you use mainstream website builder platforms, you can quickly integrate Infini through official plugins:

- Go to **「Payments -> Usage Guide」** in the backend to view and download various website builder platform plugins.
- Plugins provide one-click installation, allowing integration of payment capabilities without development.