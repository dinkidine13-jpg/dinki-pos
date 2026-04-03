import { Lock, UtensilsCrossed } from "lucide-react";
import { useState } from "react";

const ADMIN_SESSION_KEY = "dinki_admin_session";
const ADMIN_PIN = "1234";

export function useAdminSession() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function AdminPinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(ADMIN_SESSION_KEY) === "1",
  );
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleDigit(d: string) {
    setError(false);
    const next = [...digits, d];
    if (next.length === 4) {
      const pin = next.join("");
      if (pin === ADMIN_PIN) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        setUnlocked(true);
      } else {
        setShake(true);
        setError(true);
        setTimeout(() => {
          setDigits([]);
          setShake(false);
        }, 600);
      }
    } else {
      setDigits(next);
    }
  }

  function handleDelete() {
    setError(false);
    setDigits((d) => d.slice(0, -1));
  }

  if (unlocked) return <>{children}</>;

  type KeyEntry = {
    label: string;
    action: "digit" | "delete" | "empty";
    value?: string;
  };
  const keys: KeyEntry[] = [
    { label: "1", action: "digit", value: "1" },
    { label: "2", action: "digit", value: "2" },
    { label: "3", action: "digit", value: "3" },
    { label: "4", action: "digit", value: "4" },
    { label: "5", action: "digit", value: "5" },
    { label: "6", action: "digit", value: "6" },
    { label: "7", action: "digit", value: "7" },
    { label: "8", action: "digit", value: "8" },
    { label: "9", action: "digit", value: "9" },
    { label: "", action: "empty" },
    { label: "0", action: "digit", value: "0" },
    { label: "⌫", action: "delete" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mb-3">
          <UtensilsCrossed className="w-8 h-8 text-orange-400" />
        </div>
        <h1 className="text-white text-2xl font-bold tracking-wide">
          Dinki Pos
        </h1>
        <p className="text-gray-400 text-sm mt-1">Staff Login</p>
      </div>

      {/* PIN dots */}
      <div
        className={`flex gap-4 mb-6 ${shake ? "animate-[shake_0.5s_ease]" : ""}`}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={`dot-${i}`}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              digits.length > i
                ? error
                  ? "bg-red-500 border-red-500"
                  : "bg-orange-400 border-orange-400"
                : "border-gray-600 bg-transparent"
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4 -mt-2">Incorrect PIN</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {keys.map((k) =>
          k.action === "empty" ? (
            <div key="empty" />
          ) : k.action === "delete" ? (
            <button
              key="delete"
              type="button"
              onClick={handleDelete}
              className="h-14 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xl flex items-center justify-center hover:bg-gray-700 active:scale-95 transition-all"
            >
              ⌫
            </button>
          ) : (
            <button
              key={`key-${k.value}`}
              type="button"
              onClick={() => handleDigit(k.value!)}
              className="h-14 rounded-xl bg-gray-800 border border-gray-700 text-white text-xl font-semibold flex items-center justify-center hover:bg-gray-700 active:scale-95 transition-all"
            >
              {k.label}
            </button>
          ),
        )}
      </div>

      <div className="mt-8 flex items-center gap-2 text-gray-600 text-xs">
        <Lock className="w-3 h-3" />
        <span>Secure staff access</span>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
