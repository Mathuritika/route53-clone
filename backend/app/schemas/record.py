from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

EditableType = Literal["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]


class RecordCreate(BaseModel):
    # "name" is the part before the zone, like Route53's "Record name" box ("" = zone apex)
    name: str = Field(default="", max_length=255)
    type: EditableType
    ttl: int = Field(default=300, ge=0, le=2147483647)
    values: list[str] = Field(min_length=1)
    routing_policy: Literal["Simple"] = "Simple"


class RecordUpdate(BaseModel):
    # Route53 does not let you change name/type of an existing record, only its data
    ttl: int = Field(ge=0, le=2147483647)
    values: list[str] = Field(min_length=1)


class RecordOut(BaseModel):
    id: int
    zone_id: str
    name: str
    type: str
    ttl: int
    values: list[str]
    routing_policy: str
    is_default: bool   # SOA / apex NS created with the zone
    created_at: datetime
    updated_at: datetime


class BulkDeleteRequest(BaseModel):
    ids: list[int] = Field(min_length=1)
