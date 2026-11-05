"""Thin Telegram bot: /start with the Mini App button, notification opt-out. The app lives in the Mini App."""

from __future__ import annotations

from aiogram import Bot, Dispatcher, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, MenuButtonWebApp, Message, WebAppInfo

from .config import Settings
from .db import Database
from .services.users import get_or_create
from .telegram_auth import TgUser
from .tenant import Tenant

router = Router()


def app_keyboard(settings: Settings, tenant: Tenant) -> InlineKeyboardMarkup | None:
    if not settings.webapp_url:
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text=tenant.bot.button, web_app=WebAppInfo(url=settings.webapp_url))]])


def _tg(message: Message) -> TgUser:
    fu = message.from_user
    return TgUser(id=fu.id, first_name=fu.first_name or "", username=fu.username, language=fu.language_code,
                  is_premium=bool(fu.is_premium))


@router.message(CommandStart())
async def start(message: Message, db: Database, settings: Settings, tenant: Tenant) -> None:
    if message.from_user is None or message.from_user.is_bot:
        return
    async with db.sessions() as s:
        u = await get_or_create(s, _tg(message))
        u.bot_started = True
        await s.commit()
    await message.answer(f"<b>{tenant.app_name}</b>\n\n{tenant.bot.start_text}",
                         reply_markup=app_keyboard(settings, tenant))


@router.message(Command("stop"))
async def stop(message: Message, db: Database) -> None:
    if message.from_user is None:
        return
    async with db.sessions() as s:
        u = await get_or_create(s, _tg(message))
        u.notify_daily = u.notify_predictions = False
        await s.commit()
    await message.answer("Уведомления выключены. Включить снова: /notify или в профиле приложения.")


@router.message(Command("notify"))
async def notify(message: Message, db: Database) -> None:
    if message.from_user is None:
        return
    async with db.sessions() as s:
        u = await get_or_create(s, _tg(message))
        u.notify_daily = u.notify_predictions = u.bot_started = True
        await s.commit()
    await message.answer("Уведомления включены: новый персонаж дня и напоминания о прогнозах. Выключить: /stop")


def create_bot(settings: Settings) -> Bot:
    return Bot(settings.bot_token, default=DefaultBotProperties(parse_mode="HTML"))


def create_dispatcher(settings: Settings, db: Database, tenant: Tenant) -> Dispatcher:
    dp = Dispatcher()
    dp["db"], dp["settings"], dp["tenant"] = db, settings, tenant
    dp.include_router(router)
    return dp


async def setup_menu(bot: Bot, settings: Settings, tenant: Tenant) -> None:
    if settings.webapp_url:
        await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(
            text=tenant.bot.button, web_app=WebAppInfo(url=settings.webapp_url)))
