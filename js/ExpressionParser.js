import { AppLogger } from '../../shared/AppLogger/javascript/AppLogger.js';

/**
 * Recursive-descent parser for arithmetic expressions.
 *
 * Supported: + - * / ^ ( ) decimal  unary negation (~)
 * Tokens:    digits, operators, parens. The keypad sends × as *, ÷ as /, ~ as unary minus.
 *
 * Grammar:
 *   expr     → term (('+' | '-') term)*
 *   term     → factor (('*' | '/') factor)*
 *   factor   → base ('^' factor)?          (right-associative)
 *   base     → '~' base | '(' expr ')' | number
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

      return new Error('ERR:SYNTAX');
    }
    return tokens;
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

    // base → '~' base | '(' expr ')' | number
    #parseBase() {
      const tok = this.#peek();
      if (!tok) return new Error('ERR:SYNTAX');

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
