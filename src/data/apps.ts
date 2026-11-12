import type { ImageMetadata } from "astro";

const icons = import.meta.glob<{ default: ImageMetadata }>("../assets/icons/*.png", { eager: true });

export function icon(name: string): ImageMetadata {
  const mod = icons[`../assets/icons/${name}.png`];
  if (!mod) throw new Error(`No icon named ${name}`);
  return mod.default;
}

