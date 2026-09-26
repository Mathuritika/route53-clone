from datetime import datetime

from pydantic import BaseModel


class TypeCount(BaseModel):
    type: str
    count: int


class RecentZone(BaseModel):
    id: str
    name: str
    zone_type: str
    created_at: datetime


class DashboardOut(BaseModel):
    total_zones: int
    public_zones: int
    private_zones: int
    total_records: int
    records_by_type: list[TypeCount]
    recent_zones: list[RecentZone]
