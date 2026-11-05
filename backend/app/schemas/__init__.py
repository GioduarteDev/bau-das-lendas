from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class Login(BaseModel):
    model_config = ConfigDict(extra='forbid')
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=10, max_length=128)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value):
        return value.lower()


class Register(Login):
    username: str = Field(min_length=2, max_length=80)

    @field_validator('username')
    @classmethod
    def validate_name(cls, value):
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Nome precisa ter ao menos dois caracteres.')
        return value


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    email: str


class EmptyDraw(BaseModel):
    model_config = ConfigDict(extra='forbid')
