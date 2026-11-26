from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    users,
    games,
    countries,
    territories,
    orders,
    transactions,
    turns,
    history,
    events,
    notifications,
    diplomacy,
    conflicts,
    uploads,
    projects,
    messages,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(games.router, prefix="/games", tags=["games"])
api_router.include_router(countries.router, prefix="/countries", tags=["countries"])
api_router.include_router(territories.router, prefix="/territories", tags=["territories"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(turns.router, prefix="/turns", tags=["turns"])
api_router.include_router(history.router, prefix="/history", tags=["history"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(diplomacy.router, prefix="/diplomacy", tags=["diplomacy"])
api_router.include_router(conflicts.router, prefix="/conflicts", tags=["conflicts"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
