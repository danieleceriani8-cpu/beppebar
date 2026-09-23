import Image from "next/image";

export default function Logo({ size = 58 }: { size?: number }) {
  return (
    <Image
      src="/beppe-logo.png"
      alt="Beppe Bar"
      width={size}
      height={size}
      priority
      style={{ borderRadius: "50%" }}
    />
  );
}
