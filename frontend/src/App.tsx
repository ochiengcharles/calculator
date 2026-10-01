import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calculateExpression,
  clearHistory,
  deleteHistoryItem,
  getHistory,
  healthCheck,
} from './services/calculatorApi';
import type { AngleMode, HistoryEntry, ThemeMode } from './types';
import { evaluateExpression } from './utils/localCalculator';

const standardButtons = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '-'],
  ['0', '.', '(', ')', '+'],
];

const scientificButtons = [
  ['sin(', 'cos(', 'tan(', 'log('],
  ['asin(', 'acos(', 'atan(', 'ln('],
  ['sqrt(', 'x²', 'x³', '10ˣ'],
  ['eˣ', 'factorial(', 'abs(', 'π'],
  ['sinh(', 'cosh(', 'tanh(', 'e'],
  ['nth_root(', 'mod(', '(', ')'],
];

const memoryButtons = ['MC', 'MR', 'M+', 'M-', 'MS'];

const angleModes: AngleMode[] = ['DEG', 'RAD', 'GRAD'];

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  if (Math.abs(value) >= 1_000_000 || (Math.abs(value) > 0 && Math.abs(value) < 0.0001)) {
    return value.toExponential(6);
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return Number(value.toFixed(10)).toString();
}

function App() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [status, setStatus] = useState('Ready');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('smartcalc-theme') as ThemeMode | null;
    return saved ?? 'dark';
  });
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [isScientific, setIsScientific] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [memoryValue, setMemoryValue] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const totalDisplay = useMemo(() => {
    return expression;
  }, [expression]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('smartcalc-theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkHealth = async () => {
      const ok = await healthCheck();
      setBackendAvailable(ok);
      if (!ok) {
        setStatus('Backend unavailable — local calculations enabled');
      }
    };

    const loadHistory = async () => {
      try {
        const data = await getHistory();
        setHistory(data);
      } catch {
        setHistory([]);
      }
    };

    void checkHealth();
    void loadHistory();
  }, []);

  const appendValue = useCallback((value: string) => {
    setExpression((current) => `${current}${value}`);
    setStatus('Calculating');
  }, []);

  const clearDisplay = useCallback(() => {
    setExpression('');
    setResult('0');
    setStatus('Ready');
  }, []);

  const removeLastCharacter = useCallback(() => {
    setExpression((current) => current.slice(0, -1));
  }, []);

  const handleFunctionInput = (fn: string) => {
    setExpression((current) => `${current}${fn}`);
  };

  const evaluateLocally = useCallback(
    (rawExpression: string) => {
      try {
        const value = evaluateExpression(rawExpression, angleMode);
        return value;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid expression';
        throw new Error(message);
      }
    },
    [angleMode],
  );

  const calculateCurrentExpression = useCallback(async () => {
    const rawExpression = expression.trim();
    if (!rawExpression) {
      setStatus('Expression is required');
      return;
    }

    try {
      let resolvedResult: number;
      let savedExpression = rawExpression;

      if (backendAvailable) {
        try {
          const response = await calculateExpression(rawExpression, angleMode);
          if (!response.success || response.result === undefined) {
            throw new Error(response.error || 'Calculation failed');
          }
          resolvedResult = response.result;
          savedExpression = response.expression || rawExpression;
          const entries = await getHistory();
          setHistory(entries);
          setStatus('Calculation saved');
        } catch (caughtError) {
          setBackendAvailable(false);
          resolvedResult = evaluateLocally(rawExpression);
          savedExpression = rawExpression;
          setStatus('Backend unavailable — local calculations enabled');
          setHistory((current) => [
            {
              id: Date.now(),
              expression: savedExpression,
              result: resolvedResult,
              angle_mode: angleMode,
              created_at: new Date().toISOString(),
            },
            ...current,
          ]);
          if (caughtError instanceof Error) {
            setStatus(caughtError.message);
          }
        }
      } else {
        resolvedResult = evaluateLocally(rawExpression);
        savedExpression = rawExpression;
        setStatus('Backend unavailable — local calculations enabled');
        setHistory((current) => [
          {
            id: Date.now(),
            expression: savedExpression,
            result: resolvedResult,
            angle_mode: angleMode,
            created_at: new Date().toISOString(),
          },
          ...current,
        ]);
      }

      setExpression(savedExpression);
      setResult(formatResult(resolvedResult));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Invalid expression';
      setStatus(message);
      setResult('Error');
    }
  }, [angleMode, backendAvailable, evaluateLocally, expression]);

  const applyMemoryAction = (action: 'MC' | 'MR' | 'M+' | 'M-' | 'MS') => {
    const value = expression ? evaluateLocally(expression) : Number(result);
    if (Number.isNaN(value)) {
      setStatus('Invalid memory operation');
      return;
    }

    if (action === 'MC') {
      setMemoryValue(null);
      setStatus('Memory cleared');
      return;
    }

    if (action === 'MS') {
      setMemoryValue(value);
      setStatus('Memory stored');
      return;
    }

    if (action === 'MR') {
      if (memoryValue === null) {
        setStatus('No value in memory');
        return;
      }
      setExpression(String(memoryValue));
      setResult(formatResult(memoryValue));
      setStatus('Memory recalled');
      return;
    }

    if (memoryValue === null) {
      setMemoryValue(value);
      setStatus('Memory initialized');
      return;
    }

    if (action === 'M+') {
      setMemoryValue(memoryValue + value);
      setStatus('Memory added');
      return;
    }

    setMemoryValue(memoryValue - value);
    setStatus('Memory subtracted');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      const allowed = /[0-9]/.test(key) || ['+', '-', '*', '/', '(', ')', '.', '%', '^'].includes(key);

      if (allowed) {
        event.preventDefault();
        appendValue(key);
        return;
      }

      if (key === 'Enter') {
        event.preventDefault();
        void calculateCurrentExpression();
        return;
      }

      if (key === 'Escape') {
        event.preventDefault();
        clearDisplay();
        return;
      }

      if (key === 'Backspace') {
        event.preventDefault();
        removeLastCharacter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appendValue, calculateCurrentExpression, clearDisplay, removeLastCharacter]);

  const handleHistoryItemClick = (item: HistoryEntry) => {
    setExpression(item.expression);
    setResult(formatResult(item.result));
    setHistoryOpen(false);
  };

  const handleDeleteHistoryItem = async (itemId: number | string) => {
    try {
      if (backendAvailable) {
        await deleteHistoryItem(itemId);
      }
      setHistory((current) => current.filter((item) => item.id !== itemId));
    } catch {
      setHistory((current) => current.filter((item) => item.id !== itemId));
    }
  };

  const handleClearHistory = async () => {
    try {
      if (backendAvailable) {
        await clearHistory();
      }
      setHistory([]);
    } catch {
      setHistory([]);
    }
  };

  const renderScientificButtons = () =>
    scientificButtons.map((row) => (
      <div key={row.join('-')} className="grid grid-cols-4 gap-2">
        {row.map((button) => {
          const rawValue =
            button === 'x²'
              ? '^2'
              : button === 'x³'
                ? '^3'
                : button === '10ˣ'
                  ? '10^'
                  : button === 'eˣ'
                    ? 'e^'
                    : button === 'π'
                      ? 'pi'
                      : button === 'e'
                        ? 'e'
                        : button === 'nth_root('
                          ? 'nth_root('
                          : button === 'mod('
                            ? 'mod('
                            : button;

          return (
            <button
              key={button}
              type="button"
              aria-label={button.replace('(', '').replace(')', '') || button}
              onClick={() => handleFunctionInput(rawValue)}
              className="rounded-xl bg-slate-200/90 px-2 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              {button}
            </button>
          );
        })}
      </div>
    ));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
        <header className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-slate-950/40">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-violet-500">SmartCalc</p>
            <h1 className="text-2xl font-bold">Professional Calculator</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isScientific ? 'Standard' : 'Scientific'}
              className="rounded-full bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow shadow-violet-500/30 transition hover:bg-violet-500"
              onClick={() => setIsScientific((value) => !value)}
            >
              {isScientific ? 'Standard' : 'Scientific'}
            </button>
            <button
              type="button"
              aria-label="Toggle theme"
              className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700"
              onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/30">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                {angleModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    aria-label={mode}
                    data-active={angleMode === mode ? 'true' : 'false'}
                    onClick={() => setAngleMode(mode)}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold transition hover:border-violet-500 data-[active=true]:bg-violet-600 data-[active=true]:text-white dark:border-slate-700"
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm">
                {memoryValue !== null && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-600">M</span>}
                <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {backendAvailable ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="mb-3 text-right text-xs uppercase tracking-[0.2em] text-slate-500">Expression</div>
              <div className="overflow-x-auto whitespace-nowrap text-right text-xl font-medium text-slate-700 dark:text-slate-200">
                {totalDisplay}
              </div>
              <div className="mt-4 text-right text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {result}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {memoryButtons.map((button) => (
                <button
                  key={button}
                  type="button"
                  aria-label={button}
                  onClick={() => applyMemoryAction(button as 'MC' | 'MR' | 'M+' | 'M-' | 'MS')}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  {button}
                </button>
              ))}
            </div>

            <div className="mt-5 space-y-3">
              {standardButtons.map((row) => (
                <div key={row.join('-')} className="grid grid-cols-5 gap-2">
                  {row.map((button) => {
                    if (button === '÷') {
                      return (
                        <button
                          key={button}
                          type="button"
                          aria-label="Divide"
                          onClick={() => handleFunctionInput('/')}
                          className="rounded-xl bg-violet-100 px-2 py-3 text-lg font-bold text-violet-700 transition hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-200"
                        >
                          ÷
                        </button>
                      );
                    }
                    if (button === '×') {
                      return (
                        <button
                          key={button}
                          type="button"
                          aria-label="Multiply"
                          onClick={() => handleFunctionInput('*')}
                          className="rounded-xl bg-violet-100 px-2 py-3 text-lg font-bold text-violet-700 transition hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-200"
                        >
                          ×
                        </button>
                      );
                    }
                    if (button === '+' || button === '-' || button === '%' || button === '.') {
                      return (
                        <button
                          key={button}
                          type="button"
                          aria-label={button === '%' ? 'Percent' : button}
                          onClick={() => handleFunctionInput(button)}
                          className="rounded-xl bg-slate-200 px-2 py-3 text-lg font-bold text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                        >
                          {button}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={button}
                        type="button"
                        aria-label={button}
                        onClick={() => handleFunctionInput(button)}
                        className="rounded-xl bg-slate-100 px-2 py-3 text-lg font-semibold text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        {button}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-label="Backspace"
                    onClick={removeLastCharacter}
                    className="rounded-xl bg-amber-100 px-2 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                  >
                    ⌫
                  </button>
                </div>
              ))}

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  aria-label="Clear"
                  onClick={clearDisplay}
                  className="rounded-xl bg-rose-100 px-2 py-3 text-base font-bold text-rose-700 transition hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-200"
                >
                  AC
                </button>
                <button
                  type="button"
                  aria-label="Open parenthesis"
                  onClick={() => handleFunctionInput('(')}
                  className="rounded-xl bg-slate-200 px-2 py-3 text-lg font-bold dark:bg-slate-700"
                >
                  (
                </button>
                <button
                  type="button"
                  aria-label="Close parenthesis"
                  onClick={() => handleFunctionInput(')')}
                  className="rounded-xl bg-slate-200 px-2 py-3 text-lg font-bold dark:bg-slate-700"
                >
                  )
                </button>
                <button
                  type="button"
                  aria-label="Equals"
                  onClick={() => void calculateCurrentExpression()}
                  className="rounded-xl bg-violet-600 px-2 py-3 text-lg font-bold text-white transition hover:bg-violet-500"
                >
                  =
                </button>
              </div>

              {isScientific && (
                <div className="mt-4 space-y-2">
                  {renderScientificButtons()}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {status}
            </div>
          </section>

          <aside className={`${historyOpen ? 'block' : 'hidden'} rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-slate-950/30 lg:block`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">History</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold dark:border-slate-700 lg:hidden"
                  onClick={() => setHistoryOpen((current) => !current)}
                >
                  {historyOpen ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  aria-label="Clear all history"
                  onClick={handleClearHistory}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold dark:border-slate-700"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  No calculations yet.
                </p>
              ) : (
                history.map((item) => (
                  <div key={String(item.id)} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/80">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleHistoryItemClick(item)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm text-slate-600 dark:text-slate-300">{item.expression}</div>
                        <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">= {formatResult(item.result)}</div>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete history item ${item.expression}`}
                        onClick={() => void handleDeleteHistoryItem(item.id)}
                        className="text-xs font-semibold text-rose-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;
