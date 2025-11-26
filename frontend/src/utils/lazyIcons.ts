import { ComponentType, LazyExoticComponent, lazy } from "react";

export function lazyIcon<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(importFn);
}
