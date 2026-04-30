# EPUSDT 在 new-api 中的配置说明

本文档说明当前仓库里 EPUSDT 支付网关的实际配置方式，重点回答两个问题：

- Cloudflare Tunnel 之外，new-api 后台还要配置什么
- 哪些地址应该填宿主机端口，哪些地址应该填 Docker 内网地址

当前实现已经把 EPUSDT 接入到现有支付体系中，和 Infini / Stripe / Creem / 易支付并列，覆盖以下场景：

- 用户在线充值
- 订阅套餐购买
- EPUSDT 异步回调
- 充值历史与订阅支付方式展示

## 1. 端口与地址关系

当前 EPUSDT 容器是双端口部署：

| 用途 | 宿主机地址 | 容器内地址 | 是否建议给 Cloudflare Tunnel |
| --- | --- | --- | --- |
| 用户支付页 | `http://127.0.0.1:50505` | `http://epusdt:8000` | 是 |
| 管理后台 / 内部 API | `http://127.0.0.1:50506` | `http://epusdt:8001` | 否 |

说明：

- Cloudflare Tunnel 只需要指向 `http://127.0.0.1:50505`。
- 不要把普通公开 Tunnel 指向 `50506`，否则会把 EPUSDT 管理后台和内部创建订单接口暴露出去。
- new-api 和 EPUSDT 在同一个 Docker 网络里时，new-api 后端应访问 `http://epusdt:8001`。
- 如果 new-api 不是跑在 Docker 容器里，而是直接跑在宿主机上，才使用 `http://127.0.0.1:50506` 作为 EPUSDT 内部 API 地址。

## 2. 配置位置总览

### 2.1 new-api 后台内配置

EPUSDT 的业务配置统一在 new-api 后台完成，不需要改 `new-api` 的 `.env`。

配置入口：

- `后台 -> 设置 -> 支付设置 -> 通用设置`
- `后台 -> 设置 -> 支付设置 -> EPUSDT 设置`

### 2.2 EPUSDT 侧配置

EPUSDT 侧需要准备：

- API Key 的 `PID`
- API Key 的 `Secret Key`
- 可用收款钱包
- 支持的链与币种
- EPUSDT 自身公开支付页地址，也就是 Cloudflare Tunnel 域名

## 3. new-api 后台里要配置什么

### 3.1 通用设置

位置：

- `后台 -> 设置 -> 支付设置 -> 通用设置`

需要填写：

| 配置项 | 必填 | 作用 |
| --- | --- | --- |
| `ServerAddress` | 建议 | new-api 对外访问地址。用于默认支付后跳转地址。 |
| `CustomCallbackAddress` | 可选 | 如果回调要走单独公网域名，就填这个。 |

说明：

- 如果 `EpusdtNotifyURL` 单独填写了内网回调地址，那么 EPUSDT 启用判断不强依赖 `ServerAddress`。
- 但 `ServerAddress` 仍建议填写正确，因为支付完成后的默认跳转地址会用到它。

### 3.2 EPUSDT 设置

位置：

- `后台 -> 设置 -> 支付设置 -> EPUSDT 设置`

需要填写：

| 配置项 | 推荐值 | 必填 | 作用 |
| --- | --- | --- | --- |
| `EpusdtEnabled` | `true` | 是 | 是否启用 EPUSDT 支付 |
| `EpusdtBaseURL` | `http://epusdt:8001` | 是 | new-api 后端访问 EPUSDT 的内部 API 地址 |
| `EpusdtPublicURL` | Cloudflare Tunnel 域名 | 是 | 用户浏览器实际打开的 EPUSDT 支付页地址 |
| `EpusdtPID` | EPUSDT API Key PID | 是 | 创建订单和回调验签使用 |
| `EpusdtSecretKey` | EPUSDT API Key Secret Key | 是 | 创建订单签名和回调验签使用 |
| `EpusdtCurrency` | `usd` | 是 | 创建 EPUSDT 订单时使用的法币 |
| `EpusdtToken` | `usdt` | 是 | 创建 EPUSDT 订单时使用的币种 |
| `EpusdtNetwork` | `tron` | 是 | 创建 EPUSDT 订单时默认使用的链 |
| `EpusdtPaymentType` | `GMPAY` | 是 | 保持 `GMPAY`，用于兼容当前 JSON 回调 |
| `EpusdtNotifyURL` | `http://new-api:3000/api/epusdt/webhook` | 建议 | EPUSDT 回调 new-api 的地址 |
| `EpusdtReturnURL` | `https://你的new-api域名/console/topup?show_history=true` | 可选 | 用户支付后跳回 new-api 的地址 |
| `EpusdtUnitPrice` | `1` | 是 | new-api 每个充值单位对应的 USD 金额 |
| `EpusdtMinTopUp` | 例如 `1` | 是 | 最低充值数量 |

当前 Docker 部署推荐值：

```text
EpusdtBaseURL=http://epusdt:8001
EpusdtNotifyURL=http://new-api:3000/api/epusdt/webhook
EpusdtPaymentType=GMPAY
EpusdtCurrency=usd
EpusdtToken=usdt
EpusdtNetwork=tron
```

当前站点的后台金额单位是 USD，因此 EPUSDT 也应使用 `usd`，并把 `EpusdtUnitPrice` 设为 `1`。EPUSDT 对 `USDT + USD` 的汇率按 1:1 处理，不依赖 CNY 汇率。

`EpusdtPublicURL` 应填写 Cloudflare Tunnel 给 `50505` 生成的公开域名，例如：

```text
https://pay.example.com
```

不要填：

```text
http://127.0.0.1:50505
```

