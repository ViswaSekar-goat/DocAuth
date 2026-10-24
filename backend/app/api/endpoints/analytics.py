from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, case
from app.db import get_db
from app.models.document import Document, DocumentStatus, DocumentVerdict
from app.api.deps import get_current_user
from app.models.user import User
from pydantic import BaseModel
from typing import List, Dict, Optional

router = APIRouter()

class AnalyticsSummary(BaseModel):
    total_verified: int
    fraud_detected: int
    avg_confidence: float
    fraud_typology: Dict[str, float]
    efficiency_data: List[float]

class DashboardMetrics(BaseModel):
    total_scans: int
    verified_real: int
    detected_fake: int
    avg_processing_time: float

class TrendDataPoint(BaseModel):
    date: str
    real: int
    suspicious: int
    fake: int

class AnalyticsTrends(BaseModel):
    trends: List[TrendDataPoint]
    total_verified: int
    total_fraud: int
    total_suspicious: int
    accuracy: float
    insight: str

class ReportingKPI(BaseModel):
    value: float
    trend_percentage: float
    is_positive: bool

class ReportingKPIs(BaseModel):
    total_documents: ReportingKPI
    fraud_cases: ReportingKPI
    suspicious_cases: ReportingKPI
    avg_processing_time: ReportingKPI
    detection_accuracy: ReportingKPI

class ReportingEfficiencyData(BaseModel):
    date: str
    processing_time: float
    documents_analyzed: int
    accuracy: float

class ReportingTypology(BaseModel):
    label: str
    percentage: float
    count: int

class ReportingResponse(BaseModel):
    kpis: ReportingKPIs
    typology: List[ReportingTypology]
    efficiency_trends: List[ReportingEfficiencyData]

@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Total Verified
    verified_query = select(func.count(Document.id)).where(
        Document.user_id == current_user.id,
        Document.verdict == DocumentVerdict.VERIFIED
    )
    verified_result = await db.execute(verified_query)
    total_verified = verified_result.scalar() or 0

    # Fraud Detected
    fraud_query = select(func.count(Document.id)).where(
        Document.user_id == current_user.id,
        Document.verdict == DocumentVerdict.FAKE
    )
    fraud_result = await db.execute(fraud_query)
    total_fraud = fraud_result.scalar() or 0

    # Avg Confidence
    conf_query = select(func.avg(Document.confidence_score)).where(
        Document.user_id == current_user.id
    )
    conf_result = await db.execute(conf_query)
    avg_conf = conf_result.scalar() or 0.0

    # Mock Typology & Efficiency for now (based on real count if needed)
    typology = {
        "Pixel Alteration": 55.0,
        "Structural Forgery": 25.0,
        "Metadata Spoofing": 20.0
    }
    efficiency = [65.0, 85.0, 45.0, 70.0, 90.0, 40.0, 35.0]

    return AnalyticsSummary(
        total_verified=total_verified,
        fraud_detected=total_fraud,
        avg_confidence=float(avg_conf),
        fraud_typology=typology,
        efficiency_data=efficiency
    )

@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Total Scans
    scans_query = select(func.count(Document.id)).where(Document.user_id == current_user.id)
    scans_result = await db.execute(scans_query)
    total_scans = scans_result.scalar() or 0

    # 2. Verified Real
    # Verdicts: VERIFIED, REAL, GENUINE
    verified_query = select(func.count(Document.id)).where(
        Document.user_id == current_user.id,
        Document.verdict.in_([DocumentVerdict.VERIFIED, DocumentVerdict.REAL, DocumentVerdict.GENUINE])
    )
    verified_result = await db.execute(verified_query)
    verified_real = verified_result.scalar() or 0

    # 3. Detected Fake
    # Verdicts: FAKE, LIKELY_FORGED
    fake_query = select(func.count(Document.id)).where(
        Document.user_id == current_user.id,
        Document.verdict.in_([DocumentVerdict.FAKE, DocumentVerdict.LIKELY_FORGED])
    )
    fake_result = await db.execute(fake_query)
    detected_fake = fake_result.scalar() or 0

    # 4. Avg Processing Time (in seconds)
    # SQLite logic: (julianday(updated_at) - julianday(created_at)) * 86400
    # This is more robust than strftime for precision and handling date objects
    proc_query = select(
        func.avg(
            (func.julianday(Document.updated_at) - func.julianday(Document.created_at)) * 86400
        )
    ).where(
        Document.user_id == current_user.id,
        Document.status == DocumentStatus.COMPLETED
    )
    
    proc_result = await db.execute(proc_query)
    avg_proc_time = proc_result.scalar()
    if avg_proc_time is None:
        avg_proc_time = 0.0

    return DashboardMetrics(
        total_scans=total_scans,
        verified_real=verified_real,
        detected_fake=detected_fake,
        avg_processing_time=round(float(avg_proc_time), 1)
    )

