import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combine Tailwind class names, later ones win. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
