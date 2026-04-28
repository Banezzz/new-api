package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/require"
)

func TestGetEpusdtPayMoney(t *testing.T) {
	originalUnitPrice := setting.EpusdtUnitPrice
	originalQuotaDisplayType := operation_setting.GetGeneralSetting().QuotaDisplayType
	originalDiscounts := make(map[int]float64, len(operation_setting.GetPaymentSetting().AmountDiscount))
	for k, v := range operation_setting.GetPaymentSetting().AmountDiscount {
		originalDiscounts[k] = v
	}
	originalTopupGroupRatio := common.TopupGroupRatio2JSONString()

	t.Cleanup(func() {
		setting.EpusdtUnitPrice = originalUnitPrice
		operation_setting.GetGeneralSetting().QuotaDisplayType = originalQuotaDisplayType
		operation_setting.GetPaymentSetting().AmountDiscount = originalDiscounts
		require.NoError(t, common.UpdateTopupGroupRatioByJSONString(originalTopupGroupRatio))
	})

	setting.EpusdtUnitPrice = 1
	operation_setting.GetPaymentSetting().AmountDiscount = map[int]float64{
		10: 0.8,
	}
	require.NoError(t, common.UpdateTopupGroupRatioByJSONString(`{"default":1,"vip":1.5}`))

	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD
	require.InDelta(t, 12, getEpusdtPayMoney(10, "vip"), 0.000001)
}

func TestResolveEpusdtURLs(t *testing.T) {
	originalNotifyURL := setting.EpusdtNotifyURL
	originalReturnURL := setting.EpusdtReturnURL
	originalCallbackAddress := operation_setting.CustomCallbackAddress
	originalServerAddress := system_setting.ServerAddress
	t.Cleanup(func() {
		setting.EpusdtNotifyURL = originalNotifyURL
		setting.EpusdtReturnURL = originalReturnURL
		operation_setting.CustomCallbackAddress = originalCallbackAddress
		system_setting.ServerAddress = originalServerAddress
	})

	setting.EpusdtNotifyURL = ""
	operation_setting.CustomCallbackAddress = "http://new-api:3000/"
	notifyURL, err := getEpusdtNotifyURL()
	require.NoError(t, err)
	require.Equal(t, "http://new-api:3000/api/epusdt/webhook", notifyURL)

	setting.EpusdtReturnURL = ""
	system_setting.ServerAddress = "https://console.example.com/"
	returnURL, err := getEpusdtReturnURL()
	require.NoError(t, err)
	require.Equal(t, "https://console.example.com/console/topup?show_history=true", returnURL)

	setting.EpusdtNotifyURL = "not-a-url"
	_, err = getEpusdtNotifyURL()
	require.Error(t, err)
}
