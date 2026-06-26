import { Icon } from "@/components/Icons";

export default function Loading() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
      <div className="row soft">
        <span className="spin">
          <Icon.refresh size={22} />
        </span>{" "}
        Chargement…
      </div>
    </div>
  );
}
