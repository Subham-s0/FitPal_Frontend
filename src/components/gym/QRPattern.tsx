import type { FC } from "react";

const PATTERN = [1,0,1,0,1,1,0,1,0,1,0,1,0,1,1,0,1,1,0,0,1,0,1,1,0,0,1,1,0,1,0,1,1,0,0,1,1,0,1,0,0,1,1,0,0,1,0,1,1,0,1,1,0,0,1,0,0,1,0,0,1,1,0,1];

const QRPattern: FC = () => (
  <div className="grid grid-cols-8 gap-0.5" style={{ width: 104 }}>
    {PATTERN.map((v, i) => (
      <div
        key={i}
        className="aspect-square rounded-[1px]"
        style={{ background: v ? "rgba(249,115,22,0.85)" : "transparent" }}
      />
    ))}
  </div>
);

export default QRPattern;
