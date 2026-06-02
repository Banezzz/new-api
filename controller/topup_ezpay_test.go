package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/require"
)

func TestGetEzpayPayMoney(t *testing.T) {
	originalUnitPrice := setting.EzpayUnitPrice
	originalQuotaDisplayType := operation_setting.GetGeneralSetting().QuotaDisplayType
	originalDiscounts := make(map[int]float64, len(operation_setting.GetPaymentSetting().AmountDiscount))
	for k, v := range operation_setting.GetPaymentSetting().AmountDiscount {
		originalDiscounts[k] = v
	}
	originalTopupGroupRatio := common.TopupGroupRatio2JSONString()

	t.Cleanup(func() {
		setting.EzpayUnitPrice = originalUnitPrice
		operation_setting.GetGeneralSetting().QuotaDisplayType = originalQuotaDisplayType
		operation_setting.GetPaymentSetting().AmountDiscount = originalDiscounts
		require.NoError(t, common.UpdateTopupGroupRatioByJSONString(originalTopupGroupRatio))
	})

	setting.EzpayUnitPrice = 1
	operation_setting.GetPaymentSetting().AmountDiscount = map[int]float64{
		10: 0.8,
	}
	require.NoError(t, common.UpdateTopupGroupRatioByJSONString(`{"default":1,"vip":1.5}`))

	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD
	require.InDelta(t, 12, getEzpayPayMoney(10, "vip"), 0.000001)
}

func TestResolveEzpayURLs(t *testing.T) {
	originalNotifyURL := setting.EzpayNotifyURL
	originalReturnURL := setting.EzpayReturnURL
	originalCallbackAddress := operation_setting.CustomCallbackAddress
	originalServerAddress := system_setting.ServerAddress
	t.Cleanup(func() {
		setting.EzpayNotifyURL = originalNotifyURL
		setting.EzpayReturnURL = originalReturnURL
		operation_setting.CustomCallbackAddress = originalCallbackAddress
		system_setting.ServerAddress = originalServerAddress
	})

	setting.EzpayNotifyURL = ""
	operation_setting.CustomCallbackAddress = "https://callback.example.com/"
	system_setting.ServerAddress = "https://console.example.com/"
	notifyURL, err := getEzpayNotifyURL()
	require.NoError(t, err)
	require.Equal(t, "https://callback.example.com/api/ezpay/webhook", notifyURL)

	setting.EzpayNotifyURL = ""
	operation_setting.CustomCallbackAddress = "http://new-api:3000/"
	system_setting.ServerAddress = "https://console.example.com/"
	notifyURL, err = getEzpayNotifyURL()
	require.NoError(t, err)
	require.Equal(t, "https://console.example.com/api/ezpay/webhook", notifyURL)

	setting.EzpayNotifyURL = "https://pay.example.com/hooks/ezpay/"
	operation_setting.CustomCallbackAddress = "http://new-api:3000/"
	system_setting.ServerAddress = "https://console.example.com/"
	notifyURL, err = getEzpayNotifyURL()
	require.NoError(t, err)
	require.Equal(t, "https://pay.example.com/hooks/ezpay", notifyURL)

	setting.EzpayNotifyURL = "http://new-api:3000/api/ezpay/webhook"
	operation_setting.CustomCallbackAddress = ""
	system_setting.ServerAddress = "https://console.example.com/"
	notifyURL, err = getEzpayNotifyURL()
	require.NoError(t, err)
	require.Equal(t, "https://console.example.com/api/ezpay/webhook", notifyURL)

	setting.EzpayNotifyURL = ""
	operation_setting.CustomCallbackAddress = "http://new-api:3000/"
	system_setting.ServerAddress = ""
	_, err = getEzpayNotifyURL()
	require.Error(t, err)

	setting.EzpayReturnURL = ""
	system_setting.ServerAddress = "https://console.example.com/"
	returnURL, err := getEzpayReturnURL()
	require.NoError(t, err)
	require.Equal(t, "https://console.example.com/console/topup?show_history=true", returnURL)

	setting.EzpayNotifyURL = "not-a-url"
	_, err = getEzpayNotifyURL()
	require.Error(t, err)
}

func TestGetEzpayOrderConfigUsesConfiguredValuesAndDefaults(t *testing.T) {
	originalCurrency := setting.EzpayCurrency
	originalToken := setting.EzpayToken
	originalNetwork := setting.EzpayNetwork
	originalPaymentType := setting.EzpayPaymentType
	t.Cleanup(func() {
		setting.EzpayCurrency = originalCurrency
		setting.EzpayToken = originalToken
		setting.EzpayNetwork = originalNetwork
		setting.EzpayPaymentType = originalPaymentType
	})

	setting.EzpayCurrency = "eur"
	setting.EzpayToken = "usdc"
	setting.EzpayNetwork = "polygon"
	setting.EzpayPaymentType = "GMPAY"
	require.Equal(t, "eur", getEzpayOrderCurrency())
	require.Equal(t, "usdc", getEzpayOrderToken())
	require.Equal(t, "polygon", getEzpayOrderNetwork())
	require.Equal(t, "GMPAY", getEzpayOrderPaymentType())

	setting.EzpayCurrency = ""
	setting.EzpayToken = ""
	setting.EzpayNetwork = ""
	setting.EzpayPaymentType = ""
	require.Equal(t, setting.EzpayDefaultCurrency, getEzpayOrderCurrency())
	require.Equal(t, setting.EzpayDefaultToken, getEzpayOrderToken())
	require.Equal(t, setting.EzpayDefaultNetwork, getEzpayOrderNetwork())
	require.Equal(t, setting.EzpayDefaultPaymentType, getEzpayOrderPaymentType())
}
