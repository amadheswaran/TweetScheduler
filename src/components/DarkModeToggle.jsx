import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const r = document.documentElement;
    if (dark) r.classList.add("dark");
    else r.classList.remove("dark");
  }, [dark]);

  return (
    <button
      onClick={() => setDark(v => !v)}
      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
      aria-label="Toggle dark mode"
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
