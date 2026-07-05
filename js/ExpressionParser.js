import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';

/**
 * Recursive-descent parser for arithmetic expressions.
 *
 * Supported: + - * / ^ ( ) decimal  unary negation (~)
 *            sin cos tan asin acos atan ln log sqrt abs exp
 *            √( as display alias for sqrt(
 *            constants: π (Math.PI), e (Math.E)
 * Trig:      radians (not degrees — matches Phase 2 graphing convention)
 *
 * Grammar:
 *   expr     → term (('+' | '-') term)*
 *   term     → factor (('*' | '/') factor)*
 *   factor   → base ('^' factor)?          (right-associative)
 *   base     → '~' base | func '(' expr ')' | '(' expr ')' | constant | number
 *   func     → 'sin'|'cos'|'tan'|'asin'|'acos'|'atan'|'ln'|'log'|'sqrt'|'abs'|'exp'|'√'
 *   constant → 'π' | 'e'
 *   number   → digit+ ('.' digit*)?
 */
export class ExpressionParser {
  static evaluate(expr) {
    const log = AppLogger.enter('ExpressionParser.evaluate');
    try {
      if (!expr || !expr.trim()) {
        return new Error('ERR:SYNTAX');
      }
      const tokens = ExpressionParser.#tokenize(expr.trim());
      if (tokens instanceof Error) return tokens;

      const parser = new ExpressionParser.#Parser(tokens);
      const result = parser.parseExpr();
      if (result instanceof Error) return result;
      if (!parser.done()) return new Error('ERR:SYNTAX');

      log.log('DEBUG', `${expr} = ${result}`);
      return result;
    } catch {
      return new Error('ERR:SYNTAX');
    } finally {
      log.complete();
    }
  }

  static evaluateAt(expr, x, y = undefined) {
    let sub = expr.replace(/\bx\b/g, `(${x})`);
    if (y !== undefined) sub = sub.replace(/\by\b/g, `(${y})`);
    return ExpressionParser.evaluate(sub);
  }

  static formatNumber(n) {
    if (!isFinite(n)) return 'ERR:OVERFLOW';
    // Trim floating-point noise: 0.1+0.2 = 0.30000000000000004 → 0.3
    const rounded = parseFloat(n.toPrecision(12));
    // Use exponential notation for very large/small numbers
    if (Math.abs(rounded) >= 1e10 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
      return rounded.toExponential(6).replace(/\.?0+e/, 'e');
    }
    return String(rounded);
  }

  // ── Tokenizer ────────────────────────────────────────────────────────

  static #tokenize(expr) {
    const tokens = [];
    let i = 0;
    while (i < expr.length) {
      const ch = expr[i];

      if (ch === ' ') { i++; continue; }

      if (/\d/.test(ch) || ch === '.') {
        let num = '';
        let dots = 0;
        while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
          if (expr[i] === '.') {
            dots++;
            if (dots > 1) return new Error('ERR:SYNTAX');
          }
          num += expr[i++];
        }
        tokens.push({ type: 'NUM', value: parseFloat(num) });
        continue;
      }

      if ('+-*/^()~'.includes(ch)) {
        tokens.push({ type: 'OP', value: ch });
        i++;
        continue;
      }

      // × and ÷ from keypad display strings
      if (ch === '×') { tokens.push({ type: 'OP', value: '*' }); i++; continue; }
      if (ch === '÷') { tokens.push({ type: 'OP', value: '/' }); i++; continue; }
      if (ch === '−') { tokens.push({ type: 'OP', value: '-' }); i++; continue; }

      // π constant
      if (ch === 'π') { tokens.push({ type: 'NUM', value: Math.PI }); i++; continue; }

      // √ — display alias for sqrt, treated as a function token
      if (ch === '√') { tokens.push({ type: 'FUNC', value: 'sqrt' }); i++; continue; }

      // Letter sequences: function names (sin, cos, …) or constant 'e'
      if (/[a-zA-Z]/.test(ch)) {
        let name = '';
        while (i < expr.length && /[a-zA-Z]/.test(expr[i])) name += expr[i++];
        if (name === 'e') {
          tokens.push({ type: 'NUM', value: Math.E });
        } else if (['sin','cos','tan','asin','acos','atan','ln','log','sqrt','abs','exp'].includes(name)) {
          tokens.push({ type: 'FUNC', value: name });
        } else {
          return new Error('ERR:SYNTAX');
        }
        continue;
      }

