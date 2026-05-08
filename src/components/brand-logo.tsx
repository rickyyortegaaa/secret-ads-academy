import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

export function BrandLogo({
  size = 96,
  showWordmark = true,
  className,
}: BrandLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <Image
        src="/logo.svg"
        alt="Secret Ads Academy"
        width={size}
        height={size}
        priority
      />
      {showWordmark ? (
        <div className="text-center leading-tight">
          <div className="text-2xl font-semibold tracking-tight text-foreground">
            Secret Ads
          </div>
          <div className="brand-text-gradient text-sm font-medium tracking-[0.35em] uppercase">
            Academy
          </div>
        </div>
      ) : null}
    </div>
  );
}
