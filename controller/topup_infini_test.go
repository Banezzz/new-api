package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/require"
)

func TestFormatInfiniAmount(t *testing.T) {
	testCases := []struct {
		name     string
		amount   float64
		expected string
	}{
		{name: "whole number", amount: 10, expected: "10"},
		{name: "two decimals", amount: 10.5, expected: "10.5"},
		{name: "six decimals", amount: 1.234567, expected: "1.234567"},
		{name: "trim zeros", amount: 1.230000, expected: "1.23"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			require.Equal(t, tc.expected, formatInfiniAmount(tc.amount))
		})
	}
}

func TestGetInfiniPayMoney(t *testing.T) {
	originalUnitPrice := setting.InfiniUnitPrice
	originalQuotaDisplayType := operation_setting.GetGeneralSetting().QuotaDisplayType
	originalDiscounts := make(map[int]float64, len(operation_setting.GetPaymentSetting().AmountDiscount))
	for k, v := range operation_setting.GetPaymentSetting().AmountDiscount {
		originalDiscounts[k] = v
	}
	originalTopupGroupRatio := common.TopupGroupRatio2JSONString()

	t.Cleanup(func() {
		setting.InfiniUnitPrice = originalUnitPrice
		operation_setting.GetGeneralSetting().QuotaDisplayType = originalQuotaDisplayType
		operation_setting.GetPaymentSetting().AmountDiscount = originalDiscounts
		require.NoError(t, common.UpdateTopupGroupRatioByJSONString(originalTopupGroupRatio))
	})

	setting.InfiniUnitPrice = 1.25
	operation_setting.GetPaymentSetting().AmountDiscount = map[int]float64{
		10:                           0.8,
		int(common.QuotaPerUnit * 2): 0.5,
	}
	require.NoError(t, common.UpdateTopupGroupRatioByJSONString(`{"default":1,"vip":1.2}`))

	testCases := []struct {
		name             string
		amount           int64
		group            string
		quotaDisplayType string
		expected         float64
	}{
		{
			name:             "currency display uses unit price group ratio and discount",
			amount:           10,
			group:            "vip",
			quotaDisplayType: operation_setting.QuotaDisplayTypeUSD,
			expected:         12,
		},
		{
			name:             "tokens display converts to units before pricing",
			amount:           int64(common.QuotaPerUnit * 2),
			group:            "default",
			quotaDisplayType: operation_setting.QuotaDisplayTypeTokens,
			expected:         1.25,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			operation_setting.GetGeneralSetting().QuotaDisplayType = tc.quotaDisplayType
			actual := getInfiniPayMoney(tc.amount, tc.group)
			require.InDelta(t, tc.expected, actual, 0.000001)
		})
	}
}

func TestResolveInfiniPayMethodConfig(t *testing.T) {
	require.NoError(t, setting.SetInfiniPayMethods([]setting.InfiniPayMethod{
		{
			Name:       "Infini",
			Type:       "infini",
			PayMethods: []int{1, 2},
		},
		{
			Name:       "Infini Crypto",
			Type:       "infini:crypto",
			PayMethods: []int{1},
		},
	}))

	method, err := resolveInfiniPayMethodConfig("infini:crypto")
	require.NoError(t, err)
	require.Equal(t, []int{1}, method.PayMethods)

	defaultMethod, err := resolveInfiniPayMethodConfig("")
	require.NoError(t, err)
	require.Equal(t, "infini", defaultMethod.Type)

	_, err = resolveInfiniPayMethodConfig("infini:unknown")
	require.Error(t, err)
}

func TestResolveInfiniRedirectURL(t *testing.T) {
	originalSuccessURL := setting.InfiniSuccessURL
	originalFailureURL := setting.InfiniFailureURL
	originalServerAddress := system_setting.ServerAddress
	t.Cleanup(func() {
		setting.InfiniSuccessURL = originalSuccessURL
		setting.InfiniFailureURL = originalFailureURL
		system_setting.ServerAddress = originalServerAddress
	})

	setting.InfiniSuccessURL = ""
	system_setting.ServerAddress = "https://console.example.com/"

	successURL, err := getInfiniReturnURL()
	require.NoError(t, err)
	require.Equal(t, "https://console.example.com/console/topup?show_history=true", successURL)

	setting.InfiniSuccessURL = "https://pay.example.com/success"
	successURL, err = getInfiniReturnURL()
	require.NoError(t, err)
	require.Equal(t, "https://pay.example.com/success", successURL)

	setting.InfiniFailureURL = "https://pay.example.com/fail"
	failureURL, err := getInfiniFailureURL()
	require.NoError(t, err)
	require.Equal(t, "https://pay.example.com/fail", failureURL)

	setting.InfiniFailureURL = "not-a-url"
	_, err = getInfiniFailureURL()
	require.Error(t, err)

	setting.InfiniFailureURL = ""
	system_setting.ServerAddress = ""
	_, err = getInfiniFailureURL()
	require.Error(t, err)
}
