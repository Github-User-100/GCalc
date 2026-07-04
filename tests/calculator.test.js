import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExpressionParser } from '../js/ExpressionParser.js';
import { Calculator, CalcState } from '../js/Calculator.js';

// Silence AppLogger output during tests
vi.spyOn(console, 'debug').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// ── ExpressionParser ──────────────────────────────────────────────────

describe('ExpressionParser.evaluate', () => {
  describe('basic arithmetic', () => {
    it('adds two numbers',        () => expect(ExpressionParser.evaluate('2+3')).toBe(5));
    it('subtracts two numbers',   () => expect(ExpressionParser.evaluate('10-4')).toBe(6));
    it('multiplies two numbers',  () => expect(ExpressionParser.evaluate('3*4')).toBe(12));
    it('divides two numbers',     () => expect(ExpressionParser.evaluate('8/2')).toBe(4));
  });

  describe('order of operations', () => {
    it('mul before add',          () => expect(ExpressionParser.evaluate('2+3*4')).toBe(14));
    it('div before sub',          () => expect(ExpressionParser.evaluate('10-6/2')).toBe(7));
    it('parentheses override',    () => expect(ExpressionParser.evaluate('(2+3)*4')).toBe(20));
    it('chained operations',      () => expect(ExpressionParser.evaluate('1+2+3+4')).toBe(10));
    it('nested parens',           () => expect(ExpressionParser.evaluate('((2+3)*(4-1))')).toBe(15));
  });

  describe('exponentiation', () => {
    it('2^3 = 8',                 () => expect(ExpressionParser.evaluate('2^3')).toBe(8));
    it('right-associative: 2^3^2 = 512', () => expect(ExpressionParser.evaluate('2^3^2')).toBe(512));
  });

  describe('decimal handling', () => {
    it('decimal inputs',          () => expect(ExpressionParser.evaluate('1.5+1.5')).toBe(3));
    it('floating-point noise trimmed', () => {
      // 0.1+0.2 raw = 0.30000000000000004; formatNumber should clean it
      const result = ExpressionParser.evaluate('0.1+0.2');
      expect(result).toBeCloseTo(0.3, 10);
    });
    it('leading dot: .5+.5',      () => expect(ExpressionParser.evaluate('.5+.5')).toBe(1));
  });

  describe('unary negation (~)', () => {
    it('negates a number',        () => expect(ExpressionParser.evaluate('~5')).toBe(-5));
    it('negative in expression',  () => expect(ExpressionParser.evaluate('10+~3')).toBe(7));
    it('double negation',         () => expect(ExpressionParser.evaluate('~~4')).toBe(4));
    it('leading minus (keyboard shortcut)', () => expect(ExpressionParser.evaluate('-5')).toBe(-5));
  });

  describe('division by zero', () => {
    it('returns ERR:DIV/0',       () => {
      const r = ExpressionParser.evaluate('5/0');
      expect(r).toBeInstanceOf(Error);
      expect(r.message).toBe('ERR:DIV/0');
    });
    it('in subexpression',        () => {
      const r = ExpressionParser.evaluate('1+(2/0)');
      expect(r).toBeInstanceOf(Error);
      expect(r.message).toBe('ERR:DIV/0');
    });
  });

  describe('malformed input', () => {
    it('empty string → ERR:SYNTAX',   () => expect(ExpressionParser.evaluate('')).toBeInstanceOf(Error));
    it('lone operator → ERR:SYNTAX',  () => expect(ExpressionParser.evaluate('+')).toBeInstanceOf(Error));
    it('double operator → ERR:SYNTAX',() => expect(ExpressionParser.evaluate('2++3')).toBeInstanceOf(Error));
    it('unclosed paren → ERR:SYNTAX', () => expect(ExpressionParser.evaluate('(2+3')).toBeInstanceOf(Error));
    it('extra close paren → ERR:SYNTAX', () => expect(ExpressionParser.evaluate('2+3)')).toBeInstanceOf(Error));
    it('alpha chars → ERR:SYNTAX',    () => expect(ExpressionParser.evaluate('2+a')).toBeInstanceOf(Error));
    it('double decimal → ERR:SYNTAX', () => expect(ExpressionParser.evaluate('1.2.3')).toBeInstanceOf(Error));
  });

  describe('display symbols (×, ÷, −)', () => {
    it('× treated as *',  () => expect(ExpressionParser.evaluate('3×4')).toBe(12));
    it('÷ treated as /',  () => expect(ExpressionParser.evaluate('8÷2')).toBe(4));
    it('− treated as -',  () => expect(ExpressionParser.evaluate('10−3')).toBe(7));
  });
});

