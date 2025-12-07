"""AI / Gemini routes for defect risk evaluation in IntegrityOS.

Endpoints:
- POST /api/ai/defect/evaluate  — оценка одного дефекта (rule-based + Gemini при наличии)
- POST /api/ai/defects/summary  — агрегированная статистика по дефектам для дашборда
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..services.gemini_service import (
    GeminiService,
    RuleBasedDefectEvaluator,
    RuleBasedResult,
)

router = APIRouter(prefix="/api/ai", tags=["AI / Gemini"])


class DefectInput(BaseModel):
    """Описание дефекта трубопровода для оценки риска.

    Это независимая схема для AI‑оценки. Позже её можно связать с моделями
    Pipeline/Object/Inspection/Defect в БД.
    """

    pipeline_id: Optional[str] = Field(None, description="ID/код трубопровода")
    object_id: Optional[str] = Field(None, description="ID объекта (кран, узел и т.п.)")
    location_km: Optional[float] = Field(None, description="Пикет/километраж")

    defect_type: str = Field(..., description="Тип дефекта (коррозия, трещина, вмятина и т.п.)")
    description: Optional[str] = Field(None, description="Текстовое описание дефекта")

    depth_mm: Optional[float] = Field(None, description="Глубина дефекта, мм")
    wall_thickness_mm: Optional[float] = Field(None, description="Толщина стенки в зоне дефекта, мм")
    length_mm: Optional[float] = Field(None, description="Длина дефекта, мм")
    width_mm: Optional[float] = Field(None, description="Ширина дефекта, мм")

    internal_pressure_mpa: Optional[float] = Field(None, description="Рабочее давление, МПа")
    distance_from_weld_mm: Optional[float] = Field(None, description="Расстояние до сварного шва, мм")
    metal_loss_percent: Optional[float] = Field(None, description="Оценка металлоотбора, %")

    detection_method: Optional[str] = Field(None, description="Метод контроля (ВД, ДК, УЗК и т.п.)")
    year_of_laying: Optional[int] = Field(None, description="Год укладки трубопровода")

    additional_context: Optional[str] = Field(
        None,
        description="Любая дополнительная информация для AI (режим, среда, предыстория и т.п.)",
    )


class RuleBasedResultSchema(BaseModel):
    risk_score: float
    risk_level: str
    factors: List[str]


class GeminiEvaluationSchema(BaseModel):
    summary: str
    recommended_action: str
    explanation: str


class MLClassificationResult(BaseModel):
    """ML-style классификация критичности дефекта.

    Для MVP метка и "вероятность" выводятся на основе rule-based risk_score.
    Позже сюда можно подставить реальные ML-прогнозы (DecisionTree/RandomForest и т.п.).
    """

    label: str  # normal / medium / high
    probability: float  # 0..1


class DefectEvaluationResponse(BaseModel):
    rule_based: RuleBasedResultSchema
    ml: MLClassificationResult
    ai: Optional[GeminiEvaluationSchema] = None
    used_ai: bool


class RiskBucket(BaseModel):
    level: str
    count: int


class RiskDashboardResponse(BaseModel):
    total_defects: int
    by_level: List[RiskBucket]
    average_risk_score: float


_rule_evaluator = RuleBasedDefectEvaluator()
_gemini_service = GeminiService()


def _to_rule_schema(result: RuleBasedResult) -> RuleBasedResultSchema:
    return RuleBasedResultSchema(
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        factors=result.factors,
    )


def _risk_to_ml_label(risk_level: str) -> str:
    """Сопоставление 4-уровневого risk_level в 3-уровневый ml_label.

    low      -> normal
    medium   -> medium
    high/critical -> high
    """

    level = (risk_level or "").lower()
    if level == "low":
        return "normal"
    if level == "medium":
        return "medium"
    return "high"


@router.post("/defect/evaluate", response_model=DefectEvaluationResponse, summary="Оценка дефекта")
def evaluate_defect(
    defect: DefectInput,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),  # noqa: U100 - зарезервировано для будущего использования
):
    """Оценка критичности одного дефекта.

    - Всегда выполняется rule-based скоринг (risk_score, risk_level, факторы)
    - При наличии Gemini API ключа дополнительно вызывается AI для пояснения
    """

    defect_dict: Dict[str, Any] = defect.model_dump()
    rule_result = _rule_evaluator.evaluate(defect_dict)

    # ML-style классификация под ТЗ (normal / medium / high + вероятность)
    ml_label = _risk_to_ml_label(rule_result.risk_level)
    ml_probability = round(rule_result.risk_score / 100.0, 3)
    ml_result = MLClassificationResult(label=ml_label, probability=ml_probability)

    ai_raw = _gemini_service.evaluate_defect(defect_dict, rule_result)
    used_ai = ai_raw is not None

    ai_schema: Optional[GeminiEvaluationSchema] = None
    if ai_raw is not None:
        ai_schema = GeminiEvaluationSchema(
            summary=ai_raw.get("summary", ""),
            recommended_action=ai_raw.get("recommended_action", ""),
            explanation=ai_raw.get("explanation", ""),
        )

    return DefectEvaluationResponse(
        rule_based=_to_rule_schema(rule_result),
        ml=ml_result,
        ai=ai_schema,
        used_ai=used_ai,
    )


@router.post("/defects/summary", response_model=RiskDashboardResponse, summary="Сводка по дефектам")
def defects_summary(
    defects: List[DefectInput],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),  # noqa: U100 - зарезервировано для будущего использования
):
    """Агрегированная статистика по дефектам для дашборда рисков.

    Сейчас использует только rule-based скоринг:
    - количество дефектов по уровням риска
    - средний интегральный risk_score
    Gemini здесь не вызывается (слишком дорого на пачку дефектов).
    """

    if not defects:
        return RiskDashboardResponse(total_defects=0, by_level=[], average_risk_score=0.0)

    # Для дашборда считаем распределение по 3-уровневой критичности (normal/medium/high)
    level_counts: Dict[str, int] = {"normal": 0, "medium": 0, "high": 0}
    total_score = 0.0

    for defect in defects:
        res = _rule_evaluator.evaluate(defect.model_dump())
        ml_label = _risk_to_ml_label(res.risk_level)
        level_counts[ml_label] = level_counts.get(ml_label, 0) + 1
        total_score += res.risk_score

    buckets = [
        RiskBucket(level=level, count=count)
        for level, count in level_counts.items()
        if count > 0
    ]

    avg_score = total_score / len(defects) if defects else 0.0

    return RiskDashboardResponse(
        total_defects=len(defects),
        by_level=buckets,
        average_risk_score=round(avg_score, 1),
    )
