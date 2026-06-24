export interface TelegramTextDelivery {
  type: "text";
  text: string;
  replaceMessageId?: number;
}

export interface TelegramPhotoDelivery {
  type: "photo";
  path: string;
  caption?: string;
}

export type TelegramDeliveryItem = TelegramTextDelivery | TelegramPhotoDelivery;

export interface TelegramProcessResult {
  ok: boolean;
  chatId?: string;
  error?: string;
  deliveries: TelegramDeliveryItem[];
}

export function textDelivery(
  text: string,
  replaceMessageId?: number
): TelegramTextDelivery {
  return { type: "text", text, replaceMessageId };
}

export function photoDelivery(path: string, caption?: string): TelegramPhotoDelivery {
  return { type: "photo", path, caption };
}
