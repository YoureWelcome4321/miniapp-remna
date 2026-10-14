<script lang="ts">
  import Button from "$components/ui/button.svelte";
  import Card from "$components/ui/card.svelte";
  import { trafficPercent, trafficLabel, regularTrafficLimitVisible } from "$lib/webapp/traffic.js";
  import type {
    CopyTextAction,
    SubscriptionView,
    Translate,
    UserProfile,
    VoidAction,
    OpenLinkAction,
  } from "$lib/webapp/types.js";

  type Props = {
    subscription?: SubscriptionView;
    user?: UserProfile;
    currentLang?: string;
    trafficMode?: boolean;
    openPaymentModal: VoidAction;
    onTrialRequest: VoidAction;
    trialBusy?: boolean;
    copyText: CopyTextAction;
    privacyPolicyUrl?: string;
    userAgreementUrl?: string;
    openExternalLink: OpenLinkAction;
    t: Translate;
  };

  let {
    subscription = {},
    user = {},
    trafficMode = false,
    openPaymentModal,
    onTrialRequest,
    trialBusy = false,
    copyText,
    privacyPolicyUrl = "",
    userAgreementUrl = "",
    openExternalLink,
    t,
  }: Props = $props();

  const link = $derived(String(subscription.connect_url || subscription.config_link || ""));
  const usedLabel = $derived(trafficLabel(subscription, t));
  const trafficProgress = $derived(trafficPercent(subscription));
  const trafficLimitVisible = $derived(regularTrafficLimitVisible(subscription));
  const maxDevices = $derived(
    Number(subscription.max_devices ?? subscription.base_hwid_device_limit ?? 0)
  );
  const devicesLabel = $derived(maxDevices > 0 ? String(maxDevices) : t("wa_devices_unlimited"));
  const remainingDays = $derived(Math.max(0, Number(subscription.days_left || 0)));
  const emailOrId = $derived(
    String(
      user.telegram_id
        ? `@${user.username || user.telegram_id}`
        : user.email ||
            (user.id ? `ID: ${user.id}` : t("wa_zumvpn_account_label", {}, "Telegram-пользователь"))
    )
  );

  async function copySubscriptionLink() {
    if (link) await copyText(link, t("wa_link_copied"));
  }
</script>

<main class="content with-nav zumvpn-page zumvpn-subscription-page">
  <header class="subscription-page-heading zumvpn-page-heading">
    <h2>{t("wa_subscription_title", {}, "Подписка")}</h2>
    <p>{t("wa_zumvpn_subscription_subtitle", {}, "Срок, трафик и устройства вашего тарифа")}</p>
  </header>

  <Card class="zumvpn-account-card">
    <div class="zumvpn-account-row">
      <span class="zumvpn-icon-tile" aria-hidden="true">✉</span>
      <span
        ><small>{t("wa_zumvpn_telegram_label", {}, "TELEGRAM")}</small><strong>{emailOrId}</strong
        ></span
      >
    </div>
    <div class="zumvpn-link-block">
      <span class="zumvpn-section-label"
        ><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71"/></svg>{t("wa_zumvpn_connection_link", {}, "Ссылка на подключение")}</span
      >
      <div class="zumvpn-link-row">
        <span>{link || t("wa_link_unavailable")}</span>
        <Button class="zumvpn-inline-copy" variant="secondary" disabled={!link} onclick={copySubscriptionLink}
          >{t("wa_copy", {}, "Копировать")}</Button
        >
      </div>
    </div>
  </Card>

  <Card class="zumvpn-plan-card">
    <div class="zumvpn-plan-heading">
      <div>
        <strong>{t("wa_zumvpn_plan_parameters", {}, "ПАРАМЕТРЫ ТАРИФА")}</strong><small
          >{subscription.tariff_name ||
            t("wa_zumvpn_current_plan", {}, "Текущий план обслуживания")}</small
        >
      </div>
      <span class="zumvpn-subscription-status" class:inactive={!subscription.active}
        >{subscription.active
          ? t("wa_home_subscription_active", {}, "Активна")
          : t("wa_home_subscription_inactive", {}, "Не активна")}</span
      >
    </div>
    <div class="zumvpn-term-block">
      <div>
        <small>{t("wa_zumvpn_remaining", {}, "ОСТАЛОСЬ")}</small><strong
          >{subscription.active ? remainingDays : "—"}<i>{t("wa_zumvpn_days", {}, "дней")}</i
          ></strong
        >
      </div>
      <span
        >{subscription.active
          ? subscription.end_date_text || subscription.remaining_text
          : t("wa_zumvpn_subscription_not_loaded", {}, "Данные тарифа не загружены")}</span
      >
    </div>
    <div class="zumvpn-resource-list">
      <div class="zumvpn-resource">
        <div>
          <span
            >{trafficMode
              ? t("wa_zumvpn_traffic_used", {}, "ИСПОЛЬЗОВАНО ТРАФИКА")
              : t("wa_zumvpn_traffic", {}, "ТРАФИК")}</span
          ><strong
            >{trafficMode || trafficLimitVisible ? usedLabel : t("wa_unlimited_traffic")}</strong
          >
        </div>
        <div class="zumvpn-resource-track">
          <span class:unlimited={!trafficLimitVisible} style={`width:${trafficProgress}%`}></span>
        </div>
      </div>
      <div class="zumvpn-resource">
        <div>
          <span>{t("wa_zumvpn_devices_connected", {}, "ПОДКЛЮЧЕННЫЕ УСТРОЙСТВА")}</span><strong
            >{devicesLabel}</strong
          >
        </div>
        <div class="zumvpn-resource-track">
          <span class:unlimited={maxDevices <= 0} style={`width:${maxDevices > 0 ? 0 : 100}%`}
          ></span>
        </div>
      </div>
    </div>
  </Card>

  <Button class="wide zumvpn-renew-button" onclick={openPaymentModal}
    >{subscription.active
      ? t("wa_renew_subscription", {}, "Продлить подписку")
      : t("wa_pay_subscription", {}, "Выбрать подписку")}</Button
  >
  {#if !subscription.active && user.id}
    <Button class="wide" variant="secondary" disabled={trialBusy} onclick={onTrialRequest}
      >{trialBusy
        ? t("wa_loading")
        : t("wa_zumvpn_activate_trial", {}, "Активировать пробный период")}</Button
    >
  {/if}

  {#if privacyPolicyUrl || userAgreementUrl}
    <section class="zumvpn-legal">
      <h3>{t("wa_zumvpn_documents", {}, "ИНФОРМАЦИЯ")}</h3>
      {#if userAgreementUrl}<button onclick={() => openExternalLink(userAgreementUrl)}
          >{t("wa_auth_legal_agreement", {}, "Пользовательское соглашение")} <span>›</span></button
        >{/if}
      {#if privacyPolicyUrl}<button onclick={() => openExternalLink(privacyPolicyUrl)}
          >{t("wa_zumvpn_privacy", {}, "Политика конфиденциальности")} <span>›</span></button
        >{/if}
    </section>
  {/if}
</main>