      return new Error('ERR:SYNTAX');
    }
    return ExpressionParser.#insertImplicitMultiply(tokens);
  }

  static #insertImplicitMultiply(tokens) {
    const result = [];
    for (let i = 0; i < tokens.length; i++) {
      result.push(tokens[i]);
      if (i + 1 < tokens.length) {
        const cur  = tokens[i];
        const next = tokens[i + 1];
        const curEnds    = cur.type  === 'NUM' || (cur.type  === 'OP' && cur.value  === ')');
        const nextBegins = next.type === 'NUM' || next.type  === 'FUNC' || (next.type === 'OP' && next.value === '(');
        if (curEnds && nextBegins) result.push({ type: 'OP', value: '*' });
      }
    }
    return result;
  }

  // ── Function evaluator ───────────────────────────────────────────────

  static #applyFunction(name, arg) {
    switch (name) {
      case 'sin':  return Math.sin(arg);
      case 'cos':  return Math.cos(arg);
      case 'tan': {
        const t = Math.tan(arg);
        return isFinite(t) ? t : new Error('ERR:UNDEFINED');
      }
      case 'asin': return (arg >= -1 && arg <= 1) ? Math.asin(arg) : new Error('ERR:DOMAIN');
      case 'acos': return (arg >= -1 && arg <= 1) ? Math.acos(arg) : new Error('ERR:DOMAIN');
      case 'atan': return Math.atan(arg);
      case 'ln':   return arg > 0 ? Math.log(arg)   : new Error('ERR:DOMAIN');
      case 'log':  return arg > 0 ? Math.log10(arg) : new Error('ERR:DOMAIN');
      case 'sqrt': return arg >= 0 ? Math.sqrt(arg) : new Error('ERR:DOMAIN');
      case 'abs':  return Math.abs(arg);
      case 'exp':  return Math.exp(arg);
      default:     return new Error('ERR:SYNTAX');
    }
  }

  // ── Recursive-descent parser ─────────────────────────────────────────

  static #Parser = class {
    #tokens;
    #pos;

    constructor(tokens) {
      this.#tokens = tokens;
      this.#pos = 0;
    }

    done()    { return this.#pos >= this.#tokens.length; }
    #peek()   { return this.#tokens[this.#pos] ?? null; }
    #consume(){ return this.#tokens[this.#pos++]; }

    // expr → term (('+' | '-') term)*
    parseExpr() {
      let left = this.#parseTerm();
      if (left instanceof Error) return left;

      while (!this.done()) {
        const tok = this.#peek();
        if (tok?.type !== 'OP' || (tok.value !== '+' && tok.value !== '-')) break;
        this.#consume();
        const right = this.#parseTerm();
        if (right instanceof Error) return right;
        left = tok.value === '+' ? left + right : left - right;
      }
      return left;
    }

    // term → factor (('*' | '/') factor)*
    #parseTerm() {
      let left = this.#parseFactor();
      if (left instanceof Error) return left;

      while (!this.done()) {
        const tok = this.#peek();
        if (tok?.type !== 'OP' || (tok.value !== '*' && tok.value !== '/')) break;
        this.#consume();
        const right = this.#parseFactor();
        if (right instanceof Error) return right;
        if (tok.value === '/') {
          if (right === 0) return new Error('ERR:DIV/0');
          left = left / right;
        } else {
          left = left * right;
        }
      }
      return left;
    }

    // factor → base ('^' factor)?   (right-associative)
    #parseFactor() {
      const base = this.#parseBase();
      if (base instanceof Error) return base;

      const tok = this.#peek();
      if (tok?.type === 'OP' && tok.value === '^') {
        this.#consume();
        const exp = this.#parseFactor(); // right-associative recursion
        if (exp instanceof Error) return exp;
        return Math.pow(base, exp);
      }
      return base;
    }

    // base → '~' base | func '(' expr ')' | '(' expr ')' | constant | number
    #parseBase() {
      const tok = this.#peek();
      if (!tok) return new Error('ERR:SYNTAX');

      // Function call: func(expr)
      if (tok.type === 'FUNC') {
        this.#consume();
        const open = this.#peek();
        if (!open || open.type !== 'OP' || open.value !== '(') return new Error('ERR:SYNTAX');
        this.#consume();
        const arg = this.parseExpr();
        if (arg instanceof Error) return arg;
        const close = this.#peek();
        if (!close || close.type !== 'OP' || close.value !== ')') return new Error('ERR:SYNTAX');
        this.#consume();
        return ExpressionParser.#applyFunction(tok.value, arg);
      }

      // Unary negation token
      if (tok.type === 'OP' && tok.value === '~') {
        this.#consume();
        const val = this.#parseBase();
        if (val instanceof Error) return val;
        return -val;
      }

      // Allow unary '-' at expression start or after operator/open-paren
      if (tok.type === 'OP' && tok.value === '-') {
        this.#consume();
        const val = this.#parseBase();
        if (val instanceof Error) return val;
        return -val;
      }

      // Parenthesised sub-expression
      if (tok.type === 'OP' && tok.value === '(') {
        this.#consume();
        const inner = this.parseExpr();
        if (inner instanceof Error) return inner;
        const close = this.#peek();
        if (!close || close.type !== 'OP' || close.value !== ')') {
          return new Error('ERR:SYNTAX');
        }
        this.#consume();
        return inner;
      }

      // Number literal
      if (tok.type === 'NUM') {
        this.#consume();
        return tok.value;
      }

      return new Error('ERR:SYNTAX');
    }
  };
}
