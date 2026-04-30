package setting

var (
	EzpayEnabled   bool
	EzpayBaseURL   string
	EzpayPublicURL string
	EzpayPID       string
	EzpaySecretKey string
	EzpayNotifyURL string
	EzpayReturnURL string
	EzpayUnitPrice float64 = 1
	EzpayMinTopUp  int     = 1
)

const (
	// EZPay 收银台支持用户动态选择币种/网络，这些参数仅用于创建初始订单
	// 用户可以在支付页面切换到任何 EZPay 后台配置的币种和网络
	EzpayDefaultCurrency    = "usd"
	EzpayDefaultToken       = "usdt"
	EzpayDefaultNetwork     = "tron"
	EzpayDefaultPaymentType = "GMPAY"
)
