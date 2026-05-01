## 11. 支持的公链与测试网络说明

### 11.1 主网支持的公链（Mainnet Support）

#### **USDC 支持的链：**

| 代币 | 支持的公链 |
|  --- | --- |
| **USDC** | Ethereum、Arbitrum、Solana、Base、Polygon、Binance Smart Chain |


#### **USDT 支持的链：**

| 代币 | 支持的公链 |
|  --- | --- |
| **USDT** | Tron、Ethereum、Arbitrum、Solana、Base、Polygon、Binance Smart Chain |


> 后续我们将持续扩展更多主流公链与 Layer2 网络。


### 11.2 测试网络（Testnet）说明

#### 11.2.1 加密货币测试链

目前可用于实际链上测试付款的测试链为：

**✅ Tron Testnet（Nile Testnet）**

当前支持的测试代币：

| 链 | 可用代币 |
|  --- | --- |
| **Tron Testnet (Nile)** | **USDT（测试币）** |


**❗ 支付时请选择：**

- **公链：Tron Testnet**
- **代币：USDT**


#### 11.2.2 银行卡测试（Pay With Card）

测试银行卡支付功能时，可以使用以下测试卡：

| 测试卡号 | 说明 |
|  --- | --- |
| **4000000000000085** | 用于测试 Pay With Card 功能 |


*注意：*

- *该卡号仅用于测试环境，无法在生产环境使用*
- *有效期（Expiry Date）和 CVV 可以随意输入*


### 11.3 如何在测试网付款？（操作指南）

#### **步骤 1：安装 TronLink 钱包**

**TronLink** 浏览器插件钱包：

👉 https://www.tronlink.org/

#### **步骤 2：切换至测试网**

打开 TronLink → Network → 选择：


```
Nile Testnet
```

#### **步骤 3：获取测试币**

你需要两个测试资产：

- TRX（用于 Gas）
- USDT（测试版稳定币）


测试币获取地址（官方水龙头）：

👉 https://nileex.io/join/getJoinPage
（领取 Test Coins 与 USDT Test Coins）

#### **步骤 4：发起测试支付**

进入 Infini 的测试环境收银台页面后：

- 将钱包切换为 Nile Testnet
- 选择支付方式：**USDT（Tron Testnet）**
- 支付测试代币


#### **步骤 5：查看支付结果**

Infini 会自动检测：

- 链上交易上链
- 交易确认
- 金额是否足额


订单状态会自动更新为：

- processing
- paid
- expired
- late_payment


Webhook 也会正常触发，可用于联调。

### 11.4 常见问题（FAQ）

#### Q1：测试网支付失败怎么办？

请确认：

- 钱包是否处于 **Nile Testnet**
- 钱包里是否有 **USDT Test Coins**
- 钱包是否有足够的 **TRX** 用于 Gas


#### Q2：测试网订单会产生真实资产吗？

不会，测试链所有代币均为测试用途，不具备实际价值。