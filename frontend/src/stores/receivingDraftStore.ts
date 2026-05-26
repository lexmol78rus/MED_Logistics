import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ReceivingCartItem } from '../types/receiving-cart';

export const RECEIVING_DRAFT_STORAGE_KEY = 'med-warehouse-receiving-draft';

export type ReceivingScannedProduct = {
  id: string;
  name: string;
  ref: string;
  manufacturer: string | null;
  barcode: string;
};

export type ReceivingFormDraft = {
  scannedProduct: ReceivingScannedProduct | null;
  lot: string;
  expiry: string;
  qty: string;
  location: string;
  linkedExpectedId: string | null;
  editingCartId: string | null;
};

export const defaultReceivingFormDraft = (): ReceivingFormDraft => ({
  scannedProduct: null,
  lot: '',
  expiry: '',
  qty: '',
  location: '',
  linkedExpectedId: null,
  editingCartId: null,
});

type ReceivingDraftState = {
  ownerUserId: string | null;
  cart: ReceivingCartItem[];
  form: ReceivingFormDraft;
  setOwnerUserId: (userId: string | null) => void;
  setForm: (patch: Partial<ReceivingFormDraft>) => void;
  upsertCartItem: (item: ReceivingCartItem, replaceId?: string | null) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
  clearScannedProduct: () => void;
  clearAllDraft: () => void;
};

export const useReceivingDraftStore = create<ReceivingDraftState>()(
  persist(
    (set) => ({
      ownerUserId: null,
      cart: [],
      form: defaultReceivingFormDraft(),

      setOwnerUserId: (userId) => set({ ownerUserId: userId }),

      setForm: (patch) =>
        set((state) => ({
          form: { ...state.form, ...patch },
        })),

      upsertCartItem: (item, replaceId) => {
        const rid = replaceId ?? null;
        set((state) => {
          const without = rid
            ? state.cart.filter((entry) => entry.id !== rid)
            : state.cart;
          return { cart: [...without, item] };
        });
      },

      removeCartItem: (id) =>
        set((state) => {
          const nextCart = state.cart.filter((entry) => entry.id !== id);
          const clearEdit = state.form.editingCartId === id;
          return {
            cart: nextCart,
            form: clearEdit
              ? { ...state.form, editingCartId: null }
              : state.form,
          };
        }),

      clearCart: () =>
        set((state) => ({
          cart: [],
          form: { ...state.form, editingCartId: null },
        })),

      clearScannedProduct: () =>
        set((state) => ({
          form: {
            ...state.form,
            scannedProduct: null,
            lot: '',
            expiry: '',
            qty: '',
            location: '',
            linkedExpectedId: null,
            editingCartId: null,
          },
        })),

      clearAllDraft: () =>
        set({
          cart: [],
          form: defaultReceivingFormDraft(),
        }),
    }),
    {
      name: RECEIVING_DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        cart: state.cart,
        form: state.form,
      }),
      version: 1,
    },
  ),
);

export function syncReceivingDraftOwner(userId: string | null) {
  const state = useReceivingDraftStore.getState();
  if (!userId) return;
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.clearAllDraft();
  }
  if (state.ownerUserId !== userId) {
    state.setOwnerUserId(userId);
  }
}
