package controller

import (
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/stretchr/testify/require"
)

func TestStripeWebhookEnabledRequiresTopUpAndWebhookConfig(t *testing.T) {
	originalAPISecret := setting.StripeApiSecret
	originalWebhookSecret := setting.StripeWebhookSecret
	originalPriceID := setting.StripePriceId
	t.Cleanup(func() {
		setting.StripeApiSecret = originalAPISecret
		setting.StripeWebhookSecret = originalWebhookSecret
		setting.StripePriceId = originalPriceID
	})

	setting.StripeWebhookSecret = ""
	setting.StripeApiSecret = "sk_test_123"
	setting.StripePriceId = "price_123"
	require.False(t, isStripeWebhookEnabled())

	setting.StripeWebhookSecret = "whsec_test"
	require.True(t, isStripeWebhookEnabled())

	setting.StripePriceId = ""
	require.False(t, isStripeWebhookEnabled())
}

func TestCreemWebhookEnabledRequiresTopUpAndWebhookConfig(t *testing.T) {
	originalAPIKey := setting.CreemApiKey
	originalProducts := setting.CreemProducts
	originalWebhookSecret := setting.CreemWebhookSecret
	t.Cleanup(func() {
		setting.CreemApiKey = originalAPIKey
		setting.CreemProducts = originalProducts
		setting.CreemWebhookSecret = originalWebhookSecret
	})

	setting.CreemWebhookSecret = ""
	setting.CreemApiKey = "creem_api_key"
	setting.CreemProducts = `[{"productId":"prod_123"}]`
	require.False(t, isCreemWebhookEnabled())

	setting.CreemWebhookSecret = "creem_secret"
	require.True(t, isCreemWebhookEnabled())

	setting.CreemProducts = "[]"
	require.False(t, isCreemWebhookEnabled())
}

func TestWaffoWebhookEnabledRequiresTopUpAndWebhookConfig(t *testing.T) {
	originalEnabled := setting.WaffoEnabled
	originalSandbox := setting.WaffoSandbox
	originalAPIKey := setting.WaffoApiKey
	originalPrivateKey := setting.WaffoPrivateKey
	originalPublicCert := setting.WaffoPublicCert
	originalSandboxAPIKey := setting.WaffoSandboxApiKey
	originalSandboxPrivateKey := setting.WaffoSandboxPrivateKey
	originalSandboxPublicCert := setting.WaffoSandboxPublicCert
	t.Cleanup(func() {
		setting.WaffoEnabled = originalEnabled
		setting.WaffoSandbox = originalSandbox
		setting.WaffoApiKey = originalAPIKey
		setting.WaffoPrivateKey = originalPrivateKey
		setting.WaffoPublicCert = originalPublicCert
		setting.WaffoSandboxApiKey = originalSandboxAPIKey
		setting.WaffoSandboxPrivateKey = originalSandboxPrivateKey
		setting.WaffoSandboxPublicCert = originalSandboxPublicCert
	})

	setting.WaffoEnabled = true
	setting.WaffoSandbox = false
	setting.WaffoApiKey = ""
	setting.WaffoPrivateKey = "private"
	setting.WaffoPublicCert = "public"
	require.False(t, isWaffoWebhookEnabled())

	setting.WaffoApiKey = "api"
	require.True(t, isWaffoWebhookEnabled())

	setting.WaffoEnabled = false
	require.False(t, isWaffoWebhookEnabled())

	setting.WaffoEnabled = true
	setting.WaffoSandbox = true
	setting.WaffoSandboxApiKey = ""
	setting.WaffoSandboxPrivateKey = "sandbox_private"
	setting.WaffoSandboxPublicCert = "sandbox_public"
	require.False(t, isWaffoWebhookEnabled())

	setting.WaffoSandboxApiKey = "sandbox_api"
	require.True(t, isWaffoWebhookEnabled())
}

