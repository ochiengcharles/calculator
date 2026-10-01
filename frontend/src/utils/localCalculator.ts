import type { AngleMode } from '../types';

type Token = {
  type: 'NUMBER' | 'IDENTIFIER' | 'OPERATOR' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';
  value: string;
};

class ExpressionParser {
  private tokens: Token[];
  private index = 0;
  private readonly angleMode: AngleMode;

  constructor(expression: string, angleMode: AngleMode) {
    this.tokens = this.tokenize(expression);
    this.angleMode = angleMode;
  }

  parse(): number {
    const result = this.parseExpression();
    if (this.peek().type !== 'EOF') {
      throw new Error('Invalid expression');
    }
    return result;
  }

  private tokenize(input: string): Token[] {
    const sanitized = this.normalize(input);
    const tokens: Token[] = [];
    let cursor = 0;

    while (cursor < sanitized.length) {
      const char = sanitized[cursor];

      if (/\s/.test(char)) {
        cursor += 1;
        continue;
      }

      if (/[0-9.]/.test(char)) {
        let number = char;
        cursor += 1;

        while (cursor < sanitized.length && /[0-9.eE+-]/.test(sanitized[cursor])) {
          if (sanitized[cursor] === '+' || sanitized[cursor] === '-') {
            const previous = sanitized[cursor - 1];
            if (previous !== 'e' && previous !== 'E') {
              break;
            }
          }
          number += sanitized[cursor];
          cursor += 1;
        }

        if (number === '.') {
          throw new Error('Invalid number');
        }

        tokens.push({ type: 'NUMBER', value: number });
        continue;
      }

      if (/[A-Za-z_]/.test(char) || char === 'π') {
        let name = char === 'π' ? 'pi' : char;
        cursor += 1;

        while (cursor < sanitized.length && /[A-Za-z0-9_]/.test(sanitized[cursor])) {
          name += sanitized[cursor];
          cursor += 1;
        }

        tokens.push({ type: 'IDENTIFIER', value: name });
        continue;
      }

      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: char });
        cursor += 1;
        continue;
      }

      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: char });
        cursor += 1;
        continue;
      }

      if (char === ',') {
        tokens.push({ type: 'COMMA', value: char });
        cursor += 1;
        continue;
      }

      if ('+-*/%^!'.includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        cursor += 1;
        continue;
      }

      throw new Error(`Unsupported character: ${char}`);
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }

  private normalize(input: string): string {
    let sanitized = input.trim();
    if (!sanitized) throw new Error('Expression is required');

    sanitized = sanitized.replace(/×/g, '*').replace(/÷/g, '/');
    sanitized = sanitized.replace(/−/g, '-').replace(/–/g, '-');
    sanitized = sanitized.replace(/π/g, 'pi');
    sanitized = sanitized.replace(/√/g, 'sqrt');
    sanitized = sanitized.replace(/²/g, '^2').replace(/³/g, '^3');
    sanitized = sanitized.replace(/%/g, '%');
    sanitized = sanitized.replace(/\s+/g, ' ');
    return sanitized;
  }

  private peek(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const token = this.peek();
    this.index += 1;
    return token;
  }

  private match(...values: string[]): boolean {
    const token = this.peek();
    if (token.type === 'OPERATOR' && values.includes(token.value)) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private parseExpression(): number {
    return this.parseAddSubtract();
  }

  private parseAddSubtract(): number {
    let value = this.parseMultiplyDivide();

    while (this.match('+', '-')) {
      const op = this.tokens[this.index - 1].value;
      const next = this.parseMultiplyDivide();
      value = op === '+' ? value + next : value - next;
    }

    return value;
  }

  private parseMultiplyDivide(): number {
    let value = this.parsePower();

    while (this.match('*', '/', '%')) {
      const op = this.tokens[this.index - 1].value;
      const next = this.parsePower();
      if (op === '/') {
        if (next === 0) throw new Error('Cannot divide by zero');
        value = value / next;
      } else if (op === '%') {
        if (next === 0) throw new Error('Cannot divide by zero');
        value = value % next;
      } else {
        value = value * next;
      }
    }

    return value;
  }

  private parsePower(): number {
    let value = this.parseUnary();

    if (this.match('^')) {
      const exponent = this.parsePower();
      value = value ** exponent;
    }

    return value;
  }

  private parseUnary(): number {
    if (this.match('+')) {
      return this.parseUnary();
    }

    if (this.match('-')) {
      return -this.parseUnary();
    }

    const value = this.parsePrimary();
    if (this.match('!')) {
      return this.factorial(value);
    }

    return value;
  }

  private parsePrimary(): number {
    const token = this.peek();

    if (token.type === 'NUMBER') {
      this.advance();
      return Number(token.value);
    }

    if (token.type === 'LPAREN') {
      this.advance();
      const value = this.parseExpression();
      if (this.peek().type !== 'RPAREN') {
        throw new Error('Missing closing parenthesis');
      }
      this.advance();
      return value;
    }

    if (token.type === 'IDENTIFIER') {
      const name = this.advance().value;
      const lower = name.toLowerCase();

      if (lower === 'pi') {
        return Math.PI;
      }
      if (lower === 'e') {
        return Math.E;
      }

      if (this.peek().type === 'LPAREN') {
        this.advance();
        const args: number[] = [];

        if (this.peek().type !== 'RPAREN') {
          do {
            args.push(this.parseExpression());
          } while (this.match(','));
        }

        if (this.peek().type !== 'RPAREN') {
          throw new Error(`Missing closing parenthesis for ${name}`);
        }
        this.advance();

        return this.callFunction(lower, args);
      }

      if (lower === 'sin' || lower === 'cos' || lower === 'tan' || lower === 'log' || lower === 'ln' || lower === 'sqrt' || lower === 'abs' || lower === 'floor' || lower === 'ceil' || lower === 'round' || lower === 'factorial') {
        throw new Error(`Function ${name} requires parentheses`);
      }

      throw new Error(`Unknown value: ${name}`);
    }

    throw new Error('Invalid expression');
  }

  private callFunction(name: string, args: number[]): number {
    if (name === 'sin') return Math.sin(this.toRadians(args[0]));
    if (name === 'cos') return Math.cos(this.toRadians(args[0]));
    if (name === 'tan') return Math.tan(this.toRadians(args[0]));
    if (name === 'asin') return (Math.asin(args[0]) * 180) / Math.PI;
    if (name === 'acos') return (Math.acos(args[0]) * 180) / Math.PI;
    if (name === 'atan') return (Math.atan(args[0]) * 180) / Math.PI;
    if (name === 'sinh') return Math.sinh(args[0]);
    if (name === 'cosh') return Math.cosh(args[0]);
    if (name === 'tanh') return Math.tanh(args[0]);
    if (name === 'log') {
      if (args[0] <= 0) throw new Error('Invalid logarithm');
      return Math.log10(args[0]);
    }
    if (name === 'ln') {
      if (args[0] <= 0) throw new Error('Invalid logarithm');
      return Math.log(args[0]);
    }
    if (name === 'sqrt') {
      if (args[0] < 0) throw new Error('Cannot calculate square root of a negative number in real mode');
      return Math.sqrt(args[0]);
    }
    if (name === 'abs') return Math.abs(args[0]);
    if (name === 'factorial') return this.factorial(args[0]);
    if (name === 'floor') return Math.floor(args[0]);
    if (name === 'ceil') return Math.ceil(args[0]);
    if (name === 'round') return Math.round(args[0]);
    if (name === 'mod') {
      if (args[1] === 0) throw new Error('Cannot divide by zero');
      return args[0] % args[1];
    }
    if (name === 'nth_root') {
      if (args[0] < 0 && args[1] % 2 === 0) throw new Error('Invalid nth root');
      return args[0] ** (1 / args[1]);
    }
    if (name === 'pow') return args[0] ** args[1];

    throw new Error(`Unsupported function: ${name}`);
  }

  private factorial(value: number): number {
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new Error('Invalid factorial');
    }
    if (value === 0 || value === 1) return 1;
    let result = 1;
    for (let i = 2; i <= value; i += 1) {
      result *= i;
    }
    return result;
  }

  private toRadians(value: number): number {
    if (this.angleMode === 'DEG') return (value * Math.PI) / 180;
    if (this.angleMode === 'RAD') return value;
    if (this.angleMode === 'GRAD') return (value * Math.PI) / 200;
    return (value * Math.PI) / 180;
  }
}

export function evaluateExpression(expression: string, angleMode: AngleMode = 'DEG'): number {
  const parser = new ExpressionParser(expression, angleMode);
  return parser.parse();
}
