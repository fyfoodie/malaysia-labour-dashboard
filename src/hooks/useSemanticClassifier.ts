import { useEffect, useRef, useState, useCallback } from "react";
import type { RawArticle, ClassifiedArticle } from "@/workers/embedder.worker";

export type ClassifierStatus =
  | "idle"
  | "loading-model"
  | "ready"
  | "classifying"
  | "error";

interface UseSemanticClassifierReturn {
  status:     ClassifierStatus;
  modelReady: boolean;
  progress:   number;             // 0–100 download progress
  classify:   (articles: RawArticle[], threshold?: number) => Promise<ClassifiedArticle[]>;
  error:      string | null;
}

export function useSemanticClassifier(): UseSemanticClassifierReturn {
  const workerRef                   = useRef<Worker | null>(null);
  const [status, setStatus]         = useState<ClassifierStatus>("idle");
  const [progress, setProgress]     = useState(0);
  const [error, setError]           = useState<string | null>(null);

  // Pending classify callbacks — resolved when worker responds
  const pendingRef = useRef<{
    resolve: (articles: ClassifiedArticle[]) => void;
    reject:  (err: Error) => void;
  } | null>(null);

  useEffect(() => {
    // Spawn worker
    const worker = new Worker(
      new URL("../workers/embedder.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case "loading":
          setStatus("loading-model");
          setProgress(0);
          break;

        case "progress":
          setProgress(msg.progress);
          break;

        case "ready":
          setStatus("ready");
          setProgress(100);
          break;

        case "result":
          setStatus("ready");
          if (pendingRef.current) {
            pendingRef.current.resolve(msg.articles);
            pendingRef.current = null;
          }
          break;

        case "error":
          setStatus("error");
          setError(msg.message);
          if (pendingRef.current) {
            pendingRef.current.reject(new Error(msg.message));
            pendingRef.current = null;
          }
          break;
      }
    };

    worker.onerror = (e) => {
      setStatus("error");
      setError(e.message);
    };

    // Warm up model immediately on mount — starts download in background
    // so it's ready by the time user sees the news section
    setStatus("loading-model");
    worker.postMessage({ type: "warmup" });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const classify = useCallback(
    (articles: RawArticle[], threshold = 0.25): Promise<ClassifiedArticle[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error("Worker not initialized"));
          return;
        }

        // If model errored, resolve with empty — caller handles fallback
        if (status === "error") {
          resolve([]);
          return;
        }

        pendingRef.current = { resolve, reject };
        setStatus("classifying");

        workerRef.current.postMessage({
          type:      "classify",
          articles,
          threshold,
        });
      });
    },
    [status]
  );

  return {
    status,
    modelReady: status === "ready",
    progress,
    classify,
    error,
  };
}