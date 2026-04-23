package controller

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/thanhpk/randstr"
)

type SubscriptionInfiniPayRequest struct {
	PlanId        int    `json:"plan_id"`
	PaymentMethod string `json:"payment_method"`
}

func SubscriptionRequestInfiniPay(c *gin.Context) {
	if !isInfiniTopUpEnabled() {
		common.ApiErrorMsg(c, "Infini 支付未启用")
		return
	}

	var req SubscriptionInfiniPayRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.PlanId <= 0 {
		common.ApiErrorMsg(c, "参数错误")
		return
	}

	payMethod, err := resolveInfiniPayMethodConfig(req.PaymentMethod)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	plan, err := model.GetSubscriptionPlanById(req.PlanId)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if !plan.Enabled {
		common.ApiErrorMsg(c, "套餐未启用")
		return
	}
	if plan.PriceAmount < 0.01 {
		common.ApiErrorMsg(c, "套餐金额过低")
		return
	}

	userId := c.GetInt("id")
	user, err := model.GetUserById(userId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user == nil {
		common.ApiErrorMsg(c, "用户不存在")
		return
	}

	if plan.MaxPurchasePerUser > 0 {
		count, err := model.CountUserSubscriptionsByPlan(userId, plan.Id)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if count >= int64(plan.MaxPurchasePerUser) {
			common.ApiErrorMsg(c, "已达到该套餐购买上限")
			return
		}
	}

	order := &model.SubscriptionOrder{
		UserId:        userId,
		PlanId:        plan.Id,
		Money:         plan.PriceAmount,
		TradeNo:       fmt.Sprintf("SUB_INFINI-%d-%d-%s", userId, time.Now().UnixMilli(), randstr.String(6)),
		PaymentMethod: model.PaymentMethodInfini,
		CreateTime:    time.Now().Unix(),
		Status:        common.TopUpStatusPending,
	}
	if err := order.Insert(); err != nil {
		common.ApiErrorMsg(c, "创建订单失败")
		return
	}

	client, err := service.NewConfiguredInfiniClient()
	if err != nil {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		common.ApiErrorMsg(c, "Infini 配置不完整")
		return
	}
	successURL, err := getInfiniReturnURL()
	if err != nil {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		common.ApiErrorMsg(c, err.Error())
		return
	}
	failureURL, err := getInfiniFailureURL()
	if err != nil {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		common.ApiErrorMsg(c, err.Error())
		return
	}

	createReq := &service.InfiniCreateOrderRequest{
		Amount:          formatInfiniAmount(plan.PriceAmount),
		RequestID:       uuid.NewString(),
		ClientReference: order.TradeNo,
		OrderDesc:       fmt.Sprintf("Subscription %s for user %d", plan.Title, user.Id),
		MerchantAlias:   strings.TrimSpace(setting.InfiniMerchantAlias),
		SuccessURL:      successURL,
		FailureURL:      failureURL,
		PayMethods:      sanitizeInfiniPayMethods(payMethod.PayMethods),
	}
	if setting.InfiniOrderTTLSeconds > 0 {
		createReq.ExpiresIn = setting.InfiniOrderTTLSeconds
	}

	resp, err := client.CreateOrder(c.Request.Context(), createReq)
	if err != nil {
		order.Status = common.TopUpStatusFailed
		_ = order.Update()
		logger.LogError(c.Request.Context(), fmt.Sprintf("Infini 订阅订单创建失败 trade_no=%s plan_id=%d error=%q", order.TradeNo, plan.Id, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Infini 订阅订单创建成功 trade_no=%s order_id=%s plan_id=%d price=%.2f pay_method=%s", order.TradeNo, resp.OrderID, plan.Id, plan.PriceAmount, payMethod.Type))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"checkout_url": resp.CheckoutURL,
			"order_id":     resp.OrderID,
			"trade_no":     order.TradeNo,
		},
	})
}
