import {
  Castle,
  DoorOpen,
  Home,
  Landmark,
  Link2,
  MapPin,
  Mountain,
  Store,
  Warehouse,
} from "lucide-react";
import { createElement } from "react";

export function LocationIcon({
  className,
  locationType,
}: {
  className: string;
  locationType?: string;
}) {
  return createElement(iconForLocation(locationType ?? "custom"), { className });
}

function iconForLocation(locationType: string) {
  switch (locationType) {
    case "region":
    case "wilderness":
      return Mountain;
    case "settlement":
    case "district":
    case "street":
      return Castle;
    case "shop":
      return Store;
    case "house":
      return Home;
    case "dungeon":
      return Landmark;
    case "floor":
    case "room":
      return DoorOpen;
    case "landmark":
      return MapPin;
    case "portal":
      return Link2;
    default:
      return Warehouse;
  }
}
