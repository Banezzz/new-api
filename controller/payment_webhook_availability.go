package controller

import (
	"strings"

	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

func isPaymentComplianceConfirmed() bool {
	return operation_setting.IsPaymentComplianceConfirmed()
}

func isStripeTopUpEnabled() bool {
	if !isPaymentComplianceConfirmed() {
		return false
	}
	return strings.TrimSpace(setting.StripeApiSecret) != "" &&
		strings.TrimSpace(setting.StripeWebhookSecret) != "" &&
		strings.TrimSpace(setting.StripePriceId) != ""
}

func isStripeWebhookConfigured() bool {
	return strings.TrimSpace(setting.StripeWebhookSecret) != ""
}

func isStripeWebhookEnabled() bool {
	return isStripeTopUpEnabled()
}

func isCreemTopUpEnabled() bool {
	if !isPaymentComplianceConfirmed() {
		return false
	}
	products := strings.TrimSpace(setting.CreemProducts)
	return strings.TrimSpace(setting.CreemApiKey) != "" &&
		products != "" &&
		products != "[]"
}

func isCreemWebhookConfigured() bool {
	return strings.TrimSpace(setting.CreemWebhookSecret) != ""
}

func isCreemWebhookEnabled() bool {
	return isCreemTopUpEnabled() && isCreemWebhookConfigured()
}

func isWaffoTopUpEnabled() bool {
	if !isPaymentComplianceConfirmed() {
		return false
	}
	if !setting.WaffoEnabled {
		return false
	}

	return isWaffoWebhookConfigured()
}

func isWaffoWebhookConfigured() bool {
	if setting.WaffoSandbox {
		return strings.TrimSpace(setting.WaffoSandboxApiKey) != "" &&
			strings.TrimSpace(setting.WaffoSandboxPrivateKey) != "" &&
			strings.TrimSpace(setting.WaffoSandboxPublicCert) != ""
	}

	return strings.TrimSpace(setting.WaffoApiKey) != "" &&
		strings.TrimSpace(setting.WaffoPrivateKey) != "" &&
		strings.TrimSpace(setting.WaffoPublicCert) != ""
}

func isWaffoWebhookEnabled() bool {
	return isWaffoTopUpEnabled()
}

func isWaffoPancakeTopUpEnabled() bool {
	if !isPaymentComplianceConfirmed() {
		return false
	}
	// Presence-of-credentials = enabled. Webhook public keys ship inside
	// the SDK; mode (test/prod) is read from each event.
	return strings.TrimSpace(setting.WaffoPancakeMerchantID) != "" &&
		strings.TrimSpace(setting.WaffoPancakePrivateKey) != "" &&
		strings.TrimSpace(setting.WaffoPancakeProductID) != ""
}

func isWaffoPancakeWebhookConfigured() bool {
	return isWaffoPancakeTopUpEnabled()
}

func isWaffoPancakeWebhookEnabled() bool {
	return isWaffoPancakeTopUpEnabled()
}

func isInfiniTopUpEnabled() bool {
	if !setting.InfiniEnabled {
		return false
	}

	return strings.TrimSpace(setting.InfiniKeyId) != "" &&
		strings.TrimSpace(setting.InfiniSecretKey) != "" &&
		isInfiniWebhookConfigured() &&
		isInfiniCallbackAddressConfigured() &&
		len(setting.GetInfiniPayMethods()) > 0
}

func isInfiniWebhookConfigured() bool {
	return strings.TrimSpace(setting.InfiniWebhookSecret) != ""
}

func isInfiniCallbackAddressConfigured() bool {
	return strings.TrimSpace(operation_setting.CustomCallbackAddress) != "" ||
		strings.TrimSpace(system_setting.ServerAddress) != ""
}

func isInfiniWebhookEnabled() bool {
	return isInfiniTopUpEnabled()
}

func isEzpayTopUpEnabled() bool {
	if !setting.EzpayEnabled {
		return false
	}

	return strings.TrimSpace(setting.EzpayPID) != "" &&
		strings.TrimSpace(setting.EzpaySecretKey) != "" &&
		isEzpayCallbackAddressConfigured()
}

func isEzpayWebhookConfigured() bool {
	return strings.TrimSpace(setting.EzpayPID) != "" &&
		strings.TrimSpace(setting.EzpaySecretKey) != ""
}

func isEzpayCallbackAddressConfigured() bool {
	return strings.TrimSpace(setting.EzpayNotifyURL) != "" ||
		strings.TrimSpace(operation_setting.CustomCallbackAddress) != "" ||
		strings.TrimSpace(system_setting.ServerAddress) != ""
}

func isEzpayWebhookEnabled() bool {
	return setting.EzpayEnabled && isEzpayWebhookConfigured()
}

func isEpayTopUpEnabled() bool {
	if !isPaymentComplianceConfirmed() {
		return false
	}
	return isEpayWebhookConfigured() && len(operation_setting.PayMethods) > 0
}

func isEpayWebhookConfigured() bool {
	return strings.TrimSpace(operation_setting.PayAddress) != "" &&
		strings.TrimSpace(operation_setting.EpayId) != "" &&
		strings.TrimSpace(operation_setting.EpayKey) != ""
}

func isEpayWebhookEnabled() bool {
	return isEpayTopUpEnabled()
}
