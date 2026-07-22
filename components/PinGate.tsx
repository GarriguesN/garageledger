"use client"; // PinGate needs interactivity

import { useState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { DEFAULT_PIN } from "@/lib/constants";

interface PinGateProps {
  children: React.ReactNode;
}

export default function PinGate({ children }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [correctPin, setCorrectPin] = useState(DEFAULT_PIN);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load saved PIN from server
    fetch("/api/settings?key=pin")
      .then((r) => r.json())
      .then((d) => {
        if (d.value) setCorrectPin(d.value);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loaded]);

  useEffect(() => {
    if (pin.length === correctPin.length) {
      if (pin === correctPin) {
        sessionStorage.setItem("garageledger_auth", "1");
        setError(false);
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
          inputRef.current?.focus();
        }, 600);
      }
    }
  }, [pin, correctPin]);

  if (!loaded) return null;

  if (sessionStorage.getItem("garageledger_auth") === "1") {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ background: "var(--ngl-bg)" }}>
      <div className="flex flex-col items-center gap-6 px-4 max-w-xs w-full">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(195, 66, 63, 0.1)" }}
        >
          <Lock size={32} style={{ color: "var(--ngl-accent)" }} />
        </div>
        <h1 className="headline text-center">GarageLedger</h1>
        <p className="body-sm" style={{ color: "var(--ngl-ink-secondary)" }}>
          Introduce tu código PIN
        </p>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length <= 10) {
              setPin(v);
              setError(false);
            }
          }}
          className="input text-center text-2xl tracking-widest"
          style={{
            padding: "0.75rem 1rem",
            fontSize: "1.5rem",
            letterSpacing: "0.5em",
            borderColor: error ? "var(--ngl-accent)" : undefined,
            maxWidth: "12rem",
          }}
          placeholder="····"
        />
        {error && (
          <p className="caption" style={{ color: "var(--ngl-accent)" }}>
            PIN incorrecto
          </p>
        )}
      </div>
    </div>
  );
}
