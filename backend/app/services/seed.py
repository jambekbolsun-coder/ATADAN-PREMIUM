from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.entities import Tractor

TRACTORS = [
    dict(slug="changfa-cff904", model="CHANGFA CFF904", series="F", power_hp=90, mass_kg=4400, wheelbase_mm=2334, gears="24F / 24R", creeper=True, price_kgs=None),
    dict(slug="changfa-cff1204", model="CHANGFA CFF1204", series="F", power_hp=120, mass_kg=4400, wheelbase_mm=2334, gears="24F / 24R", creeper=True, price_kgs=None),
    dict(slug="changfa-cfg1404", model="CHANGFA CFG1404", series="G", power_hp=140, mass_kg=4800, wheelbase_mm=2334, gears="24F / 24R", creeper=True, price_kgs=None),
    dict(slug="changfa-cfg1604", model="CHANGFA CFG1604", series="G", power_hp=160, mass_kg=5800, wheelbase_mm=2853, gears="32F / 32R", creeper=True, price_kgs=None),
    dict(slug="changfa-cfj2004", model="CHANGFA CFJ2004", series="J", power_hp=200, mass_kg=6810, wheelbase_mm=2825, gears="32F / 32R", creeper=True, price_kgs=None),
    dict(slug="changfa-cfj220", model="CHANGFA CFJ220", series="J", power_hp=220, mass_kg=7800, wheelbase_mm=None, gears="32F / 32R or 16F / 16R", creeper=None, price_kgs=6850000, notes="Exact configuration must be confirmed by ATADAN."),
    dict(slug="changfa-cfk2404", model="CHANGFA CFK2404", series="K", power_hp=240, mass_kg=9375, wheelbase_mm=2866, gears="32F / 32R", creeper=True, price_kgs=None),
]

def seed_tractors(db: Session) -> None:
    existing = db.scalar(select(Tractor.id).limit(1))
    if existing:
        return
    db.add_all([Tractor(**item) for item in TRACTORS])
    db.commit()
