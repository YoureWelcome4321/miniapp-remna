<script lang="ts">
  import UserExtensionPoint from "../extensions/UserExtensionPoint.svelte";
  import GiftEntry from "../gifts/GiftEntry.svelte";
  import { ChevronDown, CircleQuestionMark, Gift } from "$components/ui/icons.js";
  import { slide } from "svelte/transition";

  import CopyLinkField from "$components/patterns/CopyLinkField.svelte";
  import LinkQrDialog from "$components/patterns/webapp/LinkQrDialog.svelte";
  import Button from "$components/ui/button.svelte";
  import Card from "$components/ui/card.svelte";
  import { StatusMessage } from "$components/patterns/webapp/index.js";
  import { visibleReferralLinks, type ReferralLinkEntry } from "$lib/webapp/referralLinks.js";
  import { referralStats } from "$lib/webapp/referralStats.js";
  import PromoActivationCard from "../PromoActivationCard.svelte";
  import type {
    CopyTextAction,
    ReferralBonusDetail,
    ReferralState,
    StringAction,
    Translate,
    VoidAction,
  } from "$lib/webapp/types.js";
  import type { ReferralBonusListMode } from "$lib/webapp/themeStyle.js";

  type Props = {
    applyPromo?: VoidAction;
    clearPromoFieldError?: VoidAction;
    copyText?: CopyTextAction;
    promoBusy?: boolean;
    promoCode?: string;
    promoFieldError?: string;
    promoIsError?: boolean;
    promoStatus?: string;
    referral?: ReferralState;
    referralProgramEnabled?: boolean;
    referralBonusDetails?: ReferralBonusDetail[];
    referralBonusListMode?: ReferralBonusListMode;
    referralOneBonusPerReferee?: boolean;
    referralWelcomeBonusDays?: number;
    setPromoCode?: StringAction;
    t?: Translate;
  };

  let {
    referral = {},
    referralProgramEnabled = true,
    referralBonusDetails = [],
    referralBonusListMode = "plain",
    referralOneBonusPerReferee = false,
    referralWelcomeBonusDays = 0,
    promoBusy = false,
    promoCode = "",
    promoFieldError = "",
    promoIsError = false,
    promoStatus = "",
    applyPromo = () => {},
    setPromoCode = () => {},
    clearPromoFieldError = () => {},
    copyText = async () => {},
    t = (key) => key,
  }: Props = $props();

  const tariffBonusSummaries = $derived(
    referralBonusDetails.filter((bonus) => Array.isArray(bonus.details))
  );
  const periodBonusDetails = $derived(
    referralBonusDetails.filter((bonus) => !Array.isArray(bonus.details))
  );
  const usesTariffBonusSummaries = $derived(tariffBonusSummaries.length > 0);
  const referralLinks = $derived(visibleReferralLinks(referral));
  const stats = $derived(referralStats(referral));
  const firstPeriodBonus = $derived(periodBonusDetails[0] || null);
  const inviterRewardDays = $derived(Number(firstPeriodBonus?.inviter_days || 0));
  const friendRewardDays = $derived(
    Number(referralWelcomeBonusDays || firstPeriodBonus?.friend_days || 0)
  );
  const inviterRewardText = $derived.by(() => {
    if (usesTariffBonusSummaries && tariffBonusSummaries[0]) {
      const bonus = tariffBonusSummaries[0];
      return `+${daysRange(bonus.inviter_min_days, bonus.inviter_max_days)}`;
    }
    return inviterRewardDays > 0 ? `+${inviterRewardDays} ${t("wa_zumvpn_days", {}, "дней")}` : "—";
  });
  const friendRewardText = $derived.by(() => {
    if (referralWelcomeBonusDays > 0) return `+${referralWelcomeBonusDays} ${t("wa_zumvpn_days", {}, "дней")}`;
    if (usesTariffBonusSummaries && tariffBonusSummaries[0]) {
      const bonus = tariffBonusSummaries[0];
      return `+${daysRange(bonus.friend_min_days, bonus.friend_max_days)}`;
    }
    return friendRewardDays > 0 ? `+${friendRewardDays} ${t("wa_zumvpn_days", {}, "дней")}` : "—";
  });
  const periodBonusListCollapsible = $derived(referralBonusListMode !== "plain");
  // Mirrors the traffic reset disclosure in HomeScreen.svelte: the theme picks
  // the default state, the reader can still expand and collapse it by hand.
  const PERIOD_BONUS_LIST_ID = "referral-bonus-period-list";
  const PERIOD_BONUS_LIST_TRANSITION = { duration: 220 };
  let periodBonusListOpen = $state(false);
  let qrLink = $state<ReferralLinkEntry | null>(null);

  $effect(() => {
    periodBonusListOpen = referralBonusListMode === "expanded";
  });

  function daysRange(minDays: unknown, maxDays: unknown): string {
    return t("wa_referral_bonus_range_days", {
      min: Number(minDays || 0),
      max: Number(maxDays || 0),
    });
  }

  async function shareReferralLink(url: string) {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }
    await copyText(url, t("wa_link_copied"));
  }
