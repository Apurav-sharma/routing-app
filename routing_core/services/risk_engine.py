from typing import Dict, Any, List, Tuple

RISK_TIERS = {
    1: {"name": "Low", "color": "#10B981", "badge": "bg-emerald-500"},
    2: {"name": "Moderate", "color": "#FBBF24", "badge": "bg-amber-400"},
    3: {"name": "High", "color": "#F97316", "badge": "bg-orange-500"},
    4: {"name": "Severe", "color": "#EF4444", "badge": "bg-red-500"},
    5: {"name": "No Travel", "color": "#881337", "badge": "bg-rose-950"},
}

class RiskEngine:
    @classmethod
    def evaluate_wind_risk(cls, wind_mph: float, load_weight_lbs: float) -> Tuple[int, str, List[str]]:
        """
        Wind rules:
        - Base: <25 mph (Low), 25-34 (Moderate), 35-44 (High), 45-54 (Severe), >=55 (No Travel)
        - Load rules:
          * >=55 mph -> No Travel for any load
          * 45-54 mph + >30,000 lb -> No Travel
          * 35-44 mph + >40,000 lb -> Severe
        Returns (risk_level: int, tier_name: str, warnings: List[str])
        """
        warnings = []
        base_level = 1

        if wind_mph >= 55.0:
            base_level = 5  # No Travel
            warnings.append(f"Wind >= 55 mph ({wind_mph:.1f} mph): Mandatory NO TRAVEL for all trucks.")
        elif wind_mph >= 45.0:
            base_level = 4  # Severe
            if load_weight_lbs > 30000:
                base_level = 5  # Overridden to No Travel
                warnings.append(f"Wind 45-54 mph ({wind_mph:.1f} mph) with load {load_weight_lbs:,.0f} lb (>30,000 lb): Escalated to NO TRAVEL.")
        elif wind_mph >= 35.0:
            base_level = 3  # High
            if load_weight_lbs > 40000:
                base_level = 4  # Overridden to Severe
                warnings.append(f"Wind 35-44 mph ({wind_mph:.1f} mph) with heavy load {load_weight_lbs:,.0f} lb (>40,000 lb): Escalated to SEVERE.")
        elif wind_mph >= 25.0:
            base_level = 2  # Moderate
        else:
            base_level = 1  # Low

        return base_level, RISK_TIERS[base_level]["name"], warnings

    @classmethod
    def evaluate_rain_risk(cls, rain_in_hr: float) -> Tuple[int, str]:
        """
        Rain rules:
        <0.10 (Low), 0.10–0.25 (Moderate), 0.25–0.50 (High), 0.50–1.00 (Severe), >1.00 (No Travel)
        """
        if rain_in_hr > 1.00:
            lvl = 5
        elif rain_in_hr >= 0.50:
            lvl = 4
        elif rain_in_hr >= 0.25:
            lvl = 3
        elif rain_in_hr >= 0.10:
            lvl = 2
        else:
            lvl = 1
        return lvl, RISK_TIERS[lvl]["name"]

    @classmethod
    def evaluate_snow_risk(cls, snow_in_hr: float) -> Tuple[int, str]:
        """
        Snow rules:
        <0.5 (Low), 0.5–1.0 (Moderate), 1.0–2.0 (High), 2.0–3.0 (Severe), >3.0 (No Travel)
        """
        if snow_in_hr > 3.0:
            lvl = 5
        elif snow_in_hr >= 2.0:
            lvl = 4
        elif snow_in_hr >= 1.0:
            lvl = 3
        elif snow_in_hr >= 0.5:
            lvl = 2
        else:
            lvl = 1
        return lvl, RISK_TIERS[lvl]["name"]

    @classmethod
    def evaluate_checkpoint(cls, checkpoint: Dict[str, Any], load_weight_lbs: float) -> Dict[str, Any]:
        """
        Evaluates weather risk for a single checkpoint, combining wind, rain, snow,
        and truck load overrides.
        """
        w = checkpoint.get("weather", {})
        wind_mph = float(w.get("wind_mph", 0.0))
        rain_in_hr = float(w.get("rain_rate_in_hr", 0.0))
        snow_in_hr = float(w.get("snow_rate_in_hr", 0.0))

        wind_lvl, wind_tier, wind_warns = cls.evaluate_wind_risk(wind_mph, load_weight_lbs)
        rain_lvl, rain_tier = cls.evaluate_rain_risk(rain_in_hr)
        snow_lvl, snow_tier = cls.evaluate_snow_risk(snow_in_hr)

        overall_lvl = max(wind_lvl, rain_lvl, snow_lvl)
        overall_tier = RISK_TIERS[overall_lvl]["name"]

        # Primary risk driver
        drivers = []
        if wind_lvl == overall_lvl and overall_lvl > 1:
            drivers.append(f"Wind ({wind_mph} mph)")
        if rain_lvl == overall_lvl and overall_lvl > 1:
            drivers.append(f"Rain ({rain_in_hr} in/hr)")
        if snow_lvl == overall_lvl and overall_lvl > 1:
            drivers.append(f"Snow ({snow_in_hr} in/hr)")
        primary_driver = ", ".join(drivers) if drivers else "Clear conditions"

        checkpoint["risk"] = {
            "level": overall_lvl,
            "tier": overall_tier,
            "color": RISK_TIERS[overall_lvl]["color"],
            "primary_driver": primary_driver,
            "wind": {"level": wind_lvl, "tier": wind_tier},
            "rain": {"level": rain_lvl, "tier": rain_tier},
            "snow": {"level": snow_lvl, "tier": snow_tier},
            "warnings": wind_warns,
        }
        return checkpoint

    @classmethod
    def evaluate_route(cls, route: Dict[str, Any], checkpoints: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Aggregates risk along the route checkpoints and calculates mile distribution per risk tier.
        """
        total_dist = route.get("distance_miles", 0.0)
        num_cp = len(checkpoints)

        tier_miles = {
            "Low": 0.0,
            "Moderate": 0.0,
            "High": 0.0,
            "Severe": 0.0,
            "No Travel": 0.0,
        }
        total_score_accum = 0.0

        if num_cp == 1:
            tier = checkpoints[0]["risk"]["tier"]
            tier_miles[tier] = total_dist
            total_score_accum = checkpoints[0]["risk"]["level"] * total_dist
        elif num_cp > 1:
            for i in range(num_cp - 1):
                cp1 = checkpoints[i]
                cp2 = checkpoints[i + 1]
                seg_len = max(0.0, cp2["mile_marker"] - cp1["mile_marker"])
                # Worst-case segment risk
                seg_lvl = max(cp1["risk"]["level"], cp2["risk"]["level"])
                seg_tier = RISK_TIERS[seg_lvl]["name"]
                tier_miles[seg_tier] += seg_len
                total_score_accum += seg_lvl * seg_len

        # If any roundoff discrepancy, ensure sum matches total_dist
        sum_miles = sum(tier_miles.values())
        if sum_miles > 0 and abs(sum_miles - total_dist) > 0.5:
            ratio = total_dist / sum_miles
            for k in tier_miles:
                tier_miles[k] = round(tier_miles[k] * ratio, 1)
        else:
            for k in tier_miles:
                tier_miles[k] = round(tier_miles[k], 1)

        avg_risk = round(total_score_accum / total_dist, 2) if total_dist > 0 else 1.0

        # Collect critical warnings along route
        route_warnings = []
        for cp in checkpoints:
            for w in cp["risk"].get("warnings", []):
                route_warnings.append(f"Mile {cp['mile_marker']}: {w}")

        route["checkpoints"] = checkpoints
        route["risk_summary"] = {
            "tier_miles": tier_miles,
            "low_miles": tier_miles["Low"],
            "moderate_miles": tier_miles["Moderate"],
            "high_miles": tier_miles["High"],
            "severe_miles": tier_miles["Severe"],
            "no_travel_miles": tier_miles["No Travel"],
            "critical_severe_miles": round(tier_miles["Severe"] + tier_miles["No Travel"], 1),
            "average_risk_score": avg_risk,
            "max_risk_level": max([cp["risk"]["level"] for cp in checkpoints]) if checkpoints else 1,
            "max_risk_tier": RISK_TIERS[max([cp["risk"]["level"] for cp in checkpoints]) if checkpoints else 1]["name"],
            "warnings_count": len(route_warnings),
            "warnings": route_warnings[:5],  # top 5 warnings
        }
        return route

    @classmethod
    def rank_and_recommend(cls, evaluated_routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Recommends the best route balancing weather risk and travel time.
        Priority Hierarchy:
        1. Fewest Severe miles (including No Travel miles)
        2. Fewest High miles
        3. Lowest average risk
        4. Shortest travel times
        """
        def sort_key(r):
            rs = r["risk_summary"]
            return (
                rs["critical_severe_miles"],   # 1. Fewest Severe + No Travel miles
                rs["high_miles"],               # 2. Fewest High miles
                rs["average_risk_score"],       # 3. Lowest average risk
                r["duration_seconds"],          # 4. Shortest travel time
            )

        sorted_routes = sorted(evaluated_routes, key=sort_key)

        for rank, route in enumerate(sorted_routes):
            route["rank"] = rank + 1
            route["is_recommended"] = (rank == 0)

        # Formulate clear recommendation rationale
        best = sorted_routes[0]
        other_routes = sorted_routes[1:]

        rationale_parts = []
        best_rs = best["risk_summary"]

        if best_rs["critical_severe_miles"] == 0:
            rationale_parts.append("Zero Severe or No-Travel miles detected along this corridor")
        else:
            rationale_parts.append(f"Minimizes Severe weather to only {best_rs['critical_severe_miles']} miles")

        if other_routes:
            alt_severe = [r["risk_summary"]["critical_severe_miles"] for r in other_routes]
            alt_high = [r["risk_summary"]["high_miles"] for r in other_routes]
            max_other_severe = max(alt_severe)
            if max_other_severe > best_rs["critical_severe_miles"]:
                diff = max_other_severe - best_rs["critical_severe_miles"]
                rationale_parts.append(f"avoids up to {diff:.1f} hazardous miles found on alternative paths")

            time_diff_min = round((other_routes[0]["duration_seconds"] - best["duration_seconds"]) / 60.0)
            if time_diff_min > 5:
                rationale_parts.append(f"saves {time_diff_min} minutes over Alternate 1")
            elif time_diff_min < -10:
                rationale_parts.append(f"acceptable {abs(time_diff_min)} min detour for significantly higher weather safety")

        best["recommendation_reason"] = "; ".join(rationale_parts).capitalize() + "."

        return sorted_routes
