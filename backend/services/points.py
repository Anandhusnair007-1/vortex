from sqlalchemy.orm import Session

from models import ActivityLog, PointsConfig, User


class PointsService:
    def get_points_value(self, db: Session, action_name: str, default: int) -> int:
        cfg = db.query(PointsConfig).filter(PointsConfig.action_name == action_name).first()
        return cfg.points_value if cfg else default

    def award_points(
        self,
        db: Session,
        user: User,
        action_name: str,
        target: str,
        detail: str,
        default_points: int,
    ) -> int:
        points = self.get_points_value(db, action_name, default_points)
        user.points_total = (user.points_total or 0) + points
        db.add(
            ActivityLog(
                user_id=user.id,
                action=action_name,
                target=target,
                detail=detail,
                points_earned=points,
            )
        )
        return points


points_service = PointsService()
