"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 18v2h14v-2" />
    </svg>
  );
}

export default function PwaInstallAction() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installedByEvent, setInstalledByEvent] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const browserReady = useSyncExternalStore(() => () => undefined, () => true, () => false);
  const isIos = browserReady && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const detectedStandalone = browserReady && (
    window.matchMedia("(display-mode: standalone)").matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
  const isInstalled = !browserReady || installedByEvent || detectedStandalone;

  useEffect(() => {
    function rememberPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }

    function markInstalled() {
      setPromptEvent(null);
      setInstalledByEvent(true);
    }

    window.addEventListener("beforeinstallprompt", rememberPrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", rememberPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  if (isInstalled || (!promptEvent && !isIos)) return null;

  async function install() {
    if (!promptEvent) {
      setShowIosHelp(true);
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalledByEvent(true);
    setPromptEvent(null);
  }

  return (
    <>
      <button type="button" onClick={() => void install()} className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]">
        <span className="grid size-10 place-items-center rounded-[48%_52%_60%_40%] bg-[#FFF1D2]"><InstallIcon /></span>
        <span className="flex-1">Instalar Cookbook</span>
        <span aria-hidden>→</span>
      </button>

      {showIosHelp ? (
        <div className="fixed inset-0 z-[70] grid place-items-end bg-[#27231F]/38 p-3 backdrop-blur-[2px] sm:place-items-center" role="presentation" onMouseDown={() => setShowIosHelp(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-help-title" onMouseDown={(event) => event.stopPropagation()} className="safe-bottom w-full max-w-md rounded-[2.2rem_2.2rem_3.8rem_2.2rem] bg-[#FFFCF6] p-6 shadow-2xl sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">No iPhone ou iPad</p>
            <h2 id="install-help-title" className="mt-2 font-serif text-3xl font-black">Levar o Cookbook para o ecrã principal</h2>
            <ol className="mt-5 space-y-3 text-sm leading-6 text-[#625B53]">
              <li><strong>1.</strong> Abre esta página no Safari.</li>
              <li><strong>2.</strong> Toca em <strong>Partilhar</strong>.</li>
              <li><strong>3.</strong> Escolhe <strong>Adicionar ao ecrã principal</strong>.</li>
            </ol>
            <button type="button" onClick={() => setShowIosHelp(false)} className="mt-7 min-h-12 w-full rounded-full bg-[#285240] px-5 text-sm font-extrabold text-white shadow-[0_4px_0_#17382A]">Percebi</button>
          </section>
        </div>
      ) : null}
    </>
  );
}