</script>

<main class="content with-nav zumvpn-page zumvpn-referrals-page">
  <header class="subscription-page-heading zumvpn-page-heading">
    <h2>{t("wa_referral_page_title", {}, "Рефералы")}</h2>
    <p>{t("wa_referral_page_subtitle", {}, "Приглашайте друзей и получайте дни подписки")}</p>
  </header>
  {#snippet periodBonusRows(nested = false)}
    {#each periodBonusDetails as bonus, index (bonus.id || `${bonus.tariff_key || "legacy"}:${bonus.months || index}`)}
      <div class={nested ? "referral-bonus-row referral-bonus-row-nested" : "referral-bonus-row"}>
        <strong>{bonus.title || `${bonus.months || "?"}`}</strong>
        <small
          >{t("wa_referral_bonus_you_days", {
            days: Number(bonus.inviter_days || 0),
          })}</small
        >
        <small
          >{t("wa_referral_bonus_friend_days", {
            days: Number(bonus.friend_days || 0),
          })}</small
        >
      </div>
    {/each}
  {/snippet}
  {#snippet tariffBonusRows()}
    {#each tariffBonusSummaries as tariffBonus, index (tariffBonus.id || `tariff:${tariffBonus.tariff_key || index}`)}
      <details class="referral-tariff-dropdown" open={referralBonusListMode === "expanded"}>
        <summary class="referral-tariff-summary">
          <span class="referral-tariff-copy">
            <strong
              >{Array.isArray(tariffBonus.tariff_names) && tariffBonus.tariff_names.length > 1
                ? tariffBonus.tariff_names.join(", ")
                : tariffBonus.title || tariffBonus.tariff_name}</strong
            >
            {#if Array.isArray(tariffBonus.tariff_names) && tariffBonus.tariff_names.length > 1}
              <small>{t("wa_referral_bonus_shared_terms")}</small>
            {/if}
            <small>
              {t("wa_referral_bonus_you_range", {
                range: daysRange(tariffBonus.inviter_min_days, tariffBonus.inviter_max_days),
              })}
            </small>
            <small>
              {t("wa_referral_bonus_friend_range", {
                range: daysRange(tariffBonus.friend_min_days, tariffBonus.friend_max_days),
              })}
            </small>
          </span>
          <CircleQuestionMark class="premium-server-help-icon" size={16} />
        </summary>
        <div class="referral-tariff-details">
          <div class="referral-tariff-detail-list">
            {#each tariffBonus.details || [] as bonus, detailIndex (bonus.id || `${tariffBonus.tariff_key || index}:${bonus.months || detailIndex}`)}
              <div class="referral-bonus-row referral-bonus-row-nested">
                <strong>{bonus.title || `${bonus.months || "?"}`}</strong>
                <small
                  >{t("wa_referral_bonus_you_days", {
                    days: Number(bonus.inviter_days || 0),
                  })}</small
                >
                <small
                  >{t("wa_referral_bonus_friend_days", {
                    days: Number(bonus.friend_days || 0),
                  })}</small
                >
              </div>
            {/each}
          </div>
        </div>
      </details>
    {/each}
  {/snippet}
  <UserExtensionPoint target="user.invite.referrals">
    {#if referralProgramEnabled}<section class="referral-program-shell">
        <div class="referral-program-content">
          <Card class="bonus-card zumvpn-referral-bonus-card">
            <div class="bonus-card-head">
              <Gift size={42} />
              <div>
                <small>{t("wa_referral_program_kicker", {}, "БОНУСНАЯ ПРОГРАММА")}</small>
                <strong>{t("wa_referral_program_headline", {}, "Выгода для вас и друга")}</strong>
                {#if referralOneBonusPerReferee}
                  <p>{t("wa_referral_bonus_once_note")}</p>
                {/if}
              </div>
            </div>
            <div class="zumvpn-referral-rewards">
              <div>
                <strong>{inviterRewardText}</strong>
                <small>{t("wa_referral_reward_inviter_caption", {}, "вам за приглашение")}</small>
              </div>
              <div>
                <strong>{friendRewardText}</strong>
                <small>{t("wa_referral_reward_friend_caption", {}, "другу при регистрации")}</small>
              </div>
            </div>
          </Card>

          <Card class="zumvpn-referral-link-card">
            <div class="zumvpn-referral-link-stats">
              <div>
                <small>{t("wa_referral_stats_invited")}</small>
                <strong>{stats.invited}</strong>
                <span>{t("wa_referral_invited_caption", {}, "друзей присоединились")}</span>
                <em>{t("wa_referral_paid_caption", { count: stats.paid }, "{count} оплатили")}</em>
              </div>
              <div>
                <small>{t("wa_referral_stats_received")}</small>
                <strong>{stats.received?.days ?? 0} <i>{t("wa_zumvpn_days", {}, "дней")}</i></strong>
                <span>{t("wa_referral_received_caption", {}, "начислено вам")}</span>
              </div>
            </div>
            <div class="zumvpn-referral-links">
              <h3>{t("wa_referral_link_title")}</h3>
              {#if referralLinks.length}
                {#each referralLinks as link (link.id)}
                  <div class="referral-link-item">
                    <small class="referral-link-label">{t(link.labelKey)}</small>
                    <CopyLinkField
                      value={link.url}
                      inputLabel={t(link.labelKey)}
                      copyLabel={t("wa_copy")}
                      qrLabel={t("wa_referral_qr_show")}
                      oncopy={(value) => copyText(value, t("wa_link_copied"))}
                      onqr={() => (qrLink = link)}
                    />
                  </div>
                  <Button class="zumvpn-referral-share" onclick={() => shareReferralLink(link.url)}>
                    {t("wa_referral_share_link", {}, "Поделиться ссылкой")}
                  </Button>
                {/each}
              {:else}
                <div class="zumvpn-referral-unavailable">{t("wa_link_unavailable")}</div>
                <p class="zumvpn-referral-explainer">
                  {t("wa_referral_unavailable_note", {}, "Другу достаточно открыть ссылку и зарегистрироваться. Бонус начислится после создания нового аккаунта.")}
                </p>
              {/if}
            </div>
          </Card>

          <section class="zumvpn-referral-recent">
            <h3>{t("wa_referral_recent_title", {}, "ПОСЛЕДНИЕ ПРИГЛАШЕНИЯ")}</h3>
            <Card>
              {stats.invited === 0
                ? t("wa_referral_recent_empty", {}, "Пока никто не присоединился")
                : t("wa_referral_recent_unavailable", { count: stats.invited }, "Приглашено друзей: {count}")}
            </Card>
          </section>

          {#if referralBonusDetails.length || referralWelcomeBonusDays > 0}
            <Card class="referral-bonus-list zumvpn-referral-details">
              <h3>{t("wa_referral_bonus_paid_intro")}</h3>
              {#if referralWelcomeBonusDays > 0}
                <div class="referral-bonus-row">
                  <strong>{t("wa_referral_bonus_registration_title")}</strong>
                  <small>{t("wa_referral_bonus_friend_days", { days: referralWelcomeBonusDays })}</small>
                </div>
              {/if}
              {#if referralBonusDetails.length && periodBonusListCollapsible}
                <div class="referral-bonus-disclosure" data-open={periodBonusListOpen ? "true" : undefined}>
                  <button class="referral-bonus-summary" type="button" aria-expanded={periodBonusListOpen} aria-controls={PERIOD_BONUS_LIST_ID} onclick={() => (periodBonusListOpen = !periodBonusListOpen)}>
                    <span>{t(usesTariffBonusSummaries ? "wa_referral_bonus_depends_on_tariff" : "wa_referral_bonus_paid_intro")}</span>
                    <ChevronDown class="referral-bonus-chev" size={16} />
                  </button>
                  {#if periodBonusListOpen}
                    <div id={PERIOD_BONUS_LIST_ID} class="referral-bonus-detail" transition:slide={PERIOD_BONUS_LIST_TRANSITION}>
                      <div class="referral-bonus-detail-inner">
                        {#if usesTariffBonusSummaries}{@render tariffBonusRows()}{:else}{@render periodBonusRows(true)}{/if}
                      </div>
                    </div>
                  {/if}
                </div>
              {:else if usesTariffBonusSummaries}
                <p class="referral-bonus-intro">{t("wa_referral_bonus_depends_on_tariff")}</p>
                {@render tariffBonusRows()}
              {:else if periodBonusDetails.length}
                {@render periodBonusRows()}
              {/if}
            </Card>
          {:else}
            <StatusMessage>{t("wa_referral_bonus_not_configured")}</StatusMessage>
          {/if}
        </div>
      </section>{/if}
  </UserExtensionPoint>
  <section class="zumvpn-referral-extras">
    <UserExtensionPoint target="user.invite.gifts"><GiftEntry {t} full /></UserExtensionPoint>
    <UserExtensionPoint target="user.invite.codes">
      <PromoActivationCard
        {promoCode}
        {promoFieldError}
        {promoBusy}
        {promoIsError}
        {promoStatus}
        {applyPromo}
        {setPromoCode}
        {clearPromoFieldError}
        {t}
      />
    </UserExtensionPoint>
  </section>
</main>

<LinkQrDialog
  open={qrLink !== null}
  link={qrLink?.url ?? ""}
  title={t("wa_referral_qr_title")}
  description={t("wa_referral_qr_description")}
  caption={qrLink ? t(qrLink.labelKey) : ""}
  alt={t("wa_referral_qr_alt")}
  closeLabel={t("wa_close")}
  onclose={() => (qrLink = null)}
  {t}
/>
