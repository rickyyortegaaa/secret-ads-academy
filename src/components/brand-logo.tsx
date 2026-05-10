import Image from "next/image";

type BrandLogoProps = {
  /** Total height in px. */
  size?: number;
  /**
   * If true, shows the full lockup (mariposa + "Secret Ads · ACADEMY").
   * If false, clips to show only the butterfly (better for small headers).
   */
  showWordmark?: boolean;
  className?: string;
};

// El logo está a 1070x1070. La mariposa ocupa aproximadamente
// el tramo vertical 16% → 60% del alto. Al clipear para "solo mariposa"
// dejamos visible aprox top-58% del archivo.
const BUTTERFLY_RATIO = 0.58;

export function BrandLogo({
  size = 96,
  showWordmark = true,
  className,
}: BrandLogoProps) {
  const containerHeight = showWordmark
    ? size
    : Math.round(size * BUTTERFLY_RATIO);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: containerHeight,
        overflow: "hidden",
      }}
    >
      <Image
        src="/logo.png"
        alt="Secret Ads Academy"
        width={size}
        height={size}
        priority
        // El natural del JPG es cuadrado; el contenedor clipea el wordmark
        // cuando showWordmark=false.
        style={{
          display: "block",
          width: size,
          height: size,
        }}
      />
    </div>
  );
}
