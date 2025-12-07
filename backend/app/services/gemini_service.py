"""Gemini integration and rule-based defect risk evaluation for IntegrityOS.

This service provides:
- Rule-based risk scoring for pipeline defects
- Optional refinement using Google Gemini, if GEMINI_API_KEY is configured

Gemini usage is kept optional so that the backend works even without an API key.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

try:
    import google.generativeai as genai  # type: ignore
except ImportError:  # Library is optional, code must not crash without it
    genai = None  # type: ignore


@dataclass
class RuleBasedResult:
    risk_score: float
    risk_level: str
    factors: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "factors": self.factors,
        }


class RuleBasedDefectEvaluator:
    """Simple rule-based engine for defect criticality.

    This does **not** pretend to be a real standard (DNV, ASME и т.п.),
    это просто понятный для MVP скoring, который можно доработать.
    """

    def evaluate(self, defect: Dict[str, Any]) -> RuleBasedResult:
        depth_mm = self._to_float(defect.get("depth_mm"))
        wall_thickness_mm = self._to_float(defect.get("wall_thickness_mm"))
        pressure_mpa = self._to_float(defect.get("internal_pressure_mpa"))
        distance_from_weld_mm = self._to_float(defect.get("distance_from_weld_mm"))
        metal_loss_percent = self._to_float(defect.get("metal_loss_percent"))
        defect_type = (defect.get("defect_type") or "").lower()

        score = 0.0
        factors: List[str] = []

        # 1) Относительная глубина дефекта
        if depth_mm is not None and wall_thickness_mm and wall_thickness_mm > 0:
            ratio = depth_mm / wall_thickness_mm
            if ratio < 0.2:
                score += 10
                factors.append("Небольшая относительная глубина дефекта (<20% толщины)")
            elif ratio < 0.4:
                score += 30
                factors.append("Средняя глубина дефекта (20–40% толщины)")
            elif ratio < 0.6:
                score += 60
                factors.append("Большая глубина дефекта (40–60% толщины)")
            else:
                score += 85
                factors.append("Критическая глубина дефекта (>60% толщины)")
        elif depth_mm is not None:
            # Есть глубина, но нет толщины — считаем средний риск
            score += 40
            factors.append("Неизвестна толщина стенки, глубина учитывается как средний риск")

        # 2) Металлоотбор / коррозия
        if metal_loss_percent is not None:
            if metal_loss_percent < 10:
                score += 5
                factors.append("Небольшой металлоотбор (<10%)")
            elif metal_loss_percent < 30:
                score += 20
                factors.append("Умеренный металлоотбор (10–30%)")
            elif metal_loss_percent < 50:
                score += 40
                factors.append("Существенный металлоотбор (30–50%)")
            else:
                score += 60
                factors.append("Очень высокий металлоотбор (>50%)")

        # 3) Давление в трубопроводе
        if pressure_mpa is not None:
            if pressure_mpa < 2:
                score += 5
                factors.append("Низкое рабочее давление (<2 МПа)")
            elif pressure_mpa < 6:
                score += 15
                factors.append("Среднее рабочее давление (2–6 МПа)")
            else:
                score += 30
                factors.append("Высокое рабочее давление (>6 МПа)")

        # 4) Близость к сварному шву
        if distance_from_weld_mm is not None:
            if distance_from_weld_mm < 50:
                score += 25
                factors.append("Дефект рядом со сварным швом (<50 мм)")
            elif distance_from_weld_mm < 200:
                score += 10
                factors.append("Дефект в зоне влияния сварного шва (50–200 мм)")

        # 5) Тип дефекта
        if "crack" in defect_type or "трещ" in defect_type:
            score += 40
            factors.append("Трещина — потенциально хрупкий отказ")
        if "corrosion" in defect_type or "корроз" in defect_type:
            score += 20
            factors.append("Коррозионный дефект")
        if "dent" in defect_type or "вмят" in defect_type:
            score += 15
            factors.append("Вмятина — локальное снижение прочности")

        # Ограничим score от 0 до 100
        score = max(0.0, min(score, 100.0))

        if score < 25:
            level = "low"
        elif score < 50:
            level = "medium"
        elif score < 75:
            level = "high"
        else:
            level = "critical"

        return RuleBasedResult(risk_score=round(score, 1), risk_level=level, factors=factors)

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None


class GeminiService:
    """Wrapper around Google Gemini for defect risk explanation.

    Gemini **не обязателен**: если нет библиотеки или API‑ключа,
    сервис просто вернёт None, а backend использует только rule‑based оценку.
    """

    def __init__(self, model_name: Optional[str] = None, api_key: Optional[str] = None) -> None:
        # Приоритет: параметр api_key > GOOGLE_AI_API_KEY > GEMINI_API_KEY 
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")
        # Приоритет: параметр model_name > GEMINI_MODEL
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
        self._configured = False

    def _can_use_gemini(self) -> bool:
        return bool(self.api_key) and genai is not None

    def _ensure_client(self) -> bool:
        if not self._can_use_gemini():
            return False
        if not self._configured:
            genai.configure(api_key=self.api_key)  # type: ignore[arg-type]
            self._configured = True
        return True

    def evaluate_defect(self, defect: Dict[str, Any], rule_based: RuleBasedResult) -> Optional[Dict[str, Any]]:
        """Call Gemini to refine rule-based evaluation.

        Returns dict with keys: summary, recommended_action, explanation
        or None if Gemini is not available.
        """
        if not self._ensure_client():
            return None

        model = genai.GenerativeModel(self.model_name)  # type: ignore[attr-defined]

        system_prompt = (
            "You are an integrity engineer helping to assess pipeline defects. "
            "You receive a JSON with raw defect data and a simple rule-based risk score. "
            "Respond ONLY with JSON having keys: summary, recommended_action, explanation. "
            "Use short, practical Russian language for operators, no marketing. "
            "Risk scale: low, medium, high, critical."
        )

        payload = {
            "defect": defect,
            "rule_based": rule_based.to_dict(),
        }

        try:
            response = model.generate_content([
                system_prompt,
                "\nДанные дефекта (JSON):\n" + json.dumps(payload, ensure_ascii=False),
            ])
        except Exception:
            return None

        text = getattr(response, "text", None) or ""  # type: ignore[attr-defined]
        if not text:
            return None

        text = text.strip()
        # Попробуем разобрать JSON из ответа
        try:
            data = json.loads(text)
            summary = str(data.get("summary", "")).strip()
            recommended_action = str(data.get("recommended_action", "")).strip()
            explanation = str(data.get("explanation", "")).strip()
        except Exception:
            # Если модель вернула не JSON — отдадим текст как explanation
            summary = "AI-оценка дефекта"
            recommended_action = ""
            explanation = text

        return {
            "summary": summary,
            "recommended_action": recommended_action,
            "explanation": explanation,
        }
