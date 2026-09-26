from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import Page
from app.schemas.record import BulkDeleteRequest, RecordCreate, RecordOut, RecordUpdate
from app.services import record_service, zone_service

router = APIRouter(prefix="/api/hosted-zones/{zone_id}/records", tags=["records"])


@router.get("", response_model=Page[RecordOut])
def list_records(
    zone_id: str,
    search: str = "",
    type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = record_service.list_records(db, user, zone_id, search, type, page, page_size)
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=RecordOut, status_code=201)
def create_record(zone_id: str, body: RecordCreate,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return record_service.create_record(db, user, zone_id, body)


@router.get("/{record_id}", response_model=RecordOut)
def get_record(zone_id: str, record_id: int,
               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    zone = zone_service.get_zone(db, user, zone_id)
    return record_service.to_out(record_service.get_record(db, zone, record_id), zone)


@router.put("/{record_id}", response_model=RecordOut)
def update_record(zone_id: str, record_id: int, body: RecordUpdate,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return record_service.update_record(db, user, zone_id, record_id, body)


@router.delete("/{record_id}", status_code=204)
def delete_record(zone_id: str, record_id: int,
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record_service.delete_records(db, user, zone_id, [record_id])


@router.post("/bulk-delete")
def bulk_delete(zone_id: str, body: BulkDeleteRequest,
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    deleted = record_service.delete_records(db, user, zone_id, body.ids)
    return {"deleted": deleted}
