import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingState {
  step: number;
  orgName: string;
  industry: string;
  businessDescription: string;
  sellingMethod: string;
  priceTier: string;
  customerGender: string;
  phone: string;
  whatsapp: string;
  isWhatsappSame: boolean;

  setField: <K extends keyof Omit<OnboardingState, "setField" | "reset">>(
    field: K,
    value: OnboardingState[K]
  ) => void;
  reset: () => void;
}

const initialState = {
  step: 1,
  orgName: "",
  industry: "",
  businessDescription: "",
  sellingMethod: "online",
  priceTier: "mid",
  customerGender: "female",
  phone: "",
  whatsapp: "",
  isWhatsappSame: true,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setField: (field, value) =>
        set((state) => ({ ...state, [field]: value })),
      reset: () => set(initialState),
    }),
    {
      name: "tenzu-onboarding-store",
    }
  )
);
