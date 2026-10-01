import ast
import math
import re


class CalculatorError(ValueError):
    """Raised for invalid or unsafe calculator expressions."""


class CalculatorService:
    def __init__(self, angle_mode: str = 'DEG'):
        self.angle_mode = (angle_mode or 'DEG').upper()

    def evaluate(self, expression: str) -> float:
        cleaned = self._normalize_expression(expression)
        if not cleaned:
            raise CalculatorError('Expression is required')

        try:
            tree = ast.parse(cleaned, mode='eval')
        except SyntaxError as exc:
            raise CalculatorError('Invalid expression') from exc

        result = self._eval_node(tree.body)
        if isinstance(result, bool):
            return float(int(result))
        if not math.isfinite(float(result)):
            raise CalculatorError('Calculation overflowed')
        return float(result)

    def _normalize_expression(self, expression: str) -> str:
        if expression is None:
            return ''

        cleaned = expression.strip()
        if not cleaned:
            return ''

        cleaned = cleaned.replace('×', '*').replace('÷', '/').replace('^', '**')
        cleaned = cleaned.replace('π', 'pi').replace('e', 'e')
        cleaned = cleaned.replace('−', '-').replace('–', '-')

        cleaned = re.sub(r'(?<![A-Za-z0-9_])pi\b', 'pi', cleaned)
        cleaned = re.sub(r'(?<![A-Za-z0-9_])e\b', 'e', cleaned)
        cleaned = re.sub(r'(?<![A-Za-z0-9_])mod\s*\(', 'mod(', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned)

        cleaned = self._convert_factorials(cleaned)
        return cleaned

    def _convert_factorials(self, expression: str) -> str:
        pattern = r'(?P<value>\([^()]+\)|\d+(?:\.\d+)?|pi|e|[A-Za-z_][A-Za-z0-9_]*\([^()]*\)|[A-Za-z_]+)\s*!'

        def replace(match):
            value = match.group('value')
            return f'factorial({value})'

        return re.sub(pattern, replace, expression)

    def _eval_node(self, node):
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return float(node.value)
            raise CalculatorError('Unsupported constant')

        if isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)

            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                if right == 0:
                    raise CalculatorError('Cannot divide by zero')
                return left / right
            if isinstance(node.op, ast.Mod):
                if right == 0:
                    raise CalculatorError('Cannot divide by zero')
                return left % right
            if isinstance(node.op, ast.Pow):
                return left ** right
            raise CalculatorError('Unsupported operator')

        if isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand)
            if isinstance(node.op, ast.UAdd):
                return +operand
            if isinstance(node.op, ast.USub):
                return -operand
            raise CalculatorError('Unsupported unary operation')

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise CalculatorError('Unsupported function call')

            name = node.func.id.lower()
            args = [self._eval_node(arg) for arg in node.args]

            if name == 'sin':
                return math.sin(self._to_radians(args[0]))
            if name == 'cos':
                return math.cos(self._to_radians(args[0]))
            if name == 'tan':
                return math.tan(self._to_radians(args[0]))
            if name == 'asin':
                return math.degrees(math.asin(args[0]))
            if name == 'acos':
                return math.degrees(math.acos(args[0]))
            if name == 'atan':
                return math.degrees(math.atan(args[0]))
            if name == 'sinh':
                return math.sinh(args[0])
            if name == 'cosh':
                return math.cosh(args[0])
            if name == 'tanh':
                return math.tanh(args[0])
            if name == 'log':
                if args[0] <= 0:
                    raise CalculatorError('Invalid logarithm')
                return math.log10(args[0])
            if name == 'ln':
                if args[0] <= 0:
                    raise CalculatorError('Invalid logarithm')
                return math.log(args[0])
            if name == 'sqrt':
                if args[0] < 0:
                    raise CalculatorError('Cannot calculate square root of a negative number in real mode')
                return math.sqrt(args[0])
            if name == 'abs':
                return abs(args[0])
            if name == 'factorial':
                value = float(args[0])
                if value < 0 or not value.is_integer():
                    raise CalculatorError('Invalid factorial')
                return math.factorial(int(value))
            if name == 'floor':
                return math.floor(args[0])
            if name == 'ceil':
                return math.ceil(args[0])
            if name == 'round':
                return round(args[0])
            if name == 'mod':
                if len(args) != 2:
                    raise CalculatorError('mod requires two arguments')
                return args[0] % args[1]
            if name == 'nth_root':
                if len(args) != 2:
                    raise CalculatorError('nth_root requires two arguments')
                if args[0] < 0 and args[1] % 2 == 0:
                    raise CalculatorError('Invalid nth root')
                return args[0] ** (1 / args[1])
            if name == 'pow':
                if len(args) != 2:
                    raise CalculatorError('pow requires two arguments')
                return args[0] ** args[1]

            raise CalculatorError(f'Unsupported function: {name}')

        if isinstance(node, ast.Name):
            if node.id.lower() == 'pi':
                return math.pi
            if node.id.lower() == 'e':
                return math.e
            raise CalculatorError(f'Unknown variable: {node.id}')

        if isinstance(node, ast.Attribute):
            raise CalculatorError('Unsupported attribute access')

        raise CalculatorError('Unsupported expression')

    def _to_radians(self, value):
        if self.angle_mode == 'DEG':
            return math.radians(float(value))
        if self.angle_mode == 'RAD':
            return float(value)
        if self.angle_mode == 'GRAD':
            return math.radians(float(value) * 0.9)
        return math.radians(float(value))
