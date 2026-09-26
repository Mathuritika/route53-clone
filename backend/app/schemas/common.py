from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    """Standard paginated list response used by every list endpoint."""
    items: list[T]
    total: int
    page: int
    page_size: int
