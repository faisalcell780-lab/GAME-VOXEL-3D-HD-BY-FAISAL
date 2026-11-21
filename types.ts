export type Panel =
  | "pause"
  | "inventory"
  | "craft"
  | "palette"
  | "settings"
  | "map"
  | "help"
  | "photo"
  | null;

export type ToastTone = "info" | "success" | "warn";

export interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
}