describe('ExpressionParser.formatNumber', () => {
  it('integer stays integer',        () => expect(ExpressionParser.formatNumber(42)).toBe('42'));
  it('trims floating-point noise',   () => expect(ExpressionParser.formatNumber(0.1 + 0.2)).toBe('0.3'));
  it('large number uses exponential',() => expect(ExpressionParser.formatNumber(1e11)).toMatch(/e/));
  it('zero formats as 0',            () => expect(ExpressionParser.formatNumber(0)).toBe('0'));
  it('negative number',              () => expect(ExpressionParser.formatNumber(-7)).toBe('-7'));
});

// ── Calculator ────────────────────────────────────────────────────────

describe('Calculator', () => {
  let calc;
  let changes;

  beforeEach(() => {
    changes = [];
    calc = new Calculator((buf, state) => changes.push({ buf, state }));
  });

  describe('initial state', () => {
    it('starts in INPUT state',  () => expect(calc.state).toBe(CalcState.INPUT));
    it('starts with empty buffer', () => expect(calc.buffer).toBe(''));
  });

  describe('input()', () => {
    it('appends characters',     () => { calc.input('2'); calc.input('+'); calc.input('3'); expect(calc.buffer).toBe('2+3'); });
    it('notifies on each char',  () => { calc.input('5'); expect(changes.length).toBe(1); });
    it('stays in INPUT state',   () => { calc.input('7'); expect(calc.state).toBe(CalcState.INPUT); });
  });

  describe('evaluate()', () => {
    it('transitions to RESULT on success', () => {
      calc.input('2'); calc.input('+'); calc.input('3');
      calc.evaluate();
      expect(calc.state).toBe(CalcState.RESULT);
    });
    it('buffer holds the result value', () => {
      calc.input('6'); calc.input('/'); calc.input('2');
      calc.evaluate();
      expect(calc.buffer).toBe('3');
    });
    it('transitions to ERROR on bad input', () => {
      calc.input('+');
      calc.evaluate();
      expect(calc.state).toBe(CalcState.ERROR);
    });
    it('returns entry object on success', () => {
      calc.input('4'); calc.input('*'); calc.input('5');
      const entry = calc.evaluate();
      expect(entry).toMatchObject({ expr: '4*5', result: '20', isError: false });
    });
    it('returns entry with isError=true on error', () => {
      calc.input('1'); calc.input('/'); calc.input('0');
      const entry = calc.evaluate();
      expect(entry).toMatchObject({ isError: true });
      expect(entry.result).toBe('ERR:DIV/0');
    });
    it('returns null on empty buffer', () => {
      expect(calc.evaluate()).toBeNull();
    });
  });

  describe('state transitions', () => {
    it('INPUT→RESULT on evaluate',        () => { calc.input('1'); calc.evaluate(); expect(calc.state).toBe(CalcState.RESULT); });
    it('RESULT→INPUT on next digit',      () => { calc.input('1'); calc.evaluate(); calc.input('5'); expect(calc.state).toBe(CalcState.INPUT); });
    it('RESULT→INPUT clears old result',  () => { calc.input('1'); calc.evaluate(); calc.input('5'); expect(calc.buffer).toBe('5'); });
    it('ERROR→INPUT on next digit',       () => { calc.input('+'); calc.evaluate(); calc.input('2'); expect(calc.state).toBe(CalcState.INPUT); });
    it('ERROR→INPUT clears error',        () => { calc.input('+'); calc.evaluate(); calc.input('2'); expect(calc.buffer).toBe('2'); });
  });

  describe('delete()', () => {
    it('removes last character',           () => { calc.input('1'); calc.input('2'); calc.delete(); expect(calc.buffer).toBe('1'); });
    it('no-op on empty buffer',            () => { calc.delete(); expect(calc.buffer).toBe(''); });
    it('clears buffer and resets after RESULT', () => {
      calc.input('3'); calc.evaluate(); calc.delete();
      expect(calc.buffer).toBe('');
      expect(calc.state).toBe(CalcState.INPUT);
    });
    it('clears buffer and resets after ERROR', () => {
      calc.input('+'); calc.evaluate(); calc.delete();
      expect(calc.state).toBe(CalcState.INPUT);
    });
  });

  describe('clearLiveInput()', () => {
    it('empties the buffer',      () => { calc.input('1'); calc.input('2'); calc.clearLiveInput(); expect(calc.buffer).toBe(''); });
    it('resets to INPUT state',   () => { calc.input('1'); calc.evaluate(); calc.clearLiveInput(); expect(calc.state).toBe(CalcState.INPUT); });
  });
});
