import {
  deliverTelegramTextReply,
  sendTelegramPhoto,
} from "./client";
import type { TelegramProcessResult } from "./delivery-plan";

export async function applyTelegramDeliveries(
  botToken: string,
  chatId: string,
  result: TelegramProcessResult
): Promise<void> {
  if (!result.ok && result.deliveries.length === 0) return;

  for (const item of result.deliveries) {
    if (item.type === "text") {
      await deliverTelegramTextReply(
        botToken,
        chatId,
        item.text,
        item.replaceMessageId
      );
      continue;
    }

    if (item.type === "photo") {
      await sendTelegramPhoto(botToken, chatId, item.path, item.caption);
    }
  }
}
