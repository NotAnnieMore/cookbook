"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import AppDecorations from "@/components/app-decorations";
import CookModeLoading from "@/components/cook-mode-loading";
import { CookbookMascotIllustration, CookbookMascotMark } from "@/components/cookbook-mascot";
import { pauseCookTimer, resetCookTimer, restoreCookTimer, startCookTimer, tickCookTimers, type CookTimer, type SavedCookTimer } from "@/lib/recipes/cook-timers";

type Ingredient = {
  id: string;
  name: string;
  optional: boolean;
  quantity: number | string | null;
  quantityMax: number | string | null;
  unit: string | null;
  groupName: string | null;
};

type Step = {
  id: string;
  instruction: string;
  timerSeconds: number | null;
  sectionName: string | null;
  ingredientIds: string[];
};

type CookRecipe = {
  id: string;
  title: string;
  servings: number | string | null;
  servingsLabel: string;
  ingredients: Ingredient[];
  steps: Step[];
};

type WakeLockSentinelLike = EventTarget & {
  released: boolean;
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

type SavedProgress = {
  started: boolean;
  currentIndex: number;
  completedIds: string[];
  checkedIngredients: string[];
  timers: Record<string, SavedCookTimer>;
};

function displayNumber(value: number | string | null) {
  if (value === null) return "";
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 3 }).format(parsed)
    : String(value);
}

function ingredientAmount(ingredient: Ingredient) {
  const first = displayNumber(ingredient.quantity);
  if (!first) return "";
  const last = displayNumber(ingredient.quantityMax);
  return `${last ? `${first}–${last}` : first}${ingredient.unit ? ` ${ingredient.unit}` : ""}`;
}

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const rest = safeSeconds % 60;
  if (hours) return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function timerDurationLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}

function initialTimers(steps: Step[], saved: Record<string, SavedCookTimer> = {}): Record<string, CookTimer> {
  return Object.fromEntries(steps.flatMap((step) => step.timerSeconds
    ? [[step.id, restoreCookTimer(step.timerSeconds, saved[step.id])] as const]
    : []));
}

