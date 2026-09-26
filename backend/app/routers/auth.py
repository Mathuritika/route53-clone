from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, get_token
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserOut
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    token, user = auth_service.login(db, body.username, body.password)
    return LoginResponse(token=token, user=UserOut.model_validate(user))


@router.post("/logout", status_code=204)
def logout(token: str = Depends(get_token), db: Session = Depends(get_db)):
    auth_service.logout(db, token)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
