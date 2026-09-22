import { MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "motion/react";

export function ShaderBackdrop() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="shader-backdrop" aria-hidden="true">
      <MeshGradient
        colors={["#070a12", "#171248", "#6f55ff", "#0b706f"]}
        distortion={0.72}
        swirl={0.42}
        speed={reduceMotion ? 0 : 0.12}
        style={{ width: "100%", height: "100%" }}
      />
      <div className="shader-backdrop__veil" />
      <div className="shader-backdrop__grain" />
    </div>
  );
}
