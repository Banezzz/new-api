## 11. Supported Blockchains and Test Networks

### 11.1 Mainnet Supported Blockchains

#### **USDC Supported Chains:**

| Token | Supported Blockchains |
|  --- | --- |
| **USDC** | Ethereum, Arbitrum, Solana, Base, Polygon, Binance Smart Chain |


#### **USDT Supported Chains:**

| Token | Supported Blockchains |
|  --- | --- |
| **USDT** | Tron, Ethereum, Arbitrum, Solana, Base, Polygon, Binance Smart Chain |


> We will continue to expand more mainstream blockchains and Layer2 networks.


### 11.2 Test Network (Testnet) Description

#### 11.2.1 Cryptocurrency Testnet

Currently available testnet for actual on-chain payment testing:

**✅ Tron Testnet (Nile Testnet)**

Currently supported test tokens:

| Chain | Available Tokens |
|  --- | --- |
| **Tron Testnet (Nile)** | **USDT (Test Token)** |


**❗ When making payment, please select:**

- **Blockchain: Tron Testnet**
- **Token: USDT**


#### 11.2.2 Card Payment Testing (Pay With Card)

To test card payment functionality, you can use the following test card:

| Test Card Number | Description |
|  --- | --- |
| **4000000000000085** | For testing Pay With Card functionality |


*Note:*

- *This card number is only for testing environment and cannot be used in production*
- *Expiry Date and CVV can be entered with any values*


### 11.3 How to Make Payments on Testnet? (Operation Guide)

#### **Step 1: Install TronLink Wallet**

**TronLink** browser extension wallet:

👉 https://www.tronlink.org/

#### **Step 2: Switch to Testnet**

Open TronLink → Network → Select:


```
Nile Testnet
```

#### **Step 3: Get Test Tokens**

You need two test assets:

- TRX (for Gas)
- USDT (test version stablecoin)


Test token faucet (official):

👉 https://nileex.io/join/getJoinPage
(Claim Test Coins and USDT Test Coins)

#### **Step 4: Initiate Test Payment**

After entering Infini's test environment checkout page:

- Switch wallet to Nile Testnet
- Select payment method: **USDT (Tron Testnet)**
- Pay with test tokens


#### **Step 5: View Payment Result**

Infini will automatically detect:

- On-chain transaction submission
- Transaction confirmation
- Whether amount is sufficient


Order status will automatically update to:

- processing
- paid
- expired
- late_payment


Webhooks will also be triggered normally and can be used for joint debugging.

### 11.4 Frequently Asked Questions (FAQ)

#### Q1: What if testnet payment fails?

Please confirm:

- Is wallet on **Nile Testnet**
- Does wallet have **USDT Test Coins**
- Does wallet have enough **TRX** for Gas


#### Q2: Will testnet orders generate real assets?

No, all tokens on testnet are for testing purposes only and have no actual value.