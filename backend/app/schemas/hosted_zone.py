from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HostedZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    zone_type: Literal["public", "private"] = "public"
    comment: str = Field(default="", max_length=256)
    vpc_region: str | None = None
    vpc_id: str | None = None


class HostedZoneUpdate(BaseModel):
    # Same as Route53: after creation only the description (comment) can change
    comment: str = Field(default="", max_length=256)


class HostedZoneOut(BaseModel):
    id: str
    name: str
    zone_type: str
    comment: str
    vpc_region: str | None
    vpc_id: str | None
    record_count: int
    name_servers: list[str]
    created_at: datetime


class ImportRequest(BaseModel):
    zone_file: str


class ImportResult(BaseModel):
    created: int
    skipped: list[str]