@router.get("/trends", response_model=AnalyticsTrends)
async def get_analytics_trends(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime, timedelta
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days-1) # Inclusive start
    prev_period_start = start_date - timedelta(days=days)

    # 1. Fetch daily trends
    # SQL logic for daily aggregation (SQLite)
    trends_query = select(
        func.date(Document.created_at).label("day"),
        func.sum(case((Document.verdict.in_([DocumentVerdict.VERIFIED, DocumentVerdict.REAL, DocumentVerdict.GENUINE]), 1), else_=0)).label("real"),
        func.sum(case((Document.verdict.in_([DocumentVerdict.SUSPICIOUS, DocumentVerdict.UNKNOWN]), 1), else_=0)).label("suspicious"),
        func.sum(case((Document.verdict.in_([DocumentVerdict.FAKE, DocumentVerdict.LIKELY_FORGED]), 1), else_=0)).label("fake")
    ).where(
        Document.user_id == current_user.id,
        Document.created_at >= start_date.replace(hour=0, minute=0, second=0)
    ).group_by(func.date(Document.created_at)).order_by(func.date(Document.created_at))

    trends_result = await db.execute(trends_query)
    trends_raw = trends_result.all()

    # Fill in missing dates
    trends_map = {row.day: row for row in trends_raw}
    trends_final = []
    for i in range(days):
        d = (start_date + timedelta(days=i)).date().isoformat()
        if d in trends_map:
            row = trends_map[d]
            trends_final.append(TrendDataPoint(date=d, real=row.real, suspicious=row.suspicious, fake=row.fake))
        else:
            trends_final.append(TrendDataPoint(date=d, real=0, suspicious=0, fake=0))

    # 2. KPI Summary (Total in period)
    total_verified = sum(t.real for t in trends_final)
    total_fraud = sum(t.fake for t in trends_final)
    total_suspicious = sum(t.suspicious for t in trends_final)
    
    # Accuracy - Average confidence score in period
    acc_query = select(func.avg(Document.confidence_score)).where(
        Document.user_id == current_user.id,
        Document.created_at >= start_date.replace(hour=0, minute=0, second=0)
    )
    acc_res = await db.execute(acc_query)
    accuracy = (acc_res.scalar() or 0.0) * 100

    # 3. Insight Calculation (Trend vs previous period)
    # Count fraud in current period vs previous period
    prev_query = select(func.count(Document.id)).where(
        Document.user_id == current_user.id,
        Document.verdict.in_([DocumentVerdict.FAKE, DocumentVerdict.LIKELY_FORGED]),
        Document.created_at >= prev_period_start.replace(hour=0, minute=0, second=0),
        Document.created_at < start_date.replace(hour=0, minute=0, second=0)
    )
    prev_res = await db.execute(prev_query)
    prev_fraud = prev_res.scalar() or 0
    
    if prev_fraud == 0:
        insight = f"Fraud detection is stable at {total_fraud} cases this period." if total_fraud == 0 else f"Initial fraud detection baseline established: {total_fraud} cases."
    else:
        change = ((total_fraud - prev_fraud) / prev_fraud) * 100
        direction = "increased" if change >= 0 else "decreased"
        insight = f"Fraud detection {direction} by {abs(int(change))}% this period compared to previous."

    return AnalyticsTrends(
        trends=trends_final,
        total_verified=total_verified,
        total_fraud=total_fraud,
        total_suspicious=total_suspicious,
        accuracy=round(accuracy, 1),
        insight=insight
    )

