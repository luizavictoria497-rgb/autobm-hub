import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes Tailwind de forma segura (evita conflitos). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}