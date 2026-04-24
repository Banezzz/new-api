package setting

import "github.com/QuantumNous/new-api/common"

type InfiniPayMethod struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	Color      string `json:"color,omitempty"`
	PayMethods []int  `json:"pay_methods,omitempty"`
}

var (
	InfiniEnabled         bool
	InfiniSandbox         bool
	InfiniBaseURL         string
	InfiniKeyId           string
	InfiniSecretKey       string
	InfiniWebhookSecret   string
	InfiniMerchantAlias   string
	InfiniSuccessURL      string
	InfiniFailureURL      string
	InfiniUnitPrice       float64 = 1.0
	InfiniMinTopUp        int     = 1
	InfiniOrderTTLSeconds int     = 0
)

var defaultInfiniPayMethods = []InfiniPayMethod{
	{
		Name:  "Infini",
		Type:  "infini",
		Color: "rgba(var(--semi-indigo-5), 1)",
	},
}

func GetInfiniPayMethods() []InfiniPayMethod {
	common.OptionMapRWMutex.RLock()
	jsonStr := common.OptionMap["InfiniPayMethods"]
	common.OptionMapRWMutex.RUnlock()

	if jsonStr == "" {
		return copyDefaultInfiniPayMethods()
	}
	var methods []InfiniPayMethod
	if err := common.UnmarshalJsonStr(jsonStr, &methods); err != nil || len(methods) == 0 {
		return copyDefaultInfiniPayMethods()
	}
	return methods
}

func SetInfiniPayMethods(methods []InfiniPayMethod) error {
	jsonBytes, err := common.Marshal(methods)
	if err != nil {
		return err
	}
	common.OptionMapRWMutex.Lock()
	if common.OptionMap == nil {
		common.OptionMap = make(map[string]string)
	}
	common.OptionMap["InfiniPayMethods"] = string(jsonBytes)
	common.OptionMapRWMutex.Unlock()
	return nil
}

func InfiniPayMethods2JsonString() string {
	jsonBytes, err := common.Marshal(defaultInfiniPayMethods)
	if err != nil {
		return "[]"
	}
	return string(jsonBytes)
}

func copyDefaultInfiniPayMethods() []InfiniPayMethod {
	cp := make([]InfiniPayMethod, len(defaultInfiniPayMethods))
	copy(cp, defaultInfiniPayMethods)
	return cp
}
