import { describe, expect, it, vi } from "vitest";

import { createBillingModalActions, defaultPaymentMethod } from "./billingModalActions.js";
type TestOverrides = { [key: string]: Record<string, unknown> | undefined };

function makeActions(overrides: TestOverrides = {}) {
  const state = {
    devicesEnabled: true,
    methods: [{ id: "card" }, { id: "crypto" }],
    plans: [{ id: "basic" }],
    singleTariffMode: false,
    subscription: { active: false } as Record<string, unknown>,
    suggestedPromoCode: "PERSONAL20",
    tariffCatalog: [{ key: "standard" }],
    tariffMode: true,
    ...overrides.state,
  };
  const deps = {
    billingStore: {
      closeDeviceTopupModal: vi.fn(),
      openDeviceTopupModal: vi.fn(),
      openPaymentModal: vi.fn(),
      openTariffChangeModal: vi.fn(),
      openTopupModal: vi.fn(),
    },
    devicesEnabled: () => state.devicesEnabled,
    devicesStore: {
      disconnectDevice: vi.fn(),
      loadDevices: vi.fn(),
    },
    methods: () => state.methods,
    plans: () => state.plans,
    singleTariffMode: () => state.singleTariffMode,
    subscription: () => state.subscription,
    suggestedPromoCode: () => state.suggestedPromoCode,
    tariffCatalog: () => state.tariffCatalog,
    tariffMode: () => state.tariffMode,
    ...overrides.deps,
  };
  return {
    actions: createBillingModalActions(
      deps as unknown as Parameters<typeof createBillingModalActions>[0]
    ),
    deps,
    state,
  };
}

describe("defaultPaymentMethod", () => {
  it("uses the first payment method id", () => {
    expect(defaultPaymentMethod([{ id: "stars" }, { id: "card" }])).toBe("stars");
  });

  it("skips payment methods disabled for the current context", () => {
    expect(defaultPaymentMethod([{ id: "stars", disabled: true }, { id: "card" }])).toBe("card");
  });

  it("falls back to an empty method id", () => {
    expect(defaultPaymentMethod([])).toBe("");
    expect(defaultPaymentMethod(null)).toBe("");
  });
});

describe("createBillingModalActions", () => {
  it("opens the payment modal with current billing view state", () => {
    const { actions, deps, state } = makeActions();
    state.singleTariffMode = true;
    state.subscription = { active: true, tariff_key: "standard" };

    actions.openPaymentModal();

    expect(deps.billingStore.openPaymentModal).toHaveBeenCalledWith(
      true,
      true,
      state.tariffCatalog,
      state.subscription,
      state.plans,
      "card",
      { suggestedPromoCode: "PERSONAL20" }
    );
  });

  it("opens top-up and tariff modals with the current default method", () => {
    const { actions, deps, state } = makeActions();
    state.methods = [{ id: "stars" }];

    actions.openRegularTopupModal();
    actions.openPremiumTopupModal();
    actions.openTariffChangeModal();
    actions.openDeviceTopupModal();
    actions.closeDeviceTopupModal();

    expect(deps.billingStore.openTopupModal).toHaveBeenNthCalledWith(1, "regular", "stars");
    expect(deps.billingStore.openTopupModal).toHaveBeenNthCalledWith(2, "premium", "stars");
    expect(deps.billingStore.openTariffChangeModal).toHaveBeenCalledWith("stars");
    expect(deps.billingStore.openDeviceTopupModal).toHaveBeenCalledWith("stars");
    expect(deps.billingStore.closeDeviceTopupModal).toHaveBeenCalledOnce();
  });

  it("opens checkout for the nearest configured period and supported add-ons", () => {
    const { actions, deps } = makeActions({
      state: {
        plans: [
          {
            id: "pro-30",
            tariff_key: "pro",
            duration_days: 30,
            sale_mode: "subscription",
            checkout_addons: {
              devices: {
                base_units: 1,
                options: [{ extra_units: 0 }, { extra_units: 2 }],
              },
              traffic: {
                base_units: 50,
                options: [{ total_units: 50 }, { total_units: 100 }],
              },
            },
          },
          {
            id: "pro-365",
            tariff_key: "pro",
            duration_days: 365,
            sale_mode: "subscription",
          },
        ],
      },
    });

    actions.openCustomizedPayment({ durationDays: 28, deviceTotal: 3, trafficGb: 100 });

    expect(deps.billingStore.openPaymentModal).toHaveBeenCalledWith(
      true,
      false,
      [{ key: "standard" }],
      { active: false },
      expect.any(Array),
      "card",
      expect.objectContaining({
        preferredPlanId: "pro-30",
        preferredTariffKey: "pro",
        preferCheckout: true,
        checkoutAddonPreset: {
          deviceTotal: 2,
          regularLimitGb: 100,
          premiumLimitGb: null,
        },
      })
    );
  });

  it("passes the current device availability to device actions", () => {
    const { actions, deps, state } = makeActions();

    actions.loadDevices(true);
    state.devicesEnabled = false;
    actions.disconnectDevice();

    expect(deps.devicesStore.loadDevices).toHaveBeenCalledWith(true, true);
    expect(deps.devicesStore.disconnectDevice).toHaveBeenCalledWith(false);
  });
});
