import { useCallback, useEffect, useState } from "react";
import type { MenuActor, MenuItem } from "../types/menu";
import { useActor } from "./useActor";

export function useMenu() {
  const { actor, isFetching } = useActor();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoaded, setMenuLoaded] = useState(false);

  const reloadMenu = useCallback(async () => {
    if (!actor) return;
    try {
      const items = await (actor as unknown as MenuActor).getMenuItems();
      setMenuItems(items);
      setMenuLoaded(true);
    } catch (_e) {
      // silently fail — NewOrderModal falls back to hardcoded items
      setMenuLoaded(true);
    }
  }, [actor]);

  useEffect(() => {
    if (!actor || isFetching) return;
    const init = async () => {
      try {
        await (actor as unknown as MenuActor).initMenu();
      } catch (_e) {
        // already initialized or error — proceed to load
      }
      await reloadMenu();
    };
    init();
  }, [actor, isFetching, reloadMenu]);

  return { menuItems, menuLoaded, reloadMenu };
}
