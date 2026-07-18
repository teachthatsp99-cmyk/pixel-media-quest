import type { ImgHTMLAttributes } from "react";

type StaticImageSource = Readonly<{ src: string }>;
type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> &
  Readonly<{
    src: string | StaticImageSource;
    unoptimized?: boolean;
  }>;

export default function StaticImage({
  src,
  unoptimized: _unoptimized,
  alt,
  ...props
}: ImageProps) {
  const resolvedSource = typeof src === "string" ? src : src.src;
  return <img src={resolvedSource} alt={alt ?? ""} {...props} />;
}
