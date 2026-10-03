"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type Theme = "light" | "dark" | "system";
const ThemeContext = createContext<{ theme: Theme; setTheme: (theme: Theme) => void }>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("makerspace-theme");
      if (stored === "light" || stored === "dark" || stored === "system") setThemeState(stored);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme, ready]);

  const setTheme = (value: Theme) => {
    setThemeState(value);
    try { localStorage.setItem("makerspace-theme", value); } catch {}
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change appearance">
          <Sun className="dark:hidden" /><Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
          <DropdownMenuRadioItem value="light"><Sun className="mr-2 size-4" />Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="mr-2 size-4" />Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Monitor className="mr-2 size-4" />System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppearanceSettings() {
  const { theme, setTheme } = useContext(ThemeContext);
  return (
    <fieldset className="space-y-4">
      <legend className="text-lg font-semibold">Appearance</legend>
      <p className="text-sm text-muted-foreground">Choose a theme, or follow your device. Your preference is saved on this browser.</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as const).map(([value, Icon, label]) => (
          <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-4 has-[:checked]:border-primary has-[:checked]:bg-accent">
            <input type="radio" name="appearance" value={value} checked={theme === value} onChange={() => setTheme(value)} className="size-4 accent-primary" />
            <Icon className="size-5" /><span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
