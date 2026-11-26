import logoDark from "../assets/brand/yamaha-logo-dark.png";
import logoInverse from "../assets/brand/yamaha-logo-inverse.png";
import logoLight from "../assets/brand/yamaha-logo-light.png";
import { cx } from "../lib/cx";
import { useTheme } from "../lib/theme";

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
 * Logo oficial de Yamaha (spec de rediseño, 3.8): lema negro en tema claro y blanco en oscuro, según el tema aplicado
 * (v1.3: el del sistema o el elegido con el botón de la cabecera; se descarga solo el del tema). Reemplaza el texto
 * "YAMAHA" (Anexo A: `alt` "Yamaha").
 */
export function BrandLogo({ variant = "default", className }: BrandLogoProps) {
  const theme = useTheme();
  const src = variant === "inverse" ? logoInverse : theme === "dark" ? logoDark : logoLight;
  return <img src={src} alt="Yamaha" width={LOGO_WIDTH} height={LOGO_HEIGHT} className={cx("w-auto", className)} />;
}
