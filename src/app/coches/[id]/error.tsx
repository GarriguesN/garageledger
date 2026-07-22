"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertTriangle size={48} className="text-red-500" />
      <h2 className="text-lg font-bold">Algo salió mal</h2>
      <p className="text-sm text-[var(--text-secondary)] text-center max-w-md">
        {error.message || "Ha ocurrido un error inesperado"}
      </p>
      <button className="btn btn-primary" onClick={() => reset()}>
        <RefreshCw size={16} /> Intentar de nuevo
      </button>
    </div>
  );
}