原因是用户浏览器里的 `127.0.0.1` 指的是用户自己的电脑，不是服务器。

## 4. EPUSDT 侧要配置什么

### 4.1 Cloudflare Tunnel

Tunnel 指向：

```text
http://127.0.0.1:50505
```

这个端口只提供用户支付页和支付页需要的状态接口。

不要把普通公开 Tunnel 指向：

```text
http://127.0.0.1:50506
```

`50506` 是 EPUSDT 管理后台和内部 API 端口。如果以后确实要远程访问 EPUSDT 管理后台，建议单独配置 Cloudflare Access 后再暴露。

### 4.2 EPUSDT 公开访问地址

EPUSDT 生成 `payment_url` 时会使用它自己的 `app_uri`。

建议把 EPUSDT 的公开访问地址设置为 Cloudflare Tunnel 域名，例如：

```text
https://pay.example.com
```

同时在 new-api 后台也把 `EpusdtPublicURL` 填成同一个域名。这样即使 EPUSDT 返回了容器或本机地址，new-api 也会把支付链接改写成浏览器可访问的公开地址。

### 4.3 API Key

在 EPUSDT 管理后台准备或查看 API Key：

- `PID`
- `Secret Key`

然后把它们填回 new-api 后台：

- `EpusdtPID`
- `EpusdtSecretKey`

`EpusdtSecretKey` 保存后不会在 new-api 后台回显。

### 4.4 收款配置

在 EPUSDT 管理后台至少确认：

- 对应链已启用，例如 `tron`
- 对应币种已启用，例如 `usdt`
- 至少有一个可用收款钱包地址
- EPUSDT 能正常监听链上到账

new-api 的 `EpusdtCurrency` / `EpusdtToken` / `EpusdtNetwork` 必须和 EPUSDT 侧启用的配置匹配。

## 5. 推荐填写顺序

### 第一步：先配置 Cloudflare Tunnel

把 Tunnel 指向：

```text
http://127.0.0.1:50505
```

拿到公开域名，例如：

```text
https://pay.example.com
```

### 第二步：配置 EPUSDT 自身

在 EPUSDT 管理后台或配置中确认：

- 公开访问地址使用 Cloudflare Tunnel 域名
- API Key 可用
- 收款钱包、链、币种可用

### 第三步：配置 new-api 通用设置

在 new-api 后台：

- `后台 -> 设置 -> 支付设置 -> 通用设置`

填写：

- `ServerAddress=https://你的new-api域名`
- 如有独立回调域名，再填 `CustomCallbackAddress`

### 第四步：配置 new-api 的 EPUSDT 设置

在 new-api 后台：

- `后台 -> 设置 -> 支付设置 -> EPUSDT 设置`

填写：

```text
EpusdtEnabled=true
EpusdtBaseURL=http://epusdt:8001
EpusdtPublicURL=https://pay.example.com
EpusdtPID=你的 EPUSDT PID
EpusdtSecretKey=你的 EPUSDT Secret Key
EpusdtCurrency=usd
EpusdtToken=usdt
EpusdtNetwork=tron
EpusdtPaymentType=GMPAY
EpusdtNotifyURL=http://new-api:3000/api/epusdt/webhook
EpusdtReturnURL=https://你的new-api域名/console/topup?show_history=true
EpusdtUnitPrice=1
EpusdtMinTopUp=1
```

## 6. 哪些配置是系统内完成，哪些是 EPUSDT 侧完成

### 6.1 new-api 后台可直接完成

- `ServerAddress`
- `CustomCallbackAddress`
- `EpusdtEnabled`
- `EpusdtBaseURL`
- `EpusdtPublicURL`
- `EpusdtPID`
- `EpusdtSecretKey`
- `EpusdtCurrency`
- `EpusdtToken`
- `EpusdtNetwork`
- `EpusdtPaymentType`
- `EpusdtNotifyURL`
- `EpusdtReturnURL`
- `EpusdtUnitPrice`
- `EpusdtMinTopUp`

### 6.2 EPUSDT 侧必须准备

- Cloudflare Tunnel 指向 `127.0.0.1:50505`
- EPUSDT 公开访问地址
- API Key 的 `PID`
- API Key 的 `Secret Key`
- 可用收款钱包
- 可用链与币种

## 7. 最终验收清单

上线前逐项确认：

- Cloudflare Tunnel 指向 `http://127.0.0.1:50505`
- 没有把普通公开 Tunnel 指向 `50506`
- `EpusdtBaseURL` 是 `http://epusdt:8001`
- `EpusdtPublicURL` 是 Cloudflare Tunnel 域名
- `EpusdtNotifyURL` 是 `http://new-api:3000/api/epusdt/webhook`
- `EpusdtPID` 和 `EpusdtSecretKey` 与 EPUSDT API Key 一致
- `EpusdtCurrency` / `EpusdtToken` / `EpusdtNetwork` 和 EPUSDT 收款配置一致
- 前端充值页能看到 EPUSDT 入口
- 订阅购买弹窗能看到 EPUSDT 支付入口
- 拉起支付后，浏览器打开的是 Cloudflare Tunnel 域名
- 支付成功后，本地充值或订阅订单状态正确更新

## 8. 结论

当前部署里要分清两组端口：

- 宿主机端口：`50505` 给用户支付页，`50506` 给管理后台和内部 API
- 容器内端口：`8000` 给用户支付页，`8001` 给管理后台和内部 API

对 Cloudflare Tunnel：

- 使用 `127.0.0.1:50505`

对 new-api 后端：

- 使用 `http://epusdt:8001`

这两个配置不是同一个视角，不要混用。