@router.get("/reports", response_model=ReportingResponse)
async def get_reporting_analytics(
    days: int = 7,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime, timedelta
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days-1)
    prev_period_start = start_date - timedelta(days=days)

    # Helper function to get aggregates for a period
    async def get_period_stats(start: datetime, end: datetime):
        query = select(
            func.count(Document.id).label("total"),
            func.sum(case((Document.verdict.in_([DocumentVerdict.FAKE, DocumentVerdict.LIKELY_FORGED]), 1), else_=0)).label("fraud"),
            func.sum(case((Document.verdict.in_([DocumentVerdict.SUSPICIOUS, DocumentVerdict.UNKNOWN]), 1), else_=0)).label("suspicious"),
            func.avg(
                (func.julianday(Document.updated_at) - func.julianday(Document.created_at)) * 86400
            ).label("proc_time"),
            func.avg(Document.confidence_score).label("acc")
        ).where(
            Document.user_id == current_user.id,
            Document.created_at >= start.replace(hour=0, minute=0, second=0),
            Document.created_at < end.replace(hour=23, minute=59, second=59)
        )
        res = await db.execute(query)
        row = res.first()
        return {
            "total": row.total or 0,
            "fraud": row.fraud or 0,
            "suspicious": row.suspicious or 0,
            "proc_time": row.proc_time or 0.0,
            "acc": (row.acc or 0.0) * 100
        }

    current_stats = await get_period_stats(start_date, end_date)
    prev_stats = await get_period_stats(prev_period_start, start_date - timedelta(days=1))

    # Helper to calculate trend
    def calc_trend(current: float, prev: float, lower_is_better: bool = False):
        if prev == 0:
            change = 100.0 if current > 0 else 0.0
        else:
            change = ((current - prev) / prev) * 100.0
        
        is_positive = (change <= 0) if lower_is_better else (change >= 0)
        return {"value": current, "trend_percentage": abs(change), "is_positive": is_positive}

    kpis = ReportingKPIs(
        total_documents=ReportingKPI(**calc_trend(current_stats["total"], prev_stats["total"])),
        fraud_cases=ReportingKPI(**calc_trend(current_stats["fraud"], prev_stats["fraud"], lower_is_better=True)),
        suspicious_cases=ReportingKPI(**calc_trend(current_stats["suspicious"], prev_stats["suspicious"], lower_is_better=True)),
        avg_processing_time=ReportingKPI(**calc_trend(current_stats["proc_time"], prev_stats["proc_time"], lower_is_better=True)),
        detection_accuracy=ReportingKPI(**calc_trend(current_stats["acc"], prev_stats["acc"]))
    )

    # Generate Typology
    # Distribute the actual fraud count roughly according to realistic percentages
    total_fraud = current_stats["fraud"]
    typology = [
        ReportingTypology(label="Pixel Alteration", percentage=55.0, count=int(total_fraud * 0.55)),
        ReportingTypology(label="Structural Forgery", percentage=20.0, count=int(total_fraud * 0.20)),
        ReportingTypology(label="Metadata Spoofing", percentage=15.0, count=int(total_fraud * 0.15)),
        ReportingTypology(label="OCR Tampering", percentage=10.0, count=total_fraud - int(total_fraud * 0.55) - int(total_fraud * 0.20) - int(total_fraud * 0.15))
    ]

    # Fetch daily efficiency trends
    eff_query = select(
        func.date(Document.created_at).label("day"),
        func.avg(
            (func.julianday(Document.updated_at) - func.julianday(Document.created_at)) * 86400
        ).label("proc_time"),
        func.count(Document.id).label("total"),
        func.avg(Document.confidence_score).label("acc")
    ).where(
        Document.user_id == current_user.id,
        Document.created_at >= start_date.replace(hour=0, minute=0, second=0)
    ).group_by(func.date(Document.created_at)).order_by(func.date(Document.created_at))

    eff_result = await db.execute(eff_query)
    eff_raw = eff_result.all()

    eff_map = {row.day: row for row in eff_raw}
    eff_final = []
    for i in range(days):
        d = (start_date + timedelta(days=i)).date().isoformat()
        if d in eff_map:
            row = eff_map[d]
            eff_final.append(ReportingEfficiencyData(
                date=d,
                processing_time=round(row.proc_time or 0.0, 2),
                documents_analyzed=row.total or 0,
                accuracy=round((row.acc or 0.0) * 100, 1)
            ))
        else:
            eff_final.append(ReportingEfficiencyData(
                date=d, processing_time=0.0, documents_analyzed=0, accuracy=0.0
            ))

    return ReportingResponse(
        kpis=kpis,
        typology=typology,
        efficiency_trends=eff_final
    )
