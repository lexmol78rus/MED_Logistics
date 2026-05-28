import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WriteoffRecommendation } from '../types/api';
import type { WriteoffCartItem } from '../types/writeoff-cart';

export const WRITEOFF_DRAFT_STORAGE_KEY = 'med-warehouse-writeoff-draft';

export type WriteoffFormDraft = {
  search: string;
  selectedProduct: WriteoffRecommendation | null;
  quantities: Record<string, number>;
  useFefoRecommendations: boolean;
  destinationId: string;
  destinationLabel: string;
  destinationComment: string;
  editingCartId: string | null;
};

export const defaultWriteoffFormDraft = (): WriteoffFormDraft => ({
  search: '',
  selectedProduct: null,
  quantities: {},
  useFefoRecommendations: true,
  destinationId: '',
  destinationLabel: '',
  destinationComment: '',
  editingCartId: null,
});

type WriteoffDraftState = {
  /** Привязка черновика к пользователю (очистка при смене аккаунта). */
  ownerUserId: string | null;
  cart: WriteoffCartItem[];
  form: WriteoffFormDraft;
  setOwnerUserId: (userId: string | null) => void;
  setForm: (patch: Partial<WriteoffFormDraft>) => void;
  setCart: (
    next: WriteoffCartItem[] | ((prev: WriteoffCartItem[]) => WriteoffCartItem[]),
  ) => void;
  upsertCartItem: (item: WriteoffCartItem, replaceId?: string | null) => void;
  removeCartItem: (id: string) => void;
  clearCart: () => void;
  clearFormProduct: () => void;
  /** Корзина + черновик формы — после успешного списания. */
  clearAllDraft: () => void;
};

export const useWriteoffDraftStore = create<WriteoffDraftState>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      cart: [],
      form: defaultWriteoffFormDraft(),

      setOwnerUserId: (userId) => set({ ownerUserId: userId }),

      setForm: (patch) =>
        set((state) => ({
          form: { ...state.form, ...patch },
        })),

      setCart: (next) =>
        set((state) => ({
          cart: typeof next === 'function' ? next(state.cart) : next,
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

      clearFormProduct: () =>
        set((state) => ({
          form: {
            ...state.form,
            selectedProduct: null,
            quantities: {},
            editingCartId: null,
          },
        })),

      clearAllDraft: () =>
        set({
          cart: [],
          form: defaultWriteoffFormDraft(),
        }),
    }),
    {
      name: WRITEOFF_DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        cart: state.cart,
        form: state.form,
      }),
      version: 2,
    },
  ),
);

/** Сбросить черновик, если вошёл другой пользователь. */
export function syncWriteoffDraftOwner(userId: string | null) {
  const state = useWriteoffDraftStore.getState();
  if (!userId) return;
  if (state.ownerUserId && state.ownerUserId !== userId) {
    state.clearAllDraft();
  }
  if (state.ownerUserId !== userId) {
    state.setOwnerUserId(userId);
  }
}
