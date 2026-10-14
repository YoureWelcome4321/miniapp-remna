<script lang="ts">
  import ThemeEffectSurface from "../ThemeEffectSurface.svelte";
  import UserExtensionPoint from "../extensions/UserExtensionPoint.svelte";
  import type { ApiClient } from "$lib/webapp/publicApi.js";
  import { buildSubscriptionQuotePath, type PostPayload } from "$lib/webapp/publicApi.js";
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import {
    CheckCircle2,
    CircleQuestionMark,
    CircleX,
    CreditCard,
    Database,
    Download,
    Gift,
    Repeat2,
    Send,
  } from "$components/ui/icons.js";

  import { AttentionDot } from "$components/ui/index.js";
  import Button from "$components/ui/button.svelte";
  import Card from "$components/ui/card.svelte";
  import Dialog from "$components/ui/dialog.svelte";
  import RangeInput from "$components/ui/range-input.svelte";
  import TelegramNotificationsBanner from "../TelegramNotificationsBanner.svelte";
  import ServerStatusCard from "../ServerStatusCard.svelte";
  import HomeCompactSummaryCard from "../HomeCompactSummaryCard.svelte";
  import HomeBalanceCard from "../HomeBalanceCard.svelte";
  import { LinearProgress } from "$components/patterns/webapp/index.js";
  import { formatTrafficGb } from "../../lib/webapp/formatters.js";
  import { shouldShowUserBalance } from "$lib/webapp/balanceUiPolicy.js";
  import {
    DEFAULT_HOME_ELEMENT_VISIBILITY,
    themeHomeElementIsVisible,
    type HomeElementVisibility,
  } from "$lib/webapp/themeStyle.js";
  import {
    trafficPercent as trafficPercentFn,
    trafficLabel as trafficLabelFn,
    trafficResetLabel as trafficResetLabelFn,
    trafficResetScheduled as trafficResetScheduledFn,
    trafficNextResetLabel as trafficNextResetLabelFn,
    regularTrafficLimitVisible as regularTrafficLimitVisibleFn,
    premiumTrafficPercent as premiumTrafficPercentFn,
    premiumTrafficLabel as premiumTrafficLabelFn,
    premiumNextResetLabel as premiumNextResetLabelFn,
    premiumTrafficResetLabel as premiumTrafficResetLabelFn,
    premiumTrafficLimitVisible as premiumTrafficLimitVisibleFn,
    premiumTitle as premiumTitleFn,
    premiumServerLabels as premiumServerLabelsFn,
    activeSubscriptionTermLabel as activeSubscriptionTermLabelFn,
  } from "../../lib/webapp/traffic.js";
  import type {
    AppSettings,
    BalanceView,
    PlanView,
    BooleanAction,
    ReferralState,
    CopyTextAction,
    SubscriptionView,
    TermUnitLabel,
    Translate,
    OpenLinkAction,
    VoidAction,
  } from "$lib/webapp/types.js";
  import type { ServerStatusStore } from "$lib/webapp/stores/serverStatusStore.svelte";

  const SUBSCRIPTION_EXPIRY_WARNING_MS = 72 * 60 * 60 * 1000;
  const SUBSCRIPTION_EXPIRING_SOON_MS = 24 * 60 * 60 * 1000;
  const RESET_DETAIL_TRANSITION = { duration: 220 };
  const REGULAR_TRAFFIC_RESET_DETAIL_ID = "regular-traffic-reset-detail";
  const PREMIUM_TRAFFIC_RESET_DETAIL_ID = "premium-traffic-reset-detail";
  const COUNTDOWN_IDLE_REFRESH_MS = 60_000;

  let {
    apiClient,
    appSettings = {},
    plans = [],
    balance = {} as BalanceView,
    canChangeTariff = false,
    premiumTrafficTopupBarClickable = false,
    premiumTrafficTopupUnlocked = false,
    regularTrafficTopupBarClickable = false,
    regularTrafficTopupUnlocked = false,
    referral = {},
    copyText = async () => {},
    openCustomizedPayment = () => openPaymentModal(),
    currentTariffName = "",
    hasActiveTariffSubscription = false,
    hasMultipleTariffs = false,
    subscription = {},
    autoRenewBusy = false,
    linkTelegramBusy = false,
    telegramNotificationsNeedPrompt = false,
    telegramNotificationsStartLink = "",
    telegramNotificationsStatus = "unknown",
    trafficMode = false,
    trialBusy = false,
    termUnitLabel = () => "",
    activateTrial = () => {},
    toggleAutoRenew = () => {},
    linkTelegramAndActivateTrial = () => {},
    linkTelegramAndClaimReferralWelcome = () => {},
    openConnectLink = () => {},
    openPaymentModal = () => {},
    openBalanceTopup = () => {},
    openTelegramNotificationsBot = () => {},
    openRegularTopupModal = () => {},
    openPremiumTopupModal = () => {},
    openTariffChangeModal = () => {},
    goSecurity = () => {},
    goStatus = () => {},
    openExternalLink = () => {},
    requiredChannelUrl = "",
    serverStatusShowOnHome = false,
    compactHomeEnabled = false,
    homeElementVisibility = DEFAULT_HOME_ELEMENT_VISIBILITY,
    statusStore,
    primaryPayActionLabel = () => "",
    t = (key) => key,
  }: {
    apiClient?: ApiClient;
    appSettings?: AppSettings;
    plans?: PlanView[];
    balance?: BalanceView;
    canChangeTariff?: boolean;
    premiumTrafficTopupBarClickable?: boolean;
    premiumTrafficTopupUnlocked?: boolean;
    regularTrafficTopupBarClickable?: boolean;
    regularTrafficTopupUnlocked?: boolean;
    referral?: ReferralState;
    copyText?: CopyTextAction;
    openCustomizedPayment?: (options: {
      durationDays: number;
      deviceTotal: number;
      trafficGb: number | null;
    }) => void;
    currentTariffName?: string;
    hasActiveTariffSubscription?: boolean;
    hasMultipleTariffs?: boolean;
    subscription?: SubscriptionView;
    autoRenewBusy?: boolean;
    linkTelegramBusy?: boolean;
    telegramNotificationsNeedPrompt?: boolean;
    telegramNotificationsStartLink?: string;
    telegramNotificationsStatus?: string;
    trafficMode?: boolean;
    trialBusy?: boolean;
    termUnitLabel?: TermUnitLabel;
    activateTrial?: VoidAction;
    toggleAutoRenew?: BooleanAction;
    linkTelegramAndActivateTrial?: VoidAction;
    linkTelegramAndClaimReferralWelcome?: VoidAction;
    openConnectLink?: VoidAction;
    openPaymentModal?: VoidAction;
    openBalanceTopup?: VoidAction;
    openTelegramNotificationsBot?: VoidAction;
    openRegularTopupModal?: VoidAction;
    openPremiumTopupModal?: VoidAction;
    openTariffChangeModal?: VoidAction;
    goSecurity?: VoidAction;
    goStatus?: VoidAction;
    openExternalLink?: OpenLinkAction;
    requiredChannelUrl?: string;
    serverStatusShowOnHome?: boolean;
    compactHomeEnabled?: boolean;
    homeElementVisibility?: HomeElementVisibility;
    statusStore: ServerStatusStore;
    primaryPayActionLabel?: () => string;
    t?: Translate;
  } = $props();

  let pageVisible = $state(
    typeof document === "undefined" || document.visibilityState !== "hidden"
  );

  let nowMs = $state(Date.now());
  let regularTrafficResetOpen = $state(false);
  let premiumTrafficResetOpen = $state(false);
  let trialConfirmOpen = $state(false);
  let builderOpen = $state(false);
  let builderDuration = $state(30);
  let builderDevices = $state(1);
  let builderTrafficMode = $state<"limited" | "unlimited">("limited");
  let builderTrafficGb = $state(100);
  let builderPreset = $state("start");
  let builderQuote = $state<Record<string, unknown> | null>(null);
  let builderQuoteBusy = $state(false);
  let builderQuoteError = $state("");
  let builderRequestId = 0;

  const BUILDER_PRESETS = {
    start: { duration: 30, devices: 1, trafficMode: "limited" as const, trafficGb: 100 },
    everyday: { duration: 30, devices: 3, trafficMode: "unlimited" as const, trafficGb: 300 },
    max: { duration: 365, devices: 10, trafficMode: "unlimited" as const, trafficGb: 300 },
  };

  function trafficPercent(sub: SubscriptionView) {
    return trafficPercentFn(sub);
  }
  function trafficLabel(sub: SubscriptionView) {
    return trafficLabelFn(sub, t);
  }
  function trafficResetLabel(sub: SubscriptionView) {
    return trafficResetLabelFn(sub, t);
  }
  function trafficResetScheduled(sub: SubscriptionView = subscription) {
    return trafficResetScheduledFn(sub);
  }
  function trafficNextResetLabel(sub: SubscriptionView) {
    return trafficNextResetLabelFn(sub, t);
  }
  function regularTrafficLimitVisible(sub: SubscriptionView = subscription) {
    return regularTrafficLimitVisibleFn(sub);
  }
  function regularTrafficDepleted(sub: SubscriptionView = subscription) {
    const used = Number(sub?.traffic_used_bytes || 0);
    const limit = Number(sub?.traffic_limit_bytes || 0);
    return limit > 0 && used >= limit;
  }
  function regularTrafficCardClass(sub: SubscriptionView = subscription) {
    return [
      "traffic-card-compact",
      regularTrafficTopupBarClickable ? "traffic-card-clickable" : "",
      regularTrafficDepleted(sub) ? "traffic-card-depleted" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }
  function premiumTrafficAvailable(sub: SubscriptionView = subscription) {
    return !regularTrafficDepleted(sub);
  }
  function premiumTrafficPercent(sub: SubscriptionView) {
    return premiumTrafficPercentFn(sub);
  }
  function premiumTrafficLimitVisible(sub: SubscriptionView = subscription) {
    return premiumTrafficLimitVisibleFn(sub);
  }
  function premiumTrafficLabel(sub: SubscriptionView) {
    return premiumTrafficLabelFn(sub, t);
  }
  function premiumNextResetLabel(sub: SubscriptionView) {
    return premiumNextResetLabelFn(sub, t);
  }
  function premiumTrafficResetLabel(sub: SubscriptionView) {
    return premiumTrafficResetLabelFn(sub, t);
  }
  function premiumTitle(sub: SubscriptionView = subscription) {
    return premiumTitleFn(sub, t);
  }
  function premiumTrafficMetaLabel(sub: SubscriptionView = subscription) {
    return sub?.premium_is_limited
      ? t("wa_premium_access_limited", {}, "Premium access is temporarily limited")
      : premiumTrafficResetLabel(sub);
  }
  function premiumServerLabels(sub: SubscriptionView) {
    return premiumServerLabelsFn(sub);
  }
  function activeSubscriptionTermLabel(sub: SubscriptionView) {
    return activeSubscriptionTermLabelFn(sub, { t, termUnitLabel });
  }
  function trialTrafficLabel() {
    const limit = Number(appSettings?.trial_traffic_limit_gb || 0);
    return limit > 0 ? formatTrafficGb(limit) : t("wa_unlimited_traffic");
  }
  function trialDurationLabel() {
    const days = Number(appSettings?.trial_duration_days || 0);
    return t("wa_sub_term_value_unit", {
      value: days,
      unit: termUnitLabel(days, "day"),
    });
  }
  const builderQuotePlan = $derived.by(() => {
    const available = plans;
    const availableDays = available.filter((plan) => plan.duration_days != null);
    const exactDays = availableDays
      .filter((plan) => String(plan.sale_mode || "subscription") === "subscription")
      .slice()
      .sort(
        (a, b) =>
          Math.abs(Number(a.duration_days) - builderDuration) -
          Math.abs(Number(b.duration_days) - builderDuration)
      )[0];
    const monthPlans = available
      .filter(
        (plan) =>
          plan.duration_days == null && String(plan.sale_mode || "subscription") === "subscription"
      )
      .slice()
      .sort(
        (a, b) =>
          Math.abs(Number(a.months || 0) * 30 - builderDuration) -
          Math.abs(Number(b.months || 0) * 30 - builderDuration)
      )[0];
    return exactDays || monthPlans || null;
  });
  const builderPrice = $derived(Number(builderQuote?.effective_amount ?? 0));
  const builderSupportedDevices = $derived(
    Boolean(
      builderQuotePlan?.checkout_addons?.devices?.options?.some(
        (option) => Number(option.extra_units) === builderDevices
      )
    ) || Number(builderQuotePlan?.checkout_addons?.devices?.base_units || 1) === builderDevices
  );
  const builderSupportedTraffic = $derived(
    builderTrafficMode === "unlimited"
      ? Boolean(
          builderQuotePlan?.premium_unlimited || builderQuotePlan?.checkout_addons?.premium_traffic
        )
      : Boolean(
          builderQuotePlan?.checkout_addons?.traffic?.options?.some(
            (option) => Number(option.total_units) === builderTrafficGb
          )
        ) ||
          Number(builderQuotePlan?.checkout_addons?.traffic?.base_units || 0) === builderTrafficGb
  );
  const builderQuoteMethod = $derived(
    String(builderQuotePlan?.available_payment_method_ids?.[0] || "")
  );

  function selectBuilderPreset(key: keyof typeof BUILDER_PRESETS) {
    const preset = BUILDER_PRESETS[key];
    builderPreset = key;
    builderDuration = preset.duration;
    builderDevices = preset.devices;
    builderTrafficMode = preset.trafficMode;
    builderTrafficGb = preset.trafficGb;
  }

  function openPlanBuilder() {
    builderOpen = true;
    selectBuilderPreset("start");
  }

  function continueWithBuiltPlan() {
    openCustomizedPayment({
      durationDays: builderDuration,
      deviceTotal: builderDevices,
      trafficGb: builderTrafficMode === "limited" ? builderTrafficGb : null,
    });
    builderOpen = false;
  }

  $effect(() => {
    if (!builderOpen || !builderQuotePlan) return;
    const client = apiClient;
    if (!client) return;
    const plan = builderQuotePlan;
    const devices = builderDevices;
    const trafficMode = builderTrafficMode;
    const traffic = builderTrafficGb;
    const requestId = ++builderRequestId;
    builderQuoteBusy = true;
    builderQuote = null;
    builderQuoteError = "";
    const timer = window.setTimeout(() => {
      void client
        .api(buildSubscriptionQuotePath(), {
          method: "POST",
          body: JSON.stringify({
            duration_days: plan.duration_days ? Number(plan.duration_days) : null,
            months: plan.months ? Number(plan.months) : null,
            checkout_addons: {
              device_count: Math.max(0, devices - Number(plan.effective_hwid_device_limit || 1)),
              regular_limit_gb: trafficMode === "limited" ? traffic : null,
              premium_limit_gb: null,
            },
            tariff_key: plan.tariff_key || null,
            sale_mode: plan.sale_mode || "subscription",
            method: builderQuoteMethod,
            renew_hwid_devices: false,
          } as PostPayload<"/api/subscription/quote">),
        })
        .then((response) => {
          if (requestId === builderRequestId) builderQuote = response as Record<string, unknown>;
        })
        .catch(() => {
          if (requestId === builderRequestId) {
            builderQuote = null;
            builderQuoteError = t(
              "wa_checkout_quote_failed",
              {},
              "Не удалось рассчитать стоимость"
            );
          }
        })
        .finally(() => {
          if (requestId === builderRequestId) builderQuoteBusy = false;
        });
    }, 280);
    return () => window.clearTimeout(timer);
  });
  function parseSubscriptionEndMs(sub: SubscriptionView) {
    const raw = String(sub?.end_date || "").trim();
    if (!raw) return null;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  function dateOnlyFromEndText(text: unknown) {
    const value = String(text || "").trim();
    if (!value) return "";
    return value.split(/\s+/)[0] || value;
  }
  function dateOnlyFromIso(text: unknown) {
    const match = String(text || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}.${match[2]}.${match[1]}` : "";
  }
  function subscriptionEndDateLabel(sub: SubscriptionView) {
    return dateOnlyFromEndText(sub?.end_date_text) || dateOnlyFromIso(sub?.end_date);
  }
  function formatSubscriptionCountdown(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  const trialOfferAvailable = $derived(
    Boolean(!subscription?.active && appSettings?.trial_enabled && appSettings?.trial_available)
  );
  const trialPaymentEnabled = $derived(Boolean(appSettings?.trial_payment_enabled));
  const trialChannelConfigured = $derived(Boolean(requiredChannelUrl.trim()));
  const trialRequiresOauth = $derived(
    Boolean(
      !subscription?.active && appSettings?.trial_enabled && appSettings?.trial_requires_oauth
    )
  );
  const trialRequiresTelegram = $derived(
    Boolean(trialRequiresOauth && appSettings?.trial_block_reason === "disposable_email")
  );
  const referralWelcomeRequiresTelegram = $derived(
    Boolean(
      !subscription?.active &&
      referral?.welcome_bonus_requires_telegram &&
      Number(referral?.welcome_bonus_days || 0) > 0
    )
  );
  const subscriptionEndAtMs = $derived(parseSubscriptionEndMs(subscription));
  const subscriptionEndMs = $derived(subscription?.active ? subscriptionEndAtMs : null);
  const subscriptionExpired = $derived(
    Boolean(
      !subscription?.active &&
      (String(subscription?.status || "").toUpperCase() === "EXPIRED" ||
        (subscriptionEndAtMs && subscriptionEndAtMs <= nowMs))
    )
  );
  const subscriptionRemainingMs = $derived(Math.max(0, Number(subscriptionEndMs || 0) - nowMs));
  const subscriptionExpiryWarning = $derived(
    Boolean(
      subscription?.active &&
      subscriptionEndMs &&
      subscriptionRemainingMs > 0 &&
      subscriptionRemainingMs <= SUBSCRIPTION_EXPIRY_WARNING_MS
    )
  );
  const subscriptionEndDateText = $derived(subscriptionEndDateLabel(subscription));
  const subscriptionEndCountdown = $derived(formatSubscriptionCountdown(subscriptionRemainingMs));
  const subscriptionEndCountdownLabel = $derived(
    t(
      "wa_subscription_remaining_countdown",
      { countdown: subscriptionEndCountdown },
      `left: ${subscriptionEndCountdown}`
    )
  );
  const subscriptionExpiringSoon = $derived(
    Boolean(
      subscription?.active &&
      subscriptionEndMs &&
      subscriptionRemainingMs > 0 &&
      subscriptionRemainingMs < SUBSCRIPTION_EXPIRING_SOON_MS
    )
  );
  const subscriptionTermDisplayText = $derived(
    subscriptionExpiringSoon
      ? t("wa_subscription_expiring_soon", {}, "Ending soon!")
      : activeSubscriptionTermLabel(subscription)
  );
  const subscriptionEndDisplayText = $derived(
    subscriptionExpiryWarning
      ? `${subscriptionEndDateText || subscription.end_date_text} \u00b7 ${subscriptionEndCountdownLabel}`
      : subscriptionEndDateText
  );
  const statusCardClass = $derived(
    [
      "status-card",
      subscription.active ? "" : "status-card-inactive",
      subscriptionExpiryWarning ? "status-card-warning" : "",
    ]
      .filter(Boolean)
      .join(" ")
  );
  const subscriptionDaysLeft = $derived(Math.max(0, Number(subscription?.days_left || 0)));
  const subscriptionProgress = $derived.by(() => {
    const end = Date.parse(String(subscription?.end_date || ""));
    const start = Date.parse(String(subscription?.period_start_at || ""));
    if (!Number.isFinite(end) || !Number.isFinite(start) || end <= start) return 0;
    return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
  });
  const homeSubscriptionStatus = $derived(
    subscription.active
      ? t("wa_zumvpn_subscription_active", {}, "Подписка активна")
      : t("wa_zumvpn_subscription_inactive", {}, "Подписка не активна")
  );
  const accountLabel = $derived(t("wa_zumvpn_account_label", {}, "Telegram-пользователь"));
  const autoRenewVisible = $derived(
    Boolean(subscription?.active && subscription?.auto_renew_available)
  );
  const autoRenewEnabled = $derived(Boolean(subscription?.auto_renew_enabled));
  const balanceAvailable = $derived(
    Boolean(
      balance.enabled ||
      Object.prototype.hasOwnProperty.call(balance, "amount") ||
      Object.prototype.hasOwnProperty.call(balance, "amount_minor")
    )
  );
  const showSubscriptionPeriod = $derived(
    subscriptionExpiryWarning ||
      themeHomeElementIsVisible(
        homeElementVisibility.subscriptionPeriod,
        Boolean(subscription.active && subscriptionTermDisplayText),
        Boolean(subscription.active && subscriptionTermDisplayText)
      )
  );
  const showTariffName = $derived(
    themeHomeElementIsVisible(
      homeElementVisibility.tariffName,
      Boolean(hasActiveTariffSubscription && hasMultipleTariffs && currentTariffName),
      Boolean(hasActiveTariffSubscription && currentTariffName)
    )
  );
  const showSubscriptionEnd = $derived(
    subscriptionExpiryWarning ||
      subscriptionExpired ||
      themeHomeElementIsVisible(
        homeElementVisibility.subscriptionEnd,
        Boolean(subscription.active && (subscriptionEndDisplayText || subscription.remaining_text)),
        Boolean(subscription.active && (subscriptionEndDisplayText || subscription.remaining_text))
      )
  );
  const showChangeTariff = $derived(
    themeHomeElementIsVisible(
      homeElementVisibility.changeTariff,
      Boolean(canChangeTariff),
      Boolean(canChangeTariff)
    )
  );
  const showHomeBalance = $derived(
    themeHomeElementIsVisible(
      homeElementVisibility.balance,
      shouldShowUserBalance(balance),
      balanceAvailable
    )
  );
  const showRegularTraffic = $derived(
    themeHomeElementIsVisible(
      homeElementVisibility.regularTraffic,
      Boolean(subscription.active && regularTrafficLimitVisible(subscription)),
      Boolean(subscription.active && regularTrafficLimitVisible(subscription))
    )
  );
  const showPremiumTraffic = $derived(
    themeHomeElementIsVisible(
      homeElementVisibility.premiumTraffic,
      Boolean(
        subscription.active &&
        premiumTrafficAvailable(subscription) &&
        premiumTrafficLimitVisible(subscription)
      ),
      Boolean(
        subscription.active &&
        premiumTrafficAvailable(subscription) &&
        premiumTrafficLimitVisible(subscription)
      )
    )
  );
  const showAutoRenew = $derived(
    themeHomeElementIsVisible(homeElementVisibility.autoRenew, autoRenewVisible, autoRenewVisible)
  );

  $effect(() => {
    if (!pageVisible || !subscription?.active || !subscriptionEndMs) return;
    const remainingMs = Math.max(0, Number(subscriptionEndMs) - nowMs);
    if (!remainingMs) return;
    const delay =
      remainingMs <= SUBSCRIPTION_EXPIRY_WARNING_MS
        ? 1000
        : Math.min(
            COUNTDOWN_IDLE_REFRESH_MS,
            Math.max(1000, remainingMs - SUBSCRIPTION_EXPIRY_WARNING_MS)
          );
    const countdownTimer = window.setTimeout(() => {
      nowMs = Date.now();
    }, delay);
    return () => window.clearTimeout(countdownTimer);
  });

  onMount(() => {
    const onVisibilityChange = () => {
      pageVisible = document.visibilityState !== "hidden";
      if (pageVisible) nowMs = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  });
</script>

{#snippet trialOfferCard()}
  <Card class="trial-card trial-offer-card">
    <div class="trial-card-head">
      <Gift size={22} />
      <span>
        <strong>{t("wa_trial_offer_title", {}, "Start with a grace period")}</strong>
        <small>{t("wa_trial_title")}</small>
      </span>
    </div>
    <p class="trial-card-description">
      {trialPaymentEnabled
        ? t(
            "wa_trial_offer_paid_description",
            { duration: trialDurationLabel(), traffic: trialTrafficLabel() },
            "Pay once to activate {duration} of trial access with {traffic}."
          )
        : t(
            "wa_trial_offer_description",
            { duration: trialDurationLabel(), traffic: trialTrafficLabel() },
            "Activate a trial: {duration} of access and {traffic} available to download for free."
          )}
    </p>
    <div class="trial-card-facts">
      <span>
        <small>{t("wa_trial_duration_label", {}, "Duration")}</small>
        <strong>{trialDurationLabel()}</strong>
      </span>
      <span>
        <small>{t("wa_trial_download_traffic_label", {}, "Available to download")}</small>
        <strong>{trialTrafficLabel()}</strong>
      </span>
    </div>
    <Button
      class="wide trial-card-action"
      onclick={() => (trialConfirmOpen = true)}
      disabled={trialBusy}
    >
      <Gift size={18} />
      {trialPaymentEnabled
        ? t("wa_trial_pay_and_activate", {}, "Pay and activate")
        : t("wa_trial_try_free", {}, "Try for free")}
    </Button>
  </Card>
{/snippet}

<main class="home-layout zumvpn-home-layout">
  <div class="zumvpn-home-top">
    <div
      class="zumvpn-connection-circle"
      class:active={subscription.active}
      class:inactive={!subscription.active}
      aria-label={homeSubscriptionStatus}
    >
      <svg
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M12 2 4 5v6c0 5.2 3.5 9.7 8 11 4.5-1.3 8-5.8 8-11V5l-8-3Z" />
      </svg>
    </div>
    <div
      class="zumvpn-connection-status"
      class:active={subscription.active}
      class:inactive={!subscription.active}
    >
      {homeSubscriptionStatus}
    </div>
    <button class="zumvpn-instruction-card" type="button" onclick={openConnectLink}>
      <span class="zumvpn-instruction-icon" aria-hidden="true">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          /></svg
        >
      </span>
      <span class="zumvpn-instruction-copy">
        <strong>{t("wa_zumvpn_connect_guide", {}, "Инструкция по подключению")}</strong>
        <small>{t("wa_zumvpn_recommended_apps", {}, "Рекомендуем Happ и Incy")}</small>
      </span>
      <svg
        class="zumvpn-chevron"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="m9 5 7 7-7 7"
        /></svg
      >
    </button>
  </div>

  {#if !compactHomeEnabled && showHomeBalance}
    <UserExtensionPoint target="user.home.balance">
      <HomeBalanceCard {balance} {openBalanceTopup} {t} />
    </UserExtensionPoint>
  {/if}

  {#if telegramNotificationsNeedPrompt}
    <TelegramNotificationsBanner
      startLink={telegramNotificationsStartLink}
      status={telegramNotificationsStatus}
      onOpenBot={openTelegramNotificationsBot}
      {t}
    />
  {/if}

  <div class="home-bottom zumvpn-home-bottom">
    {#if trialOfferAvailable}
      {@render trialOfferCard()}
    {:else}
      <Card class="zumvpn-subscription-card" style="position:relative;isolation:isolate">
        <ThemeEffectSurface name="home.card.surface" />
        <div class="zumvpn-subscription-header">
          <h2>{t("wa_zumvpn_your_subscription", {}, "Ваша подписка")}</h2>
          <span class="zumvpn-subscription-status" class:inactive={!subscription.active}
            >{homeSubscriptionStatus}</span
          >
        </div>
        <div class="zumvpn-subscription-account">{accountLabel}</div>
        <div class="zumvpn-subscription-time">
          <div class="zumvpn-time-header">
            <div class="zumvpn-time-remaining">
              <strong>{subscription.active ? subscriptionDaysLeft : 0}</strong>
              <span>{t("wa_zumvpn_days_left", {}, "дней осталось")}</span>
            </div>
            <span class="zumvpn-time-end"
              >{subscription.active
                ? subscription.end_date_text || subscription.remaining_text
                : t("wa_zumvpn_no_active_subscription", {}, "Нет активной подписки")}</span
            >
          </div>
          <div class="zumvpn-progress-track">
            <span style={`width:${subscriptionProgress}%`}></span>
          </div>
        </div>
        <div class="zumvpn-subscription-link">
          <span class="zumvpn-subscription-caption">
            <svg
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
              ><path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.72" /><path
                d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.72-1.72"
              /></svg
            >
            VPN · {t("wa_zumvpn_subscription_link", {}, "Ссылка подписки")}
          </span>
          <span class="zumvpn-subscription-url"
            >{subscription.connect_url ||
              subscription.config_link ||
              t("wa_link_unavailable", {}, "Ссылка пока недоступна")}</span
          >
          <Button
            class="zumvpn-copy-button"
            variant="secondary"
            onclick={() =>
              copyText(
                String(subscription.connect_url || subscription.config_link),
                t("wa_link_copied")
              )}
            disabled={!subscription.connect_url && !subscription.config_link}
          >
            {t("wa_copy", {}, "Копировать")}
          </Button>
        </div>
        <Button class="wide zumvpn-manage-button" variant="secondary" onclick={openPaymentModal}>
          {t("wa_zumvpn_manage_subscription", {}, "Управлять подпиской")}
        </Button>
      </Card>
    {/if}
    {#if compactHomeEnabled}
      <UserExtensionPoint target="user.home.summary">
        <HomeCompactSummaryCard
          {balance}
          {subscription}
          {trafficMode}
          {currentTariffName}
          {hasActiveTariffSubscription}
          {subscriptionTermDisplayText}
          {subscriptionEndDisplayText}
          {subscriptionExpiryWarning}
          {subscriptionExpired}
          {autoRenewVisible}
          {autoRenewEnabled}
          {autoRenewBusy}
          {showSubscriptionPeriod}
          {showTariffName}
          {showSubscriptionEnd}
          {showChangeTariff}
          {showHomeBalance}
          {showRegularTraffic}
          {showPremiumTraffic}
          {showAutoRenew}
          {regularTrafficTopupBarClickable}
          {premiumTrafficTopupBarClickable}
          {openBalanceTopup}
          {openRegularTopupModal}
          {openPremiumTopupModal}
          {openTariffChangeModal}
          {toggleAutoRenew}
          {t}
        />
      </UserExtensionPoint>
    {:else}
      {#if subscription.active}
        <UserExtensionPoint target="user.home.subscription">
          <Card class={statusCardClass} style="position:relative;isolation:isolate">
            <ThemeEffectSurface name="home.card.surface" />
            {#if subscription.active}
              <div class="sub-status">
                <CheckCircle2 class="sub-status-icon" size={23} />
                <div class="sub-status-main">
                  <h2>
                    {trafficMode ? t("wa_home_access_active") : t("wa_home_subscription_active")}
                    {#if showSubscriptionPeriod}
                      <span class="meta-separator" aria-hidden="true"></span>
                      {subscriptionTermDisplayText}
                    {/if}
                  </h2>
                  {#if showTariffName || showSubscriptionEnd}
                    <div
                      class:sub-status-details-with-tariff={showTariffName && showSubscriptionEnd}
                      class="sub-status-details"
                    >
                      {#if showTariffName}
                        <p class="current-tariff-line">
                          {t("wa_current_tariff", { tariff: currentTariffName })}
                        </p>
                      {/if}
                      {#if showSubscriptionEnd}
                        <p class="subscription-end-line">
                          {subscriptionEndDisplayText
                            ? t("wa_until_date", { date: subscriptionEndDisplayText })
                            : subscription.remaining_text}
                        </p>
                      {/if}
                    </div>
                  {/if}
                </div>
                {#if showChangeTariff}
                  <Button
                    data-webapp-action="open-tariff-change"
                    class="status-tariff-action"
                    variant="secondary"
                    onclick={openTariffChangeModal}
                  >
                    <Repeat2 size={17} />
                    {t("wa_change_tariff")}
                  </Button>
                {/if}
              </div>
              {#if showAutoRenew}
                <div class="auto-renew-row">
                  <div class="auto-renew-state">
                    <Repeat2 size={17} />
                    <span>
                      <strong>
                        {autoRenewEnabled
                          ? t("wa_auto_renew_enabled")
                          : t("wa_auto_renew_disabled")}
                      </strong>
                    </span>
                  </div>
                  <Button
                    class="auto-renew-action"
                    variant="secondary"
                    onclick={() => toggleAutoRenew(!autoRenewEnabled)}
                    disabled={autoRenewBusy ||
                      (!autoRenewEnabled && !subscription?.auto_renew_can_enable)}
                  >
                    {#if autoRenewEnabled}
                      <CircleX size={17} />
                      {t("wa_auto_renew_disable")}
                    {:else}
                      <Repeat2 size={17} />
                      {t("wa_auto_renew_enable")}
                    {/if}
                  </Button>
                </div>
              {/if}
            {/if}
          </Card>
        </UserExtensionPoint>
      {/if}
    {/if}

    {#if subscription.active}
      {#if !compactHomeEnabled}
        <UserExtensionPoint target="user.home.traffic">
          {#if showRegularTraffic}
            <Card compact class={regularTrafficCardClass(subscription)}>
              {#if regularTrafficTopupBarClickable}
                <button
                  data-webapp-action="open-regular-topup"
                  class="card-click-target"
                  type="button"
                  onclick={openRegularTopupModal}
                  aria-label={t("wa_add_traffic")}
                ></button>
              {/if}
              <div
                class="premium-server-dropdown premium-server-dropdown-inline traffic-reset-dropdown"
                data-open={regularTrafficResetOpen ? "true" : undefined}
              >
                <button
                  class="traffic-summary-row premium-server-summary premium-server-trigger"
                  type="button"
                  aria-expanded={regularTrafficResetOpen}
                  aria-controls={REGULAR_TRAFFIC_RESET_DETAIL_ID}
                  onclick={() => {
                    regularTrafficResetOpen = !regularTrafficResetOpen;
                  }}
                >
                  <span class="traffic-summary-left premium-summary-trigger">
                    <span class="premium-summary-copy">
                      {t("wa_home_traffic_used")}
                      {#if trafficResetScheduled(subscription)}
                        <span class="traffic-summary-separator" aria-hidden="true">|</span>
                        {trafficResetLabel(subscription)}
                      {/if}
                    </span>
                    <CircleQuestionMark class="premium-server-help-icon" size={15} />
                  </span>
                  <strong class="traffic-summary-right">
                    <span>{trafficLabel(subscription)}</span>
                    <span class="traffic-summary-separator" aria-hidden="true">|</span>
                    <span>{trafficPercent(subscription)}%</span>
                  </strong>
                </button>
                {#if regularTrafficResetOpen}
                  <div
                    id={REGULAR_TRAFFIC_RESET_DETAIL_ID}
                    class="premium-server-list premium-server-list-dropdown traffic-reset-detail"
                    transition:slide={RESET_DETAIL_TRANSITION}
                  >
                    <div class="traffic-reset-detail-inner">
                      {#if trafficResetScheduled(subscription)}
                        <div class="traffic-reset-date-row">
                          <small>{t("wa_traffic_next_reset_label", {}, "Next reset")}</small>
                          <strong>{trafficNextResetLabel(subscription)}</strong>
                        </div>
                      {:else}
                        <div class="traffic-reset-date-row">
                          <small>{t("wa_traffic_reset_policy", {}, "Traffic reset policy")}</small>
                          <strong>{trafficResetLabel(subscription)}</strong>
                        </div>
                        <p class="traffic-reset-note">
                          {t(
                            "wa_traffic_reset_none_details",
                            {},
                            "Traffic does not reset automatically: available volume stays until you use it. If the tariff supports top-ups, you can add traffic with a separate package."
                          )}
                        </p>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
              <LinearProgress
                value={trafficPercent(subscription)}
                label={t("wa_home_traffic_used")}
              />
            </Card>
          {/if}
          {#if showPremiumTraffic}
            <Card
              compact
              class={`traffic-card-compact ${premiumTrafficTopupBarClickable ? "traffic-card-clickable " : ""}premium-traffic-card${subscription?.premium_is_limited ? " premium-traffic-card-limited" : ""}`}
            >
              {#if premiumTrafficTopupBarClickable}
                <button
                  data-webapp-action="open-premium-topup"
                  class="card-click-target"
                  type="button"
                  onclick={openPremiumTopupModal}
                  aria-label={t("wa_add_traffic_premium", { target: premiumTitle(subscription) })}
                ></button>
              {/if}
              <div
                class="premium-server-dropdown premium-server-dropdown-inline traffic-reset-dropdown"
                data-open={premiumTrafficResetOpen ? "true" : undefined}
              >
                <button
                  class="traffic-summary-row premium-server-summary premium-server-trigger"
                  type="button"
                  aria-expanded={premiumTrafficResetOpen}
                  aria-controls={PREMIUM_TRAFFIC_RESET_DETAIL_ID}
                  onclick={() => {
                    premiumTrafficResetOpen = !premiumTrafficResetOpen;
                  }}
                >
                  <span class="traffic-summary-left premium-summary-trigger">
                    <span class="premium-summary-copy">
                      {premiumTitle(subscription)}
                      <span class="traffic-summary-separator" aria-hidden="true">|</span>
                      {premiumTrafficMetaLabel(subscription)}
                    </span>
                    <CircleQuestionMark class="premium-server-help-icon" size={15} />
                  </span>
                  <strong class="traffic-summary-right">
                    <span>{premiumTrafficLabel(subscription)}</span>
                    <span class="traffic-summary-separator" aria-hidden="true">|</span>
                    <span>{premiumTrafficPercent(subscription)}%</span>
                  </strong>
                </button>
                {#if premiumTrafficResetOpen}
                  <div
                    id={PREMIUM_TRAFFIC_RESET_DETAIL_ID}
                    class="premium-server-list premium-server-list-dropdown traffic-reset-detail"
                    transition:slide={RESET_DETAIL_TRANSITION}
                  >
                    <div class="traffic-reset-detail-inner">
                      <div class="traffic-reset-date-row">
                        <small>{t("wa_traffic_next_reset_label", {}, "Next reset")}</small>
                        <strong>{premiumNextResetLabel(subscription)}</strong>
                      </div>
                      {#if premiumServerLabels(subscription).length}
                        <div>
                          {#each premiumServerLabels(subscription).slice(0, 8) as label}
                            <span>{label}</span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
              <LinearProgress
                class="premium-progress"
                value={premiumTrafficPercent(subscription)}
                label={premiumTitle(subscription)}
              />
            </Card>
          {/if}
        </UserExtensionPoint>
      {/if}
    {:else}
      {#if referralWelcomeRequiresTelegram}
        <Card class="trial-card trial-offer-card">
          <div class="trial-card-head">
            <Gift size={22} />
            <span>
              <strong>
                {t(
                  "wa_referral_welcome_telegram_required_title",
                  {},
                  "Your bonus is waiting for Telegram"
                )}
              </strong>
              <small>{t("wa_referral_program_title", {}, "Referral program")}</small>
            </span>
          </div>
          <p class="trial-card-description">
            {t(
              "wa_referral_welcome_telegram_required_description",
              { days: Number(referral?.welcome_bonus_days || 0) },
              "Link Telegram to claim {days} bonus days for registering via an invite."
            )}
          </p>
          <Button
            class="wide trial-card-action settings-telegram-link-btn attention-wrap"
            variant="telegram"
            onclick={linkTelegramAndClaimReferralWelcome}
            disabled={linkTelegramBusy}
          >
            <AttentionDot />
            <Send size={18} />
            {t("wa_referral_link_telegram_and_claim", {}, "Link and claim bonus")}
          </Button>
        </Card>
      {/if}

      {#if trialRequiresOauth}
        <Card class="trial-card trial-offer-card">
          <div class="trial-card-head">
            <Gift size={22} />
            <span>
              <strong>
                {trialRequiresTelegram
                  ? t("wa_trial_telegram_required_title", {}, "Link Telegram to start trial")
                  : t("wa_trial_oauth_required_title", {}, "Link an account to start trial")}
              </strong>
              <small>{t("wa_trial_title")}</small>
            </span>
          </div>
          <p class="trial-card-description">
            {trialRequiresTelegram
              ? t(
                  "wa_trial_telegram_required_description",
                  { duration: trialDurationLabel(), traffic: trialTrafficLabel() },
                  "To activate a {duration} trial with {traffic}, link Telegram first."
                )
              : t(
                  "wa_trial_oauth_required_description",
                  { duration: trialDurationLabel(), traffic: trialTrafficLabel() },
                  "To activate a {duration} trial with {traffic}, link Telegram or another available login provider first."
                )}
          </p>
          <div class="trial-card-facts">
            <span>
              <small>{t("wa_trial_duration_label", {}, "Duration")}</small>
              <strong>{trialDurationLabel()}</strong>
            </span>
            <span>
              <small>{t("wa_trial_download_traffic_label", {}, "Available to download")}</small>
              <strong>{trialTrafficLabel()}</strong>
            </span>
          </div>
          {#if trialRequiresTelegram}
            <Button
              class="wide trial-card-action settings-telegram-link-btn attention-wrap"
              variant="telegram"
              onclick={linkTelegramAndActivateTrial}
              disabled={linkTelegramBusy || trialBusy}
            >
              <AttentionDot />
              <Send size={18} />
              {t("wa_trial_link_telegram_and_activate", {}, "Link and activate")}
            </Button>
          {:else}
            <Button class="wide trial-card-action attention-wrap" onclick={goSecurity}>
              <AttentionDot />
              {t("wa_trial_choose_oauth_provider", {}, "Choose login provider")}
            </Button>
          {/if}
        </Card>
      {/if}
    {/if}

    {#if !trialOfferAvailable}
      <Button class="wide zumvpn-builder-entry" variant="secondary" onclick={openPlanBuilder}>
        <CreditCard size={18} />
        {t("wa_zumvpn_build_plan", {}, "Собрать свой тариф")}
      </Button>
    {/if}

    {#if serverStatusShowOnHome}
      <UserExtensionPoint target="user.home.status">
        <ServerStatusCard {statusStore} {goStatus} {openExternalLink} {t} />
      </UserExtensionPoint>
    {/if}

    <div class="action-stack zumvpn-action-stack">
      {#if subscription.active}
        <Button class="wide" onclick={openConnectLink}>
          <Download size={18} />
          {t("wa_install_and_configure")}
        </Button>
      {/if}
      {#if !trialOfferAvailable}
        <Button
          data-webapp-action="open-payment"
          class={`wide${subscription.active ? " subscription-renew-action" : ""}`}
          variant={subscription.active ? "secondary" : "default"}
          onclick={openPaymentModal}
        >
          {#if subscription.active}
            <CreditCard size={18} />
          {:else if trafficMode}
            <Database size={18} />
          {/if}
          {primaryPayActionLabel()}
        </Button>
      {/if}
      {#if regularTrafficTopupUnlocked && regularTrafficLimitVisible(subscription)}
        <Button
          data-webapp-action="open-regular-topup"
          class="wide"
          variant="secondary"
          onclick={openRegularTopupModal}
        >
          <Database size={18} />
          {t("wa_add_traffic")}
        </Button>
      {/if}
      {#if premiumTrafficTopupUnlocked && premiumTrafficAvailable(subscription) && premiumTrafficLimitVisible(subscription)}
        <Button
          data-webapp-action="open-premium-topup"
          class="wide"
          variant="secondary"
          onclick={openPremiumTopupModal}
        >
          <Database size={18} />
          {t("wa_add_traffic_premium", { target: premiumTitle(subscription) })}
        </Button>
      {/if}
    </div>
  </div>
</main>

<Dialog
  open={trialConfirmOpen}
  title={t("wa_trial_offer_title", {}, "Бесплатный пробный период")}
  description={t(
    "wa_zumvpn_trial_confirm_description",
    { duration: trialDurationLabel(), traffic: trialTrafficLabel() },
    "Перед активацией проверьте условия пробного доступа."
  )}
  closeLabel={t("wa_close")}
  onclose={() => (trialConfirmOpen = false)}
  class="zumvpn-trial-confirm-dialog"
>
  <div class="zumvpn-trial-confirm-facts">
    <div>
      <small>{t("wa_trial_duration_label", {}, "Срок")}</small><strong
        >{trialDurationLabel()}</strong
      >
    </div>
    <div>
      <small>{t("wa_trial_download_traffic_label", {}, "Доступно для скачивания")}</small><strong
        >{trialTrafficLabel()}</strong
      >
    </div>
  </div>
  <div class="zumvpn-trial-channel-note">
    <Gift size={20} />
    <p>
      {trialChannelConfigured
        ? t(
            "wa_zumvpn_trial_channel_note",
            {},
            "Для получения доступа необходимо подписаться на канал проекта в Telegram. После подписки нажмите «Активировать»."
          )
        : t(
            "wa_zumvpn_trial_channel_unconfigured",
            {},
            "Для получения доступа нужна подписка на Telegram-канал. Ссылка на канал пока не настроена, поэтому активировать пробный доступ сейчас нельзя."
          )}
    </p>
  </div>
  <div class="zumvpn-trial-confirm-actions">
    {#if requiredChannelUrl}
      <Button class="wide" onclick={() => openExternalLink(requiredChannelUrl)}>
        {t("wa_zumvpn_open_channel", {}, "Подписаться на канал")}
      </Button>
      <Button
        class="wide"
        variant="secondary"
        onclick={() => {
          trialConfirmOpen = false;
          activateTrial();
        }}
        disabled={trialBusy}
      >
        {trialBusy ? t("wa_loading") : t("wa_trial_try_free", {}, "Активировать пробный период")}
      </Button>
    {:else}
      <Button class="wide" variant="secondary" onclick={() => (trialConfirmOpen = false)}>
        {t("wa_close", {}, "Закрыть")}
      </Button>
    {/if}
  </div>
</Dialog>

<Dialog
  open={builderOpen}
  title={t("wa_zumvpn_builder_title", {}, "Соберите свой тариф")}
  description={t("wa_zumvpn_builder_description", {}, "Настройте подписку под себя")}
  closeLabel={t("wa_close")}
  onclose={() => (builderOpen = false)}
  class="zumvpn-plan-builder-dialog"
  scrollType="scroll"
>
  <div class="zumvpn-builder-presets">
    {#each Object.entries(BUILDER_PRESETS) as [key, preset]}
      <button
        class:selected={builderPreset === key}
        type="button"
        onclick={() => selectBuilderPreset(key as keyof typeof BUILDER_PRESETS)}
      >
        <strong
          >{t(
            `wa_zumvpn_preset_${key}`,
            {},
            key === "start" ? "Старт" : key === "everyday" ? "Каждый день" : "Максимум"
          )}</strong
        >
        <small
          >{preset.duration}
          {t("wa_zumvpn_days", {}, "дней")} · {preset.devices}
          {t("wa_devices_title", {}, "устройства")}</small
        >
      </button>
    {/each}
  </div>
  <section class="zumvpn-builder-section">
    <label
      ><span>{t("wa_zumvpn_duration", {}, "Срок подписки")}</span><output
        >{builderDuration} {t("wa_zumvpn_days", {}, "дней")}</output
      >
      <RangeInput
        min="1"
        max="730"
        step="1"
        bind:value={builderDuration}
        onValueChange={() => (builderPreset = "custom")}
        ariaLabel={t("wa_zumvpn_duration", {}, "Срок подписки")}
      />
    </label>
    <label
      ><span>{t("wa_zumvpn_devices", {}, "Устройства")}</span><output>{builderDevices}</output>
      <RangeInput
        min="1"
        max="10"
        step="1"
        bind:value={builderDevices}
        onValueChange={() => (builderPreset = "custom")}
        ariaLabel={t("wa_zumvpn_devices", {}, "Устройства")}
      />
    </label>
    <div class="zumvpn-builder-traffic">
      <strong>{t("wa_zumvpn_traffic", {}, "Трафик")}</strong>
      <div>
        <Button
          variant={builderTrafficMode === "unlimited" ? "default" : "secondary"}
          onclick={() => {
            builderTrafficMode = "unlimited";
            builderPreset = "custom";
          }}>{t("wa_zumvpn_unlimited", {}, "∞ Безлимит")}</Button
        >
        <Button
          variant={builderTrafficMode === "limited" ? "default" : "secondary"}
          onclick={() => {
            builderTrafficMode = "limited";
            builderPreset = "custom";
          }}>{t("wa_zumvpn_by_volume", {}, "По объёму")}</Button
        >
      </div>
      {#if builderTrafficMode === "limited"}
        <label
          ><span>{t("wa_zumvpn_traffic_limit", {}, "Лимит трафика")}</span><output
            >{builderTrafficGb} GB</output
          >
          <RangeInput
            min="1"
            max="300"
            step="1"
            bind:value={builderTrafficGb}
            onValueChange={() => (builderPreset = "custom")}
            ariaLabel={t("wa_zumvpn_traffic_limit", {}, "Лимит трафика")}
          />
        </label>
      {/if}
    </div>
  </section>
  <section class="zumvpn-builder-quote" aria-live="polite">
    <div>
      <span>{t("wa_zumvpn_total", {}, "Стоимость выбранного тарифа")}</span><strong
        >{builderQuoteBusy
          ? t("wa_loading")
          : builderPrice > 0
            ? `${builderPrice} ${builderQuote?.currency || builderQuotePlan?.currency || "RUB"}`
            : builderQuoteError ||
              t("wa_zumvpn_checkout_confirms_price", {}, "Точную цену подтвердит checkout")}</strong
      >
    </div>
    {#if !builderSupportedDevices || !builderSupportedTraffic}
      <p class="zumvpn-builder-limits">
        {t(
          "wa_zumvpn_builder_supported_values",
          {},
          "Часть выбранных параметров недоступна в текущей настройке тарифов. На оплате будут доступны только настроенные варианты."
        )}
      </p>
    {/if}
    <Button class="wide" onclick={continueWithBuiltPlan}
      >{t("wa_checkout_continue", {}, "Продолжить к оплате")}</Button
    >
  </section>
</Dialog>

<style>
  :global(.home-bottom > section.status-card) {
    padding-left: 11px;
  }
</style>
