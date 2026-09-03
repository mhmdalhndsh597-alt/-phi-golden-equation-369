export type GiftStoreState = "loading" | "error" | "empty" | "ready";

export function getGiftStoreState(input: { loading: boolean; error: boolean; giftCount: number }): GiftStoreState {
  if (input.loading) return "loading";
  if (input.error) return "error";
  if (input.giftCount === 0) return "empty";
  return "ready";
}
