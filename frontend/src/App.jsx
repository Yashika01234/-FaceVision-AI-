import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api/client";
import DetectPanel from "./components/DetectPanel";
import { DEFAULT_SETTINGS } from "./components/DetectionSettings";
import ErrorBanner from "./components/ErrorBanner";
import HistoryPanel from "./components/HistoryPanel";
import Sidebar from "./components/Sidebar";
import StatsStrip from "./components/StatsStrip";
import WebcamPanel from "./components/WebcamPanel";

const HEADINGS = {
  detect: ["Detect faces in a photo", "Upload a picture and FaceVision outlines every face it finds."],
  live: ["Live camera", "Faces are detected in real time from your webcam."],
  history: ["Recent detections", "Your latest scans are stored locally so you can reopen or download them."],
};

export default function App() {
  const [tab, setTab] = useState("detect");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [online, setOnline] = useState(null);
  const [notice, setNotice] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const noticeTimer = useRef(null);

  const notify = useCallback((message) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([api.stats(), api.history(50)]);
      setStats(s);
      setHistory(h.items);
      setHistoryError(null);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Check the backend now and every 10 seconds.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        await api.health();
        if (alive) setOnline((was) => { if (was === false) refresh(); return true; });
      } catch {
        if (alive) setOnline(false);
      }
    };
    check();
    refresh();
    const id = setInterval(check, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [refresh]);

  function openInViewer(item) {
    setResult(item);
    setTab("detect");
    window.scrollTo({ top: 0 });
  }

  async function deleteItem(item) {
    try {
      await api.deleteItem(item.id);
      if (result?.id === item.id) setResult(null);
      notify("Detection deleted");
      refresh();
    } catch (err) {
      setHistoryError(err.message);
    }
  }

  async function clearAll() {
    if (!window.confirm("Delete all saved detections and their images? This can't be undone.")) return;
    try {
      await api.clearHistory();
      setResult(null);
      notify("History cleared");
      refresh();
    } catch (err) {
      setHistoryError(err.message);
    }
  }

  const [title, subtitle] = HEADINGS[tab];

  return (
    <div className="min-h-screen">
      <Sidebar tab={tab} onTabChange={setTab} online={online} />

      <main className="px-4 pb-24 pt-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-[1280px] space-y-6">
          <header>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            <p className="mt-1 text-muted">{subtitle}</p>
          </header>

          {online === false && (
            <ErrorBanner
              title="The server isn't responding"
              message="Start the backend with “python app.py” inside the backend folder. This page reconnects automatically."
            />
          )}

          <StatsStrip stats={stats} />

          {/* The photo tab stays mounted so its result survives tab switches. */}
          <div hidden={tab !== "detect"}>
            <DetectPanel
              settings={settings}
              onSettingsChange={setSettings}
              result={result}
              onResult={setResult}
              onSaved={refresh}
            />
          </div>

          {/* The camera tab unmounts so the webcam is released when you leave. */}
          {tab === "live" && (
            <WebcamPanel
              settings={settings}
              onSettingsChange={setSettings}
              onSaved={refresh}
              onOpenResult={openInViewer}
            />
          )}

          {tab === "history" && (
            <>
              <ErrorBanner title="Couldn't update history" message={historyError} onDismiss={() => setHistoryError(null)} />
              <HistoryPanel
                items={history}
                loading={historyLoading}
                onOpen={openInViewer}
                onDelete={deleteItem}
                onClear={clearAll}
                onGoUpload={() => setTab("detect")}
              />
            </>
          )}
        </div>
      </main>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center lg:bottom-8">
        {notice && <p className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-semibold shadow-lg">{notice}</p>}
      </div>
    </div>
  );
}
