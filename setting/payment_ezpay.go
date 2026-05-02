package setting

var (
	EzpayEnabled     bool
	EzpayBaseURL     string
	EzpayPublicURL   string
	EzpayPID         string
	EzpaySecretKey   string
	EzpayCurrency    string = EzpayDefaultCurrency
	EzpayToken       string = EzpayDefaultToken
	EzpayNetwork     string = EzpayDefaultNetwork
	EzpayPaymentType string = EzpayDefaultPaymentType
	EzpayNotifyURL   string
	EzpayReturnURL   string
	EzpayUnitPrice   float64 = 1
	EzpayMinTopUp    int     = 1
)

const (
	EzpayDefaultCurrency    = "usd"
	EzpayDefaultToken       = "usdt"
	EzpayDefaultNetwork     = "tron"
	EzpayDefaultPaymentType = "GMPAY"
)
