import asyncio
import json
import logging

from fastapi import WebSocket
from redis.asyncio import Redis

from config import get_settings

logger = logging.getLogger(__name__)


class AlertWebSocketManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()
        self._redis: Redis | None = None
        self._redis_task: asyncio.Task | None = None
        self._running = False

    async def start(self) -> None:
        if self._running:
            return
        settings = get_settings()
        self._redis = Redis.from_url(settings.redis_url, decode_responses=True)
        self._running = True
        self._redis_task = asyncio.create_task(self._redis_subscriber_loop())

    async def stop(self) -> None:
        self._running = False
        if self._redis_task:
            self._redis_task.cancel()
        if self._redis:
            await self._redis.close()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, payload: dict) -> None:
        settings = get_settings()

        if self._redis:
            await self._redis.publish(settings.redis_channel_alerts, json.dumps(payload))
            return

        await self._broadcast_local(payload)

    async def _redis_subscriber_loop(self) -> None:
        if not self._redis:
            return

        settings = get_settings()
        pubsub = self._redis.pubsub()
        await pubsub.subscribe(settings.redis_channel_alerts)

        try:
            while self._running:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if not message:
                    await asyncio.sleep(0.1)
                    continue

                data = message.get("data")
                if not data:
                    continue

                try:
                    payload = json.loads(data)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON payload in redis alert pubsub")
                    continue

                await self._broadcast_local(payload)
        finally:
            await pubsub.unsubscribe(settings.redis_channel_alerts)
            await pubsub.close()

    async def _broadcast_local(self, payload: dict) -> None:
        stale: list[WebSocket] = []
        for ws in self._connections:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)

        for ws in stale:
            self._connections.discard(ws)


alert_ws_manager = AlertWebSocketManager()