func TestInfiniWebhookEnabledRequiresTopUpAndWebhookConfig(t *testing.T) {
	originalEnabled := setting.InfiniEnabled
	originalSandbox := setting.InfiniSandbox
	originalBaseURL := setting.InfiniBaseURL
	originalKeyID := setting.InfiniKeyId
	originalSecretKey := setting.InfiniSecretKey
	originalWebhookSecret := setting.InfiniWebhookSecret
	originalCustomCallbackAddress := operation_setting.CustomCallbackAddress
	originalServerAddress := system_setting.ServerAddress
	t.Cleanup(func() {
		setting.InfiniEnabled = originalEnabled
		setting.InfiniSandbox = originalSandbox
		setting.InfiniBaseURL = originalBaseURL
		setting.InfiniKeyId = originalKeyID
		setting.InfiniSecretKey = originalSecretKey
		setting.InfiniWebhookSecret = originalWebhookSecret
		operation_setting.CustomCallbackAddress = originalCustomCallbackAddress
		system_setting.ServerAddress = originalServerAddress
		require.NoError(t, setting.SetInfiniPayMethods([]setting.InfiniPayMethod{{
			Name:       "Infini",
			Type:       "infini",
			PayMethods: []int{1, 2},
		}}))
	})

	setting.InfiniEnabled = true
	setting.InfiniBaseURL = ""
	setting.InfiniSandbox = true
	setting.InfiniKeyId = "merchant_public"
	setting.InfiniSecretKey = "merchant_secret"
	setting.InfiniWebhookSecret = ""
	operation_setting.CustomCallbackAddress = ""
	system_setting.ServerAddress = ""
	require.NoError(t, setting.SetInfiniPayMethods([]setting.InfiniPayMethod{{
		Name:       "Infini",
		Type:       "infini",
		PayMethods: []int{1, 2},
	}}))
	require.False(t, isInfiniWebhookEnabled())

	setting.InfiniWebhookSecret = "whsec_test"
	require.False(t, isInfiniWebhookEnabled())

	system_setting.ServerAddress = "https://console.example.com"
	require.True(t, isInfiniWebhookEnabled())

	setting.InfiniKeyId = ""
	require.False(t, isInfiniWebhookEnabled())
}

func TestWaffoPancakeWebhookEnabledRequiresTopUpAndWebhookConfig(t *testing.T) {
	originalEnabled := setting.WaffoPancakeEnabled
	originalSandbox := setting.WaffoPancakeSandbox
	originalMerchantID := setting.WaffoPancakeMerchantID
	originalPrivateKey := setting.WaffoPancakePrivateKey
	originalWebhookPublicKey := setting.WaffoPancakeWebhookPublicKey
	originalWebhookTestKey := setting.WaffoPancakeWebhookTestKey
	originalStoreID := setting.WaffoPancakeStoreID
	originalProductID := setting.WaffoPancakeProductID
	t.Cleanup(func() {
		setting.WaffoPancakeEnabled = originalEnabled
		setting.WaffoPancakeSandbox = originalSandbox
		setting.WaffoPancakeMerchantID = originalMerchantID
		setting.WaffoPancakePrivateKey = originalPrivateKey
		setting.WaffoPancakeWebhookPublicKey = originalWebhookPublicKey
		setting.WaffoPancakeWebhookTestKey = originalWebhookTestKey
		setting.WaffoPancakeStoreID = originalStoreID
		setting.WaffoPancakeProductID = originalProductID
	})

	setting.WaffoPancakeEnabled = true
	setting.WaffoPancakeSandbox = false
	setting.WaffoPancakeMerchantID = "merchant"
	setting.WaffoPancakePrivateKey = "private"
	setting.WaffoPancakeStoreID = "store"
	setting.WaffoPancakeProductID = "product"
	setting.WaffoPancakeWebhookPublicKey = ""
	require.False(t, isWaffoPancakeWebhookEnabled())

	setting.WaffoPancakeWebhookPublicKey = "public"
	require.True(t, isWaffoPancakeWebhookEnabled())

	setting.WaffoPancakeEnabled = false
	require.False(t, isWaffoPancakeWebhookEnabled())

	setting.WaffoPancakeEnabled = true
	setting.WaffoPancakeSandbox = true
	setting.WaffoPancakeWebhookTestKey = ""
	require.False(t, isWaffoPancakeWebhookEnabled())

	setting.WaffoPancakeWebhookTestKey = "test_public"
	require.True(t, isWaffoPancakeWebhookEnabled())
}

func TestEpayWebhookEnabledRequiresTopUpAndWebhookConfig(t *testing.T) {
	originalPayAddress := operation_setting.PayAddress
	originalEpayID := operation_setting.EpayId
	originalEpayKey := operation_setting.EpayKey
	originalPayMethods := operation_setting.PayMethods
	t.Cleanup(func() {
		operation_setting.PayAddress = originalPayAddress
		operation_setting.EpayId = originalEpayID
		operation_setting.EpayKey = originalEpayKey
		operation_setting.PayMethods = originalPayMethods
	})

	operation_setting.PayAddress = "https://pay.example.com"
	operation_setting.EpayId = "epay_id"
	operation_setting.EpayKey = ""
	operation_setting.PayMethods = []map[string]string{{"type": "alipay"}}
	require.False(t, isEpayWebhookEnabled())

	operation_setting.EpayKey = "epay_key"
	require.True(t, isEpayWebhookEnabled())

	operation_setting.PayMethods = nil
	require.False(t, isEpayWebhookEnabled())
}
