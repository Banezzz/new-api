package setting

var (
	EpusdtEnabled     bool
	EpusdtBaseURL     string
	EpusdtPublicURL   string
	EpusdtPID         string
	EpusdtSecretKey   string
	EpusdtCurrency    string = "usd"
	EpusdtToken       string = "usdt"
	EpusdtNetwork     string = "tron"
	EpusdtPaymentType string = "GMPAY"
	EpusdtNotifyURL   string
	EpusdtReturnURL   string
	EpusdtUnitPrice   float64 = 1
	EpusdtMinTopUp    int     = 1
)
