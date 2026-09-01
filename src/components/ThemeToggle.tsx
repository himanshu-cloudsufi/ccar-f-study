import { useSyncExternalStore } from "react"
import { Laptop, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cycleTheme, getTheme, subscribeTheme, type Theme } from "@/lib/theme"

const labels: Record<Theme, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
}

const icons: Record<Theme, typeof Sun> = {
  system: Laptop,
  light: Sun,
  dark: Moon,
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    getTheme,
    () => "system"
  )
  const Icon = icons[theme]

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={`${labels[theme]} — click to change`}
      title={`${labels[theme]} (click to cycle system → light → dark)`}
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}
