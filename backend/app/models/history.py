from datetime import datetime, timezone

from ..extensions import db


class CalculationHistory(db.Model):
    __tablename__ = 'calculation_history'

    id = db.Column(db.Integer, primary_key=True)
    expression = db.Column(db.String(500), nullable=False)
    result = db.Column(db.Float, nullable=False)
    angle_mode = db.Column(db.String(20), nullable=False, default='DEG')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    @property
    def to_dict(self):
        return {
            'id': self.id,
            'expression': self.expression,
            'result': self.result,
            'angle_mode': self.angle_mode,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
