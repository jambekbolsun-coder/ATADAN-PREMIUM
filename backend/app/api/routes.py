from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.entities import Tractor, Lead, ServiceRequest
from app.schemas.common import TractorOut, LeadCreate, LeadOut, ServiceRequestCreate, HealthOut

router = APIRouter()

@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok", app="ATADAN API", timestamp=datetime.now(timezone.utc))

@router.get("/tractors", response_model=list[TractorOut])
def list_tractors(
    min_power: int | None = Query(default=None, ge=0),
    max_power: int | None = Query(default=None, ge=0),
    series: str | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Tractor).order_by(Tractor.power_hp)
    if min_power is not None:
        stmt = stmt.where(Tractor.power_hp >= min_power)
    if max_power is not None:
        stmt = stmt.where(Tractor.power_hp <= max_power)
    if series:
        stmt = stmt.where(Tractor.series == series.upper())
    return list(db.scalars(stmt).all())

@router.get("/tractors/{slug}", response_model=TractorOut)
def get_tractor(slug: str, db: Session = Depends(get_db)):
    tractor = db.scalar(select(Tractor).where(Tractor.slug == slug))
    if not tractor:
        raise HTTPException(status_code=404, detail="Tractor not found")
    return tractor

@router.post("/leads", response_model=LeadOut, status_code=201)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadOut(id=lead.id)

@router.post("/service-requests", response_model=LeadOut, status_code=201)
def create_service_request(payload: ServiceRequestCreate, db: Session = Depends(get_db)):
    request = ServiceRequest(**payload.model_dump())
    db.add(request)
    db.commit()
    db.refresh(request)
    return LeadOut(id=request.id)