export default function CookMode({ recipe }: { recipe: CookRecipe }) {
  const storageKey = `cookbook:cook-mode:${recipe.id}`;
  const [hydrated, setHydrated] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(() => new Set());
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [keepAwake, setKeepAwake] = useState(false);
  const [wakeMessage, setWakeMessage] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, CookTimer>>(() => initialTimers(recipe.steps));
  const [timerMessage, setTimerMessage] = useState<string | null>(null);
  const [stepDirection, setStepDirection] = useState<"next" | "previous">("next");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const currentStep = recipe.steps[currentIndex] ?? null;
  const currentTimer = currentStep ? timers[currentStep.id] ?? null : null;
  const activeTimers = useMemo(() => recipe.steps.flatMap((step, index) => {
    const timer = timers[step.id];
    return timer && timer.status !== "idle" ? [{ step, index, timer }] : [];
  }), [recipe.steps, timers]);
  const hasRunningTimers = activeTimers.some(({ timer }) => timer.status === "running");
  const allStepsCompleted = recipe.steps.length > 0 && completedIds.size === recipe.steps.length;
  const finished = allStepsCompleted && !hasRunningTimers;
  const progress = recipe.steps.length ? Math.round((completedIds.size / recipe.steps.length) * 100) : 0;
  const currentStepIngredients = useMemo(() => {
    if (!currentStep?.ingredientIds.length) return [];
    const selected = new Set(currentStep.ingredientIds);
    return recipe.ingredients.filter((ingredient) => selected.has(ingredient.id));
  }, [currentStep, recipe.ingredients]);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<SavedProgress>;
          const savedIndex = Math.min(Math.max(0, parsed.currentIndex ?? 0), Math.max(0, recipe.steps.length - 1));
          const validStepIds = new Set(recipe.steps.map((step) => step.id));
          const validIngredientIds = new Set(recipe.ingredients.map((ingredient) => ingredient.id));
          const restoredCompletedIds = (parsed.completedIds ?? []).filter((id) => validStepIds.has(id));
          const restoredTimers = initialTimers(recipe.steps, parsed.timers ?? {});
          const hasRestoredRunningTimer = Object.values(restoredTimers).some((timer) => timer.status === "running");
          const wasFinished = recipe.steps.length > 0 && restoredCompletedIds.length === recipe.steps.length && !hasRestoredRunningTimer;
          const restoredIndex = wasFinished ? 0 : savedIndex;
          setStarted(wasFinished ? false : Boolean(parsed.started));
          setCurrentIndex(restoredIndex);
          setCompletedIds(new Set(wasFinished ? [] : restoredCompletedIds));
          setCheckedIngredients(new Set(wasFinished ? [] : (parsed.checkedIngredients ?? []).filter((id) => validIngredientIds.has(id))));
          setTimers(wasFinished ? initialTimers(recipe.steps) : restoredTimers);
        }
      } catch {
        window.localStorage.removeItem(storageKey);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [recipe.ingredients, recipe.steps, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (finished) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    const progressToSave: SavedProgress = {
      started,
      currentIndex,
      completedIds: [...completedIds],
      checkedIngredients: [...checkedIngredients],
      timers,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(progressToSave));
  }, [checkedIngredients, completedIds, currentIndex, finished, hydrated, started, storageKey, timers]);

  useEffect(() => {
    if (!hasRunningTimers) return;
    const sync = () => setTimers((current) => tickCookTimers(current));
    const interval = window.setInterval(sync, 1000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [hasRunningTimers]);

  useEffect(() => {
    if (!hydrated) return;
    const completed = activeTimers.filter(({ timer }) => timer.status === "done" && !timer.notified);
    if (!completed.length) return;
    const notificationTimer = window.setTimeout(() => {
      const completedStepIds = new Set(completed.map((item) => item.step.id));
      setTimers((current) => Object.fromEntries(Object.entries(current).map(([stepId, timer]) => [
        stepId,
        completedStepIds.has(stepId) ? { ...timer, notified: true } : timer,
      ])));
      const latest = completed.at(-1);
      if (!latest) return;
      setTimerMessage(`O temporizador do passo ${latest.index + 1} terminou.`);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Cookbook · tempo terminado", {
          body: `Passo ${latest.index + 1} de ${recipe.title}`,
          icon: "/brand/cookbook-mascot-mark.svg",
        });
      }
      navigator.vibrate?.([180, 100, 180]);
    }, 0);
    return () => window.clearTimeout(notificationTimer);
  }, [activeTimers, hydrated, recipe.title]);

  useEffect(() => {
    if (!ingredientsOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIngredientsOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [ingredientsOpen]);

  useEffect(() => () => {
    void wakeLockRef.current?.release();
  }, []);

  const ingredientGroups = useMemo(() => {
    const groups: { name: string | null; ingredients: Ingredient[] }[] = [];
    for (const ingredient of recipe.ingredients) {
      const previous = groups.at(-1);
      if (!previous || previous.name !== ingredient.groupName) groups.push({ name: ingredient.groupName, ingredients: [ingredient] });
      else previous.ingredients.push(ingredient);
    }
    return groups;
  }, [recipe.ingredients]);

  async function requestWakeLock() {
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
    if (!wakeLock) {
      setWakeMessage("Este dispositivo não permite manter o ecrã ativo pelo navegador.");
      return false;
    }
    try {
      wakeLockRef.current = await wakeLock.request("screen");
      setWakeMessage("O ecrã ficará ativo enquanto estiveres a cozinhar.");
      return true;
    } catch {
      setWakeMessage("Não foi possível manter o ecrã ativo. Confirma as permissões do navegador.");
      return false;
    }
  }

  async function toggleWakeLock() {
    if (keepAwake) {
      await wakeLockRef.current?.release();
      wakeLockRef.current = null;
      setKeepAwake(false);
      setWakeMessage("O ecrã voltou ao comportamento normal.");
      return;
    }
    const active = await requestWakeLock();
    setKeepAwake(active);
  }

  function moveStep(direction: -1 | 1) {
    const nextIndex = Math.min(Math.max(0, currentIndex + direction), recipe.steps.length - 1);
    if (nextIndex === currentIndex) return;
    if (direction === 1 && currentStep) {
      setCompletedIds((current) => new Set(current).add(currentStep.id));
    }
    setStepDirection(direction === 1 ? "next" : "previous");
    setCurrentIndex(nextIndex);
  }

  function toggleCurrentComplete() {
    if (!currentStep) return;
    setCompletedIds((current) => {
      const next = new Set(current);
      if (next.has(currentStep.id)) next.delete(currentStep.id);
      else next.add(currentStep.id);
      return next;
    });
  }

  function completeAndContinue() {
    if (!currentStep) return;
    setCompletedIds((current) => new Set(current).add(currentStep.id));
    if (currentIndex < recipe.steps.length - 1) {
      const nextIndex = currentIndex + 1;
      setStepDirection("next");
      setCurrentIndex(nextIndex);
    }
  }

  async function startTimer(stepId: string) {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // O temporizador continua a funcionar mesmo sem notificações do sistema.
      }
    }
    setTimerMessage(null);
    setTimers((current) => {
      const timer = current[stepId];
      return timer ? { ...current, [stepId]: startCookTimer(timer) } : current;
    });
  }

  function toggleTimer(stepId: string) {
    const timer = timers[stepId];
    if (!timer) return;
    if (timer.status === "running") {
      setTimers((current) => ({ ...current, [stepId]: pauseCookTimer(current[stepId]) }));
      return;
    }
    void startTimer(stepId);
  }

  function resetTimer(stepId: string) {
    setTimerMessage(null);
    setTimers((current) => {
      const timer = current[stepId];
      return timer ? { ...current, [stepId]: resetCookTimer(timer) } : current;
    });
  }

  function stopAllTimers() {
    setTimerMessage(null);
    setTimers((current) => Object.fromEntries(
      Object.entries(current).map(([stepId, timer]) => [stepId, resetCookTimer(timer)]),
    ));
  }

  function openTimerStep(index: number) {
    if (index === currentIndex) return;
    setStepDirection(index > currentIndex ? "next" : "previous");
    setCurrentIndex(index);
  }

  function toggleIngredient(id: string) {
    setCheckedIngredients((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function restart() {
    setStarted(false);
    setCurrentIndex(0);
    setCompletedIds(new Set());
    setCheckedIngredients(new Set());
    setTimers(initialTimers(recipe.steps));
    setTimerMessage(null);
    window.localStorage.removeItem(storageKey);
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    moveStep(deltaX < 0 ? 1 : -1);
  }

  if (!hydrated) {
    return <CookModeLoading label="A organizar os passos…" />;
  }

  if (!recipe.steps.length) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F4EC] px-5 text-center text-[#27231F]">
        <div><CookbookMascotIllustration variant="reading" className="mx-auto size-44" /><h1 className="mt-5 font-serif text-4xl font-black">Esta receita ainda não tem passos.</h1><Link href={`/receitas/${recipe.id}`} className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[#285240] px-6 font-extrabold text-white">Voltar à receita</Link></div>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="relative isolate min-h-screen overflow-x-clip bg-[#F8F4EC] px-5 py-6 text-[#27231F] sm:px-8">
        <AppDecorations tone="mixed" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <Link href={`/receitas/${recipe.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#285240] hover:bg-[#E5EBDD]">← Voltar à receita</Link>
          <section className="mt-4 overflow-hidden rounded-[2rem_2rem_4.5rem_2rem] bg-[#FFFCF6] shadow-[0_12px_0_#E3DCD0] sm:grid sm:grid-cols-[.9fr_1.1fr]">
            <div className="grid place-items-center bg-[#E5EBDD] p-6"><CookbookMascotIllustration variant="cooking" className="size-48 sm:size-64" priority /></div>
            <div className="p-6 sm:p-9">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Antes de começar</p>
              <h1 className="mt-2 font-serif text-4xl font-black leading-tight tracking-[-.04em]">{recipe.title}</h1>
              {recipe.servings ? <p className="mt-3 font-bold text-[#746D64]">Para {displayNumber(recipe.servings)} {recipe.servingsLabel}</p> : null}
              <p className="mt-5 leading-7 text-[#746D64]">Confirma os ingredientes se te der jeito. Esta checklist é opcional e fica guardada apenas neste dispositivo.</p>
              <button type="button" onClick={() => setIngredientsOpen(true)} className="mt-6 inline-flex min-h-12 items-center rounded-full border-2 border-[#285240] px-5 text-sm font-extrabold text-[#285240]">Ver checklist de ingredientes</button>
              <button type="button" onClick={() => setStarted(true)} className="mt-3 flex min-h-14 w-full items-center justify-center rounded-full bg-[#285240] px-6 font-extrabold text-white shadow-[0_5px_0_#193A2B]">Começar a cozinhar →</button>
            </div>
          </section>
        </div>
        {ingredientsOpen ? <IngredientsSheet groups={ingredientGroups} checked={checkedIngredients} setChecked={setCheckedIngredients} onClose={() => setIngredientsOpen(false)} /> : null}
      </main>
    );
  }

  if (finished) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#F8F4EC] px-5 text-center text-[#27231F]">
        <div className="max-w-xl"><CookbookMascotIllustration variant="presenting" className="mx-auto size-48" /><p className="mt-4 text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Receita concluída</p><h1 className="mt-2 font-serif text-5xl font-black tracking-[-.045em]">Está pronto para a mesa.</h1><p className="mt-4 leading-7 text-[#746D64]">Concluíste os {recipe.steps.length} passos de “{recipe.title}”.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href={`/receitas/${recipe.id}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#285240] px-6 font-extrabold text-white">Voltar à receita</Link><button type="button" onClick={restart} className="min-h-12 rounded-full border-2 border-[#285240] px-6 font-extrabold text-[#285240]">Cozinhar novamente</button></div></div>
      </main>
    );
  }

  return (
    <main className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-[#F8F4EC] text-[#27231F]">
      <header className="shrink-0 border-b border-[#DDD5C9] bg-[#FFFCF6]/95 px-4 py-2 backdrop-blur sm:px-7 sm:py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href={`/receitas/${recipe.id}`} className="grid size-11 shrink-0 place-items-center rounded-full text-xl font-black text-[#285240] hover:bg-[#E5EBDD]" aria-label="Sair do modo cozinhar">×</Link>
          <div className="min-w-0 text-center"><p className="truncate font-serif text-lg font-black">{recipe.title}</p><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#746D64]">Passo {currentIndex + 1} de {recipe.steps.length}</p></div>
          <button type="button" onClick={() => setIngredientsOpen(true)} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#E5EBDD] text-[#285240]" aria-label="Abrir ingredientes"><CookbookMascotMark className="size-8" /></button>
        </div>
      </header>

      <div className="h-2 shrink-0 bg-[#E4DDD2]" aria-label={`${progress}% concluído`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-r-full bg-[#F36F56] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>

      {activeTimers.length ? (
        <div className="shrink-0 border-b border-[#DDD5C9] bg-[#F3EEE5] px-4 py-1.5 sm:px-7 sm:py-2">
          <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto pb-1">
            {activeTimers.map(({ step, index, timer }) => (
              <button
                key={step.id}
                type="button"
                onClick={() => openTimerStep(index)}
                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-extrabold transition ${timer.status === "done" ? "bg-[#F36F56] text-white" : index === currentIndex ? "bg-[#285240] text-white" : "bg-[#FFFCF6] text-[#285240]"}`}
                aria-label={`Abrir o passo ${index + 1}`}
              >
                <span aria-hidden>{timer.status === "done" ? "✓" : "◷"}</span>
                Passo {index + 1} · {timer.status === "done" ? "terminou" : formatTimer(timer.remainingSeconds)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {timerMessage ? (
        <div role="status" className="shrink-0 border-b border-[#E7A493] bg-[#FCE1D9] px-5 py-2 text-center text-sm font-extrabold text-[#8C321F] sm:py-3">
          {timerMessage}
          <button type="button" onClick={() => setTimerMessage(null)} className="ml-3 rounded-full px-2 py-1 underline underline-offset-2">Fechar</button>
        </div>
      ) : null}

      <section
        className="flex min-h-0 flex-1 touch-pan-y overflow-hidden px-4 py-3 sm:px-8 sm:py-5"
        onTouchStart={(event) => { const touch = event.touches[0]; touchStartRef.current = { x: touch.clientX, y: touch.clientY }; }}
        onTouchEnd={handleTouchEnd}
        aria-labelledby="current-step-title"
      >
        <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div>{currentStep.sectionName ? <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#E25B43] sm:text-xs">{currentStep.sectionName}</p> : <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#E25B43] sm:text-xs">Preparação</p>}<h1 id="current-step-title" className="font-serif text-2xl font-black tracking-[-.04em] sm:mt-1 sm:text-4xl">Passo {currentIndex + 1}</h1></div>
            <div className="ml-auto rounded-full bg-[#E5EBDD] px-3 py-2 text-xs font-extrabold text-[#285240]">{progress}% concluído</div>
            <button type="button" onClick={() => void toggleWakeLock()} aria-pressed={keepAwake} className={`min-h-11 rounded-full px-4 text-xs font-extrabold ${keepAwake ? "bg-[#F3C565] text-[#27231F]" : "border border-[#CFC6B8] bg-[#FFFCF6] text-[#285240]"}`}>{keepAwake ? "Ecrã sempre ativo" : "Manter ecrã ativo"}</button>
          </div>
          {wakeMessage ? <p role="status" className="mt-2 shrink-0 text-xs font-semibold text-[#746D64] sm:mt-3">{wakeMessage}</p> : null}

          <article key={currentStep.id} aria-live="polite" className={`relative isolate mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.6rem_1.6rem_3.6rem_1.6rem] bg-[#FFFCF6] p-5 shadow-[0_7px_0_#E3DCD0] sm:mt-5 sm:rounded-[2rem_2rem_5rem_2rem] sm:p-9 sm:shadow-[0_10px_0_#E3DCD0] ${stepDirection === "next" ? "cookbook-step-next" : "cookbook-step-previous"}`}>
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -right-16 -top-20 size-56 rounded-[58%_42%_52%_48%] bg-[#E5EBDD]/75" />
              <div className="absolute -bottom-20 -left-16 size-48 rounded-[42%_58%_38%_62%] bg-[#F3C565]/25" />
              <svg viewBox="0 0 120 100" className="cookbook-step-steam absolute right-7 top-6 h-24 w-28 text-[#285240]/12" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><path d="M28 75c-19-19 17-24 0-46M58 69c-19-20 18-26 1-51M88 75c-18-19 16-24 0-46" /></svg>
            </div>
            <div className="mb-4 flex items-center justify-between gap-4 sm:mb-7">
              <span className="grid size-12 place-items-center rounded-[55%_45%_58%_42%/48%_57%_43%_52%] bg-[#F36F56] font-serif text-xl font-black text-white shadow-[0_3px_0_#D94F38] sm:size-16 sm:text-2xl sm:shadow-[0_4px_0_#D94F38]">{String(currentIndex + 1).padStart(2, "0")}</span>
              <CookbookMascotMark className="size-10 opacity-80 sm:size-12" />
            </div>
            <p className="max-w-3xl font-serif text-xl font-bold leading-[1.4] tracking-[-.02em] sm:text-3xl sm:leading-[1.32] lg:text-4xl">{currentStep.instruction}</p>
            {currentStepIngredients.length ? (
              <div className="mt-8 rounded-[1.5rem_1.5rem_2.8rem_1.5rem] bg-[#EAF0E5] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#E25B43]">Para este passo</p><h2 className="mt-1 font-serif text-xl font-black text-[#285240]">Ingredientes à mão</h2></div>
                  <button type="button" onClick={() => setIngredientsOpen(true)} className="min-h-10 shrink-0 rounded-full px-3 text-xs font-extrabold text-[#285240] hover:bg-white/60">Ver todos</button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {currentStepIngredients.map((ingredient) => {
                    const checked = checkedIngredients.has(ingredient.id);
                    return (
                      <button key={ingredient.id} type="button" onClick={() => toggleIngredient(ingredient.id)} aria-pressed={checked} className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${checked ? "bg-[#285240] text-white" : "bg-[#FFFCF6] text-[#27231F] hover:-translate-y-0.5"}`}>
                        <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full border-2 text-xs font-black ${checked ? "border-white bg-white text-[#285240]" : "border-[#AFC2B6] text-transparent"}`}>✓</span>
                        <span className="min-w-0 flex-1"><strong className={`block leading-5 ${checked ? "line-through opacity-80" : ""}`}>{ingredient.name}</strong>{ingredient.optional ? <span className={`text-[10px] font-bold ${checked ? "text-white/70" : "text-[#817970]"}`}>Opcional</span> : null}</span>
                        <span className={`shrink-0 text-sm font-extrabold ${checked ? "text-white" : "text-[#285240]"}`}>{ingredientAmount(ingredient)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {currentTimer ? (
              <div className="mt-8 rounded-[1.5rem_1.5rem_2.8rem_1.5rem] border-t-4 border-[#F3C565] bg-[#FFF7DF] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
                <div className="flex items-end justify-between gap-4 sm:block">
                  <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#A94B37]">Temporizador deste passo</p><p className="mt-1 text-sm font-bold text-[#746D64]">{timerDurationLabel(currentTimer.durationSeconds)}</p></div>
                  <span className={`font-serif text-4xl font-black tabular-nums ${currentTimer.status === "done" ? "text-[#E25B43]" : "text-[#285240]"}`}>{formatTimer(currentTimer.remainingSeconds)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
                  <button type="button" onClick={() => toggleTimer(currentStep.id)} className="min-h-12 flex-1 rounded-full bg-[#F3C565] px-5 text-sm font-extrabold text-[#27231F] shadow-[0_3px_0_#D7A93D] sm:flex-none">
                    {currentTimer.status === "running"
                      ? "Pausar"
                      : currentTimer.status === "paused"
                        ? "Retomar"
                        : currentTimer.status === "done"
                          ? `Temporizar novamente ${timerDurationLabel(currentTimer.durationSeconds)}`
                          : `Temporizar ${timerDurationLabel(currentTimer.durationSeconds)}`}
                  </button>
                  {currentTimer.status !== "idle" ? <button type="button" onClick={() => resetTimer(currentStep.id)} className="min-h-12 rounded-full px-4 text-sm font-extrabold text-[#285240]">{currentTimer.status === "done" ? "Repor" : "Parar e repor"}</button> : null}
                </div>
              </div>
            ) : null}
            {currentIndex < recipe.steps.length - 1 ? <p className="mt-9 border-t border-dashed border-[#D8D0C4] pt-5 text-sm leading-6 text-[#746D64]"><strong className="text-[#285240]">A seguir:</strong> <span className="line-clamp-2">{recipe.steps[currentIndex + 1].instruction}</span></p> : null}
          </article>

          <p className="mt-2 shrink-0 text-center text-[11px] font-semibold text-[#817970] sm:hidden">Desliza para a esquerda ou direita para mudar de passo.</p>
        </div>
      </section>

      <footer className="safe-bottom shrink-0 border-t border-[#DDD5C9] bg-[#FFFCF6] px-4 py-2 sm:px-7 sm:py-3">
        {allStepsCompleted && hasRunningTimers ? <p role="status" className="mx-auto mb-2 max-w-4xl text-center text-xs font-bold text-[#8B5D16]">Podes esperar pelo fim das contagens ou pará-las agora e concluir a receita.</p> : null}
        <div className="mx-auto grid max-w-4xl grid-cols-[3.25rem_1fr_3.25rem] items-center gap-3">
          <button type="button" onClick={() => moveStep(-1)} disabled={currentIndex === 0} className="grid size-13 place-items-center rounded-full border border-[#CFC6B8] text-2xl font-black text-[#285240] disabled:opacity-25" aria-label="Passo anterior">←</button>
          <button type="button" onClick={allStepsCompleted && hasRunningTimers ? stopAllTimers : completeAndContinue} className="min-h-14 rounded-full bg-[#285240] px-5 text-sm font-extrabold text-white shadow-[0_4px_0_#193A2B]">{allStepsCompleted && hasRunningTimers ? "Parar temporizadores e terminar" : completedIds.has(currentStep.id) ? currentIndex === recipe.steps.length - 1 ? "Terminar receita" : "Passo concluído · avançar" : currentIndex === recipe.steps.length - 1 ? "Concluir receita" : "Concluir e avançar"}</button>
          <button type="button" onClick={() => moveStep(1)} disabled={currentIndex === recipe.steps.length - 1} className="grid size-13 place-items-center rounded-full border border-[#CFC6B8] text-2xl font-black text-[#285240] disabled:opacity-25" aria-label="Passo seguinte">→</button>
        </div>
        <button type="button" onClick={toggleCurrentComplete} className="mx-auto mt-2 block min-h-8 px-3 text-xs font-bold text-[#746D64]">{completedIds.has(currentStep.id) ? "Marcar este passo como não concluído" : "Marcar como concluído sem avançar"}</button>
      </footer>

      {ingredientsOpen ? <IngredientsSheet groups={ingredientGroups} checked={checkedIngredients} setChecked={setCheckedIngredients} onClose={() => setIngredientsOpen(false)} /> : null}
    </main>
  );
}

function IngredientsSheet({ groups, checked, setChecked, onClose }: { groups: { name: string | null; ingredients: Ingredient[] }[]; checked: Set<string>; setChecked: React.Dispatch<React.SetStateAction<Set<string>>>; onClose: () => void }) {
  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#27231F]/35 p-3 backdrop-blur-[2px] sm:items-center" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="cook-ingredients-title" onMouseDown={(event) => event.stopPropagation()} className="safe-bottom max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem_2rem_4rem_2rem] bg-[#FFFCF6] p-6 shadow-2xl sm:p-8">
        <div className="sticky -top-6 z-10 flex items-center justify-between gap-4 bg-[#FFFCF6] pb-4 pt-1 sm:-top-8">
          <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Sempre à mão</p><h2 id="cook-ingredients-title" className="font-serif text-3xl font-black">Ingredientes</h2></div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full bg-[#F1ECE4] text-xl" aria-label="Fechar ingredientes">×</button>
        </div>
        <div className="mt-2">
          {groups.map((group, groupIndex) => (
            <Fragment key={`${group.name ?? "sem-grupo"}-${groupIndex}`}>
              {group.name ? <h3 className="mt-6 border-b border-[#DDD5C9] pb-2 font-serif text-xl font-black text-[#285240] first:mt-0">{group.name}</h3> : null}
              <ul>
                {group.ingredients.map((ingredient) => (
                  <li key={ingredient.id} className="border-b border-[#E7E0D6] last:border-b-0">
                    <label className="flex min-h-14 cursor-pointer items-center gap-3 py-3">
                      <input type="checkbox" checked={checked.has(ingredient.id)} onChange={() => toggle(ingredient.id)} className="size-5 accent-[#285240]" />
                      <span className={`flex-1 font-semibold ${checked.has(ingredient.id) ? "text-[#8A8278] line-through" : ""}`}>{ingredient.name}{ingredient.optional ? <span className="ml-2 text-xs font-normal text-[#817970]">opcional</span> : null}</span>
                      <strong className="text-sm text-[#285240]">{ingredientAmount(ingredient)}</strong>
                    </label>
                  </li>
                ))}
              </ul>
            </Fragment>
          ))}
        </div>
      </section>
    </div>
  );
}
