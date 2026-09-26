from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    account_id: str

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    token: str
    user: UserOut
