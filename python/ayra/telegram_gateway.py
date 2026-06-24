"""AYRA Telegram gateway — python-telegram-bot polling + worker dispatch.

Receives messages via Python (Hermes-style), delegates agent logic to the
Node worker internal API, sends replies back through PTB.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("ayra.telegram")

TELEGRAM_THINKING_MESSAGE = "🤔 *Agent is thinking…*"

try:
    from telegram import Update
    from telegram.constants import ParseMode
    from telegram.ext import Application, ContextTypes, MessageHandler, filters

    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False
    Update = Any  # type: ignore[misc,assignment]
    Application = Any  # type: ignore[misc,assignment]
    ContextTypes = Any  # type: ignore[misc,assignment]
    filters = None  # type: ignore[assignment]
    ParseMode = None  # type: ignore[assignment]


def worker_internal_url() -> str:
    return os.getenv("AYRA_WORKER_INTERNAL_URL", "http://127.0.0.1:8790").rstrip("/")


def internal_headers() -> Dict[str, str]:
    key = os.getenv("AYRA_INTERNAL_API_SECRET", "").strip()
    headers = {"Content-Type": "application/json"}
    if key:
        headers["X-AYRA-Internal-Key"] = key
    return headers


def _cmd_name(text: str) -> str:
    body = text.strip().lstrip("/")
    return body.split("@", 1)[0].split()[0].lower() if body else ""


def _cmd_is(text: str, *names: str) -> bool:
    return _cmd_name(text) in names


def _cmd_starts(text: str, name: str) -> bool:
    lower = text.strip().lower()
    prefix = f"/{name.lower()}"
    return lower == prefix or lower.startswith(f"{prefix} ")


def should_show_thinking(text: str) -> bool:
    """Match src/lib/telegram/thinking.ts — show before slow skills, image gen, LLM runs."""
    trimmed = text.strip()
    if not trimmed:
        return False

    if _cmd_is(trimmed, "help", "start", "agents", "status"):
        return False
    if trimmed.lower() == "/models" or trimmed.lower().startswith("/models "):
        return False
    if _cmd_starts(trimmed, "use"):
        return False
    if _cmd_starts(trimmed, "model") or _cmd_starts(trimmed, "custommodel"):
        return False
    if _cmd_starts(trimmed, "imagemodel") or _cmd_starts(trimmed, "customimagemodel"):
        return False
    if _cmd_starts(trimmed, "post"):
        return False

    if _cmd_starts(trimmed, "image"):
        parts = trimmed.split(maxsplit=1)
        return len(parts) > 1 and bool(parts[1].strip())

    return True


@dataclass(frozen=True)
class BotUser:
    user_id: str
    chat_id: Optional[str]
    updated_at: str = ""
    active_agent_count: int = 0


@dataclass
class BotRuntime:
    bot_token: str
    users: List[BotUser]


def update_to_payload(update: Update) -> Dict[str, Any]:
    msg = update.effective_message
    if not msg or not msg.text:
        return {}
    from_user = msg.from_user
    payload: Dict[str, Any] = {
        "update_id": update.update_id,
        "message": {
            "message_id": msg.message_id,
            "chat": {
                "id": msg.chat_id,
                "type": getattr(msg.chat.type, "value", str(msg.chat.type)),
            },
            "text": msg.text,
        },
    }
    if from_user:
        payload["message"]["from"] = {
            "id": from_user.id,
            "username": from_user.username,
            "first_name": from_user.first_name,
        }
    return payload


async def fetch_bot_configs(client: httpx.AsyncClient) -> List[BotRuntime]:
    response = await client.get(
        f"{worker_internal_url()}/internal/telegram/bots",
        headers=internal_headers(),
        timeout=15.0,
    )
    response.raise_for_status()
    data = response.json()
    bots = data.get("bots") or []
    by_token: Dict[str, List[BotUser]] = {}
    for entry in bots:
        token = str(entry.get("botToken") or "").strip()
        user_id = str(entry.get("userId") or "").strip()
        if not token or not user_id:
            continue
        chat_id = entry.get("chatId")
        updated_at = str(entry.get("updatedAt") or "")
        active_agent_count = int(entry.get("activeAgentCount") or 0)
        by_token.setdefault(token, []).append(
            BotUser(
                user_id=user_id,
                chat_id=str(chat_id) if chat_id else None,
                updated_at=updated_at,
                active_agent_count=active_agent_count,
            )
        )
    return [BotRuntime(bot_token=t, users=u) for t, u in by_token.items()]


async def resolve_user_id(
    client: httpx.AsyncClient, bot_token: str, chat_id: str
) -> Dict[str, Any]:
    response = await client.get(
        f"{worker_internal_url()}/internal/telegram/resolve",
        params={"chatId": chat_id, "botToken": bot_token},
        headers=internal_headers(),
        timeout=10.0,
    )
    response.raise_for_status()
    return response.json()


async def fetch_readiness(client: httpx.AsyncClient, user_id: str) -> Dict[str, Any]:
    response = await client.get(
        f"{worker_internal_url()}/internal/telegram/readiness",
        params={"userId": user_id},
        headers=internal_headers(),
        timeout=10.0,
    )
    response.raise_for_status()
    return response.json()


async def claim_update(
    client: httpx.AsyncClient, user_id: str, update_id: int
) -> bool:
    response = await client.post(
        f"{worker_internal_url()}/internal/telegram/claim",
        headers=internal_headers(),
        content=json.dumps({"userId": user_id, "updateId": update_id}),
        timeout=10.0,
    )
    response.raise_for_status()
    data = response.json()
    return bool(data.get("claimed"))


async def dispatch_update(
    client: httpx.AsyncClient,
    user_id: str,
    update_payload: Dict[str, Any],
    thinking_message_id: Optional[int] = None,
) -> Dict[str, Any]:
    body: Dict[str, Any] = {
        "userId": user_id,
        "update": update_payload,
        "skipClaim": True,
    }
    if thinking_message_id is not None:
        body["thinkingMessageId"] = thinking_message_id

    response = await client.post(
        f"{worker_internal_url()}/internal/telegram/dispatch",
        headers=internal_headers(),
        content=json.dumps(body),
        timeout=600.0,
    )
    response.raise_for_status()
    return response.json()


async def apply_deliveries(
    bot,
    chat_id: int,
    plan: Dict[str, Any],
) -> None:
    if plan.get("skipped"):
        return

    deliveries = plan.get("deliveries") or []
    for item in deliveries:
        if not isinstance(item, dict):
            continue
        kind = item.get("type")
        if kind == "text":
            text = str(item.get("text") or "")
            replace_id = item.get("replaceMessageId")
            if not text.strip():
                continue
            if replace_id is not None:
                try:
                    await bot.edit_message_text(
                        chat_id=chat_id,
                        message_id=int(replace_id),
                        text=text[:4096],
                        parse_mode=ParseMode.MARKDOWN if ParseMode else None,
                    )
                    continue
                except Exception:
                    try:
                        await bot.delete_message(chat_id=chat_id, message_id=int(replace_id))
                    except Exception:
                        pass
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text=text[:4096],
                    parse_mode=ParseMode.MARKDOWN if ParseMode else None,
                )
            except Exception:
                await bot.send_message(chat_id=chat_id, text=text[:4096])
            continue

        if kind == "photo":
            path = str(item.get("path") or "")
            caption = item.get("caption")
            if not path or not Path(path).is_file():
                logger.warning("Photo path missing or not found: %s", path)
                continue
            with open(path, "rb") as photo_file:
                await bot.send_photo(
                    chat_id=chat_id,
                    photo=photo_file,
                    caption=str(caption)[:1024] if caption else None,
                )


class TelegramGateway:
    """Manages one PTB Application per distinct bot token."""

    def __init__(self) -> None:
        self._apps: Dict[str, Application] = {}
        self._runtimes_by_token: Dict[str, BotRuntime] = {}
        self._http = httpx.AsyncClient()
        self._lock = asyncio.Lock()
        self._chat_locks: Dict[str, asyncio.Lock] = {}

    async def close(self) -> None:
        for app in list(self._apps.values()):
            try:
                if app.updater and app.updater.running:
                    await app.updater.stop()
                await app.stop()
                await app.shutdown()
            except Exception as exc:
                logger.warning("Shutdown app failed: %s", exc)
        self._apps.clear()
        await self._http.aclose()

    async def sync_bots(self) -> None:
        try:
            configs = await fetch_bot_configs(self._http)
        except Exception as exc:
            logger.warning("Could not fetch bot configs: %s", exc)
            return

        tokens = set(self._runtimes_by_token.keys())
        self._runtimes_by_token = {r.bot_token: r for r in configs}

        for token in list(self._apps.keys()):
            if token not in self._runtimes_by_token:
                app = self._apps.pop(token)
                try:
                    if app.updater and app.updater.running:
                        await app.updater.stop()
                    await app.stop()
                    await app.shutdown()
                except Exception:
                    pass
                logger.info("Stopped Telegram bot %s…", token[:8])

        for runtime in configs:
            if runtime.bot_token in self._apps:
                continue
            await self._start_bot(runtime)

    async def _start_bot(self, runtime: BotRuntime) -> None:
        token = runtime.bot_token
        logger.info("Starting Python Telegram bot (%s…)", token[:8])

        app = Application.builder().token(token).build()

        async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
            await self._handle_message(runtime, update, context)

        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
        app.add_handler(MessageHandler(filters.COMMAND, on_text))

        await app.initialize()
        await app.start()
        await app.updater.start_polling(drop_pending_updates=False)
        self._apps[token] = app

    async def _handle_message(
        self,
        runtime: BotRuntime,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
    ) -> None:
        msg = update.effective_message
        if not msg or not msg.text:
            return

        chat_id = str(msg.chat_id)
        try:
            resolved = await resolve_user_id(self._http, runtime.bot_token, chat_id)
        except Exception as exc:
            logger.error("Resolve user failed for chat %s: %s", chat_id, exc)
            await context.bot.send_message(
                chat_id=msg.chat_id,
                text="❌ AYRA worker unavailable. Run `npm run worker` and try again.",
            )
            return

        if not resolved.get("ok"):
            await context.bot.send_message(
                chat_id=msg.chat_id,
                text=str(
                    resolved.get("message")
                    or "⚠️ Telegram account not linked. Set Chat ID in Dashboard → Settings → Telegram."
                ),
                parse_mode=ParseMode.MARKDOWN if ParseMode else None,
            )
            return

        user_id = str(resolved["userId"])
        chat_lock = self._chat_locks.setdefault(chat_id, asyncio.Lock())
        async with chat_lock:
            await self._handle_message_locked(runtime, update, context, user_id, msg)

    async def _handle_message_locked(
        self,
        runtime: BotRuntime,
        update: Update,
        context: ContextTypes.DEFAULT_TYPE,
        user_id: str,
        msg,
    ) -> None:
        payload = update_to_payload(update)
        if not payload:
            return

        bot = context.bot
        update_id = int(payload.get("update_id") or 0)

        try:
            claimed = await claim_update(self._http, user_id, update_id)
        except Exception as exc:
            logger.error("Claim failed for user %s: %s", user_id, exc)
            await bot.send_message(
                chat_id=msg.chat_id,
                text="❌ AYRA worker unavailable. Run `npm run worker` and try again.",
            )
            return

        if not claimed:
            return

        try:
            readiness = await fetch_readiness(self._http, user_id)
        except Exception as exc:
            logger.error("Readiness check failed for user %s: %s", user_id, exc)
            await bot.send_message(
                chat_id=msg.chat_id,
                text="❌ AYRA worker unavailable. Run `npm run worker` and try again.",
            )
            return

        if not readiness.get("ok"):
            await bot.send_message(
                chat_id=msg.chat_id,
                text=str(readiness.get("message") or "Create an agent in the dashboard first."),
                parse_mode=ParseMode.MARKDOWN if ParseMode else None,
            )
            return

        thinking_id: Optional[int] = None
        if should_show_thinking(msg.text):
            action = "upload_photo" if msg.text.strip().lower().startswith("/image ") else "typing"
            try:
                await bot.send_chat_action(chat_id=msg.chat_id, action=action)
            except Exception:
                pass
            try:
                sent = await bot.send_message(
                    chat_id=msg.chat_id,
                    text=TELEGRAM_THINKING_MESSAGE,
                    parse_mode=ParseMode.MARKDOWN if ParseMode else None,
                )
                thinking_id = sent.message_id
            except Exception:
                thinking_id = None

        try:
            plan = await dispatch_update(self._http, user_id, payload, thinking_id)
        except Exception as exc:
            logger.error("Dispatch failed for user %s: %s", user_id, exc)
            err = f"❌ {str(exc)[:500]}"
            if thinking_id is not None:
                try:
                    await bot.edit_message_text(
                        chat_id=msg.chat_id,
                        message_id=thinking_id,
                        text=err,
                    )
                    return
                except Exception:
                    pass
            await bot.send_message(chat_id=msg.chat_id, text=err)
            return

        await apply_deliveries(bot, msg.chat_id, plan)

    async def run(self, refresh_seconds: float = 30.0) -> None:
        await self.sync_bots()
        while True:
            await asyncio.sleep(refresh_seconds)
            await self.sync_bots()


async def async_main(refresh_seconds: float) -> None:
    if not TELEGRAM_AVAILABLE:
        raise RuntimeError(
            "python-telegram-bot is not installed. Run: pip install -e python/"
        )

    # Wait for worker internal API
    url = worker_internal_url()
    for attempt in range(30):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{url}/health",
                    headers=internal_headers(),
                    timeout=5.0,
                )
                if response.status_code == 200:
                    break
        except Exception:
            pass
        logger.info("Waiting for worker internal API at %s (%d/30)…", url, attempt + 1)
        await asyncio.sleep(2.0)
    else:
        raise RuntimeError(f"Worker internal API not reachable at {url}")

    gateway = TelegramGateway()
    try:
        await gateway.run(refresh_seconds=refresh_seconds)
    finally:
        await gateway.close()


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="AYRA Python Telegram gateway")
    parser.add_argument(
        "--refresh-seconds",
        type=float,
        default=float(os.getenv("AYRA_TELEGRAM_REFRESH_SECONDS", "30")),
    )
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="[%(name)s] %(message)s",
    )

    try:
        asyncio.run(async_main(refresh_seconds=args.refresh_seconds))
    except KeyboardInterrupt:
        logger.info("Stopped")
        return 0
    except Exception as exc:
        logger.error("Fatal: %s", exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
