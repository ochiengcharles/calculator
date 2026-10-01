from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models.history import CalculationHistory
from ..services.calculator_service import CalculatorError, CalculatorService

calculator_bp = Blueprint('calculator', __name__)


@calculator_bp.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200


@calculator_bp.route('/api/calculate', methods=['POST'])
def calculate_expression():
    payload = request.get_json(silent=True) or {}
    expression = str(payload.get('expression', '')).strip()
    angle_mode = str(payload.get('angle_mode', 'DEG')).upper()

    if not expression:
        return jsonify({'success': False, 'error': 'Expression is required'}), 400

    try:
        calculator = CalculatorService(angle_mode=angle_mode)
        result = calculator.evaluate(expression)

        history_entry = CalculationHistory(
            expression=expression,
            result=result,
            angle_mode=angle_mode,
        )
        db.session.add(history_entry)
        db.session.commit()

        return jsonify({
            'success': True,
            'expression': expression,
            'result': result,
            'angle_mode': angle_mode,
        }), 200
    except CalculatorError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 400
    except Exception:
        return jsonify({'success': False, 'error': 'Unable to process calculation'}), 500


@calculator_bp.route('/api/history', methods=['GET'])
def get_history():
    entries = CalculationHistory.query.order_by(CalculationHistory.created_at.desc()).all()
    return jsonify([entry.to_dict for entry in entries]), 200


@calculator_bp.route('/api/history/<int:entry_id>', methods=['GET'])
def get_history_item(entry_id):
    entry = CalculationHistory.query.get_or_404(entry_id)
    return jsonify(entry.to_dict), 200


@calculator_bp.route('/api/history/<int:entry_id>', methods=['DELETE'])
def delete_history_item(entry_id):
    entry = CalculationHistory.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'success': True}), 200


@calculator_bp.route('/api/history', methods=['DELETE'])
def clear_history():
    deleted = db.session.query(CalculationHistory).delete()
    db.session.commit()
    return jsonify({'success': True, 'deleted': deleted}), 200
