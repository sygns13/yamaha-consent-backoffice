import { useEffect, useRef, useState } from "react";
import { TextField } from "./TextField";

/** Espera desde la última tecla antes de buscar (sección 8.6). */
export const SEARCH_DEBOUNCE_MS = 300;
/** `q` de la API: máximo 100 caracteres (sección 6.1). */
const SEARCH_MAX_LENGTH = 100;

interface SearchFieldProps {
  label: string;
  /** Búsqueda vigente (la de la URL). */
  value: string;
  /** Se llama con el texto sin espacios en los extremos, 300 ms después de la última tecla. */
  onSearch: (value: string) => void;
}

/**
 * Búsqueda con *debounce*. El texto escrito vive aquí; la búsqueda vigente, en la URL. Si la URL cambia por otra vía
 * ("Atrás"), el campo muestra el valor nuevo.
 */
export function SearchField({ label, value, onSearch }: SearchFieldProps) {
  const [text, setText] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const onSearchRef = useRef(onSearch);

  // Valor derivado de la URL: se ajusta durante el render (patrón de React para estado derivado).
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== text.trim()) setText(value);
  }

  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === value) return;
    const timer = setTimeout(() => onSearchRef.current(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value]);

  return (
    <TextField
      type="search"
      label={label}
      value={text}
      maxLength={SEARCH_MAX_LENGTH}
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => setText(event.target.value)}
    />
  );
}
