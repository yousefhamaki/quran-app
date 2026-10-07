import { Router } from 'express';

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: unknown[] };
}

export class RouterInspector {
  /** Lists "METHOD path (handlerCount)" for every route registered directly on the router. */
  static list(router: Router): string[] {
    return (router.stack as unknown as RouteLayer[])
      .filter((layer) => layer.route)
      .map((layer) => {
        const route = layer.route!;
        const method = Object.keys(route.methods)[0].toUpperCase();
        return `${method} ${route.path} (${route.stack.length})`;
      });
  }
}
