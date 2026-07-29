from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class TractorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    model: str
    series: str
    power_hp: int
    mass_kg: int
    wheelbase_mm: int | None
    gears: str
    creeper: bool | None
    price_kgs: float | None
    available: bool
    notes: str | None

class LeadCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=50)
    message: str | None = Field(default=None, max_length=3000)
    source: str = Field(default="website", max_length=120)
    language: str | None = Field(default=None, max_length=12)

class LeadOut(BaseModel):
    id: int
    status: str = "created"

class ServiceRequestCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=50)
    tractor_model: str | None = Field(default=None, max_length=100)
    serial_number: str | None = Field(default=None, max_length=120)
    location: str | None = Field(default=None, max_length=180)
    issue: str = Field(min_length=5, max_length=5000)

class HealthOut(BaseModel):
    status: str
    app: str
    timestamp: datetime
