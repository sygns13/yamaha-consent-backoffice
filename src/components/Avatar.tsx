import { initials } from "../lib/format";

/**
 * Iniciales del usuario en un círculo (spec de rediseño, 4.21). Decorativo (`aria-hidden`): el nombre completo va en
 * texto junto al avatar.
 */
export function Avatar({ person }: { person: { firstNames: string; lastNames: string } }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-text"
    >
      {initials(person)}
    </span>
  );
}
