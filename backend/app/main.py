"""App entry point: create FastAPI app, CORS, error handling, routers, tables + seed."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import app.models  # noqa: F401  registers all tables on Base.metadata
from app.core.config import CORS_ORIGINS
from app.core.database import Base, SessionLocal, engine
from app.core.errors import AppError
from app.routers import auth, hosted_zones, records
from app.seed.seed import seed_if_empty


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_if_empty(db)  # hosted SQLite disks can reset, so seed on every cold start if empty
    yield


app = FastAPI(title="Route 53 Clone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.exception_handler(AppError)
def handle_app_error(_: Request, exc: AppError):
    # One consistent error shape: {"code": "...", "message": "..."}
    return JSONResponse(status_code=exc.status_code, content={"code": exc.code, "message": exc.message})


@app.exception_handler(RequestValidationError)
def handle_validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    field = ".".join(str(p) for p in first["loc"][1:])
    return JSONResponse(status_code=422, content={"code": "InvalidInput", "message": f"{field}: {first['msg']}"})


app.include_router(auth.router)
app.include_router(hosted_zones.router)
app.include_router(records.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
