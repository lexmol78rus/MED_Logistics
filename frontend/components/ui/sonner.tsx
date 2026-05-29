import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const toastStyle = {
  "--normal-bg": "#e8f4fc",
  "--normal-text": "#0f172a",
  "--normal-border": "#93c5fd",
  "--border-radius": "var(--radius)",
} as React.CSSProperties

const Toaster = ({
  theme = "light",
  position = "top-center",
  offset = 52,
  style,
  ...props
}: ToasterProps) => {
  return (
    <Sonner
      theme={theme}
      position={position}
      offset={offset}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={{ ...toastStyle, ...style }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
