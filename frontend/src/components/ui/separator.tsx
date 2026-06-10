import { cn } from "@/utils/cn";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return (
    <div
      className={cn(
        "bg-zinc-200 shrink-0",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  );
}