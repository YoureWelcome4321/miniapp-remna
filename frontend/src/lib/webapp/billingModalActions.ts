import type { BillingPlan, PaymentMethod, TariffCatalogEntry } from "./tariffs";
import { billingDurationDays } from "./subscriptionPeriods.js";
import type { SubscriptionView } from "./types";

type BillingModalStore = {
  closeDeviceTopupModal: () => void;
  openDeviceTopupModal: (defaultMethod?: string) => void;
  openPaymentModal: (
    tariffMode: boolean,
    singleTariffMode: boolean,
    tariffCatalog: TariffCatalogEntry[],
    subscription: SubscriptionView,
    plans: BillingPlan[],
    defaultMethod?: string,
    options?: Record<string, unknown>
  ) => void;
  openTariffChangeModal: (defaultMethod?: string) => void;
  openTopupModal: (kind?: string, defaultMethod?: string) => void;
};

type DevicesActionsStore = {
  disconnectDevice: (devicesEnabled: boolean) => unknown;
  loadDevices: (devicesEnabled: boolean, force?: boolean) => unknown;
};

type BillingModalActionDeps = {
  billingStore: BillingModalStore;
  devicesEnabled: () => boolean;
  devicesStore: DevicesActionsStore;
  methods: () => PaymentMethod[];
  plans: () => BillingPlan[];
  suggestedPromoCode: () => string;
  singleTariffMode: () => boolean;
  subscription: () => SubscriptionView;
  tariffCatalog: () => TariffCatalogEntry[];
  tariffMode: () => boolean;
};

export function defaultPaymentMethod(methods: PaymentMethod[] | null | undefined): string {
  return String((methods || []).find((method) => !method.disabled)?.id || "");
}

export function createBillingModalActions({
  billingStore,
  devicesEnabled,
  devicesStore,
  methods,
  plans,
  suggestedPromoCode,
  singleTariffMode,
  subscription,
  tariffCatalog,
  tariffMode,
}: BillingModalActionDeps) {
  function currentDefaultPaymentMethod() {
    return defaultPaymentMethod(methods());
  }

  function openPaymentModal() {
    billingStore.openPaymentModal(
      tariffMode(),
      singleTariffMode(),
      tariffCatalog(),
      subscription(),
      plans(),
      currentDefaultPaymentMethod(),
      { suggestedPromoCode: suggestedPromoCode() }
    );
  }

  function openCustomizedPayment(options: {
    durationDays: number;
    deviceTotal: number;
    trafficGb: number | null;
  }) {
    const planList = plans();
    const catalog = tariffCatalog();
    const requestedDays = Math.max(1, Math.trunc(options.durationDays));
    const requestedDevices = Math.max(1, Math.trunc(options.deviceTotal));
    const candidates = planList.filter(
      (plan) => String(plan.sale_mode || "subscription").toLowerCase() === "subscription"
    );
    const exactDayPlans = candidates.filter((plan) => plan.duration_days != null);
    const durationCandidates = exactDayPlans.length ? exactDayPlans : candidates;
    const plan = durationCandidates.slice().sort((a, b) => {
      const durationA = billingDurationDays(a) ?? requestedDays;
      const durationB = billingDurationDays(b) ?? requestedDays;
      return Math.abs(durationA - requestedDays) - Math.abs(durationB - requestedDays);
    })[0];
    if (!plan) {
      openPaymentModal();
      return;
    }
    const preferredTariffKey = String(plan.tariff_key || "");
    const addons = plan.checkout_addons || {};
    const deviceDefinition = addons.devices;
    const trafficDefinition = addons.traffic;
    const premiumDefinition = addons.premium_traffic;
    const baseDevices = Number(
      deviceDefinition?.base_units ?? plan.effective_hwid_device_limit ?? 1
    );
    const extraDevices = Math.max(0, requestedDevices - baseDevices);
    const supportedDevices =
      extraDevices === 0 ||
      deviceDefinition?.options?.some((option) => Number(option.extra_units) === extraDevices);
    const supportedTraffic =
      options.trafficGb === null ||
      options.trafficGb === Number(trafficDefinition?.base_units || 0) ||
      trafficDefinition?.options?.some(
        (option) => Number(option.total_units) === options.trafficGb
      );
    billingStore.openPaymentModal(
      tariffMode(),
      singleTariffMode(),
      catalog,
      subscription(),
      planList,
      currentDefaultPaymentMethod(),
      {
        preferredPlanId: String(plan.id || ""),
        preferredTariffKey,
        preferredMonths: plan.months,
        preferCheckout: true,
        selectDefaultTariff: true,
        suggestedPromoCode: suggestedPromoCode(),
        checkoutAddonPreset: {
          deviceTotal: extraDevices === 0 ? null : supportedDevices ? extraDevices : null,
          regularLimitGb:
            options.trafficGb === null ||
            options.trafficGb === Number(trafficDefinition?.base_units || 0)
              ? null
              : supportedTraffic
                ? options.trafficGb
                : null,
          premiumLimitGb: premiumDefinition?.initial_units ?? null,
        },
      }
    );
  }

  function openTopupModal(kind: string) {
    billingStore.openTopupModal(kind, currentDefaultPaymentMethod());
  }

  function openRegularTopupModal() {
    openTopupModal("regular");
  }

  function openPremiumTopupModal() {
    openTopupModal("premium");
  }

  function openTariffChangeModal() {
    billingStore.openTariffChangeModal(currentDefaultPaymentMethod());
  }

  function openDeviceTopupModal() {
    billingStore.openDeviceTopupModal(currentDefaultPaymentMethod());
  }

  function closeDeviceTopupModal() {
    billingStore.closeDeviceTopupModal();
  }

  function loadDevices(force = false) {
    return devicesStore.loadDevices(devicesEnabled(), force);
  }

  function disconnectDevice() {
    return devicesStore.disconnectDevice(devicesEnabled());
  }

  return {
    defaultPaymentMethod: currentDefaultPaymentMethod,
    openPaymentModal,
    openCustomizedPayment,
    openTopupModal,
    openRegularTopupModal,
    openPremiumTopupModal,
    openTariffChangeModal,
    openDeviceTopupModal,
    closeDeviceTopupModal,
    loadDevices,
    disconnectDevice,
  };
}
