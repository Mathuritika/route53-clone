"""Domain errors raised by services. main.py maps them to HTTP status codes,
so services never import anything HTTP-related."""


class AppError(Exception):
    status_code = 400
    code = "InvalidInput"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class NotFoundError(AppError):
    status_code = 404
    code = "NoSuchResource"


class ConflictError(AppError):
    status_code = 409
    code = "Conflict"


class AuthError(AppError):
    status_code = 401
    code = "Unauthorized"
