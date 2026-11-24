import logoDark from "../assets/brand/yamaha-logo-dark.png";
import logoInverse from "../assets/brand/yamaha-logo-inverse.png";
import logoLight from "../assets/brand/yamaha-logo-light.png";
import { cx } from "../lib/cx";

/** Medidas reales de los PNG (253×88): `width`/`height` evitan saltos de diseño al cargar. */
const LOGO_WIDTH = 253;
const LOGO_HEIGHT = 88;

interface BrandLogoProps {
  /** `inverse`: textos blancos para el panel de marca azul (P6), en ambos temas. */
  variant?: "default" | "inverse";
  /** Alto (`h-8`, `h-10`, `h-12`); el ancho sigue la proporción. */
  className?: string;
}

/**
 * Logo oficial de Yamaha (spec de rediseño, 3.8): lema negro en tema claro y blanco en oscuro, según el sistema
 * (`<picture>` + `prefers-color-scheme`, sin JavaScript). Reemplaza el texto "YAMAHA" (Anexo A: `alt` "Yamaha").
 */
export function BrandLogo({ variant = "default", className }: BrandLogoProps) {
  const imgClasses = cx("w-auto", className);
  if (variant === "inverse") {
    return <img src={logoInverse} alt="Yamaha" width={LOGO_WIDTH} height={LOGO_HEIGHT} className={imgClasses} />;
  }
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={logoDark} />
      <img src={logoLight} alt="Yamaha" width={LOGO_WIDTH} height={LOGO_HEIGHT} className={imgClasses} />
    </picture>
  );
}
