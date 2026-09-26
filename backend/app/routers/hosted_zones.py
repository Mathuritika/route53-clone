from typing import Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import Page
from app.schemas.hosted_zone import (HostedZoneCreate, HostedZoneOut, HostedZoneUpdate,
                                     ImportRequest, ImportResult)
from app.services import bind_service, zone_service

router = APIRouter(prefix="/api/hosted-zones", tags=["hosted zones"])


@router.get("", response_model=Page[HostedZoneOut])
def list_zones(
    search: str = "",
    type: Literal["public", "private"] | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = zone_service.list_zones(db, user, search, type, page, page_size)
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=HostedZoneOut, status_code=201)
def create_zone(body: HostedZoneCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    zone = zone_service.create_zone(db, user, body)
    return zone_service.to_out(zone, zone_service.count_records(db, zone.id))


@router.get("/{zone_id}", response_model=HostedZoneOut)
def get_zone(zone_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    zone = zone_service.get_zone(db, user, zone_id)
    return zone_service.to_out(zone, zone_service.count_records(db, zone.id))


@router.patch("/{zone_id}", response_model=HostedZoneOut)
def update_zone(zone_id: str, body: HostedZoneUpdate,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    zone = zone_service.update_zone(db, user, zone_id, body.comment)
    return zone_service.to_out(zone, zone_service.count_records(db, zone.id))


@router.delete("/{zone_id}", status_code=204)
def delete_zone(zone_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    zone_service.delete_zone(db, user, zone_id)


@router.get("/{zone_id}/export")
def export_zone(zone_id: str, format: Literal["json", "bind"] = "json",
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    zone = zone_service.get_zone(db, user, zone_id)
    if format == "bind":
        return PlainTextResponse(bind_service.export_bind(zone))
    return bind_service.export_json(zone)


@router.post("/{zone_id}/import", response_model=ImportResult)
def import_zone(zone_id: str, body: ImportRequest,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    created, skipped = bind_service.import_zone_file(db, user, zone_id, body.zone_file)
    return ImportResult(created=created, skipped=skipped)
