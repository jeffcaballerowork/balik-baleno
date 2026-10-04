export interface IconPath {
  type: "path";
  d: string;
}

export interface IconCircle {
  type: "circle";
  cx: number;
  cy: number;
  r: number;
}

export interface IconRect {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

export type IconShape = IconPath | IconCircle | IconRect;

export const iconPaths = {
  arrow: [{ type: "path", d: "M5 12h14M13 6l6 6-6 6" }],
  arrowLeft: [{ type: "path", d: "M19 12H5m6 6-6-6 6-6" }],
  chevronLeft: [{ type: "path", d: "m15 18-6-6 6-6" }],
  chevronRight: [{ type: "path", d: "m9 18 6-6-6-6" }],
  plus: [{ type: "path", d: "M12 5v14M5 12h14" }],
  minus: [{ type: "path", d: "M5 12h14" }],
  close: [{ type: "path", d: "M18 6 6 18M6 6l12 12" }],
  menu: [{ type: "path", d: "M4 7h16M4 12h16M4 17h16" }],
  heart: [
    {
      type: "path",
      d: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
    },
  ],
  smile: [
    { type: "circle", cx: 12, cy: 12, r: 9 },
    { type: "path", d: "M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" },
  ],
  spark: [
    {
      type: "path",
      d: "m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2ZM19 18v4M17 20h4",
    },
  ],
  flag: [
    { type: "path", d: "M5 21V4m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0" },
  ],
  calendar: [
    { type: "rect", x: 3, y: 5, width: 18, height: 16, rx: 2 },
    { type: "path", d: "M7 3v4M17 3v4M3 10h18" },
  ],
  clock: [
    { type: "circle", cx: 12, cy: 12, r: 9 },
    { type: "path", d: "M12 7v5l3 2" },
  ],
  pin: [
    {
      type: "path",
      d: "m16 3 5 5-3 1-3 5-4 1-2 6-2-2 6-6 1-4 5-3 1-3ZM3 21l6-6",
    },
  ],
  image: [
    { type: "rect", x: 3, y: 3, width: 18, height: 18, rx: 2 },
    { type: "circle", cx: 8, cy: 8, r: 1 },
    { type: "path", d: "m21 16-5-5L5 21" },
  ],
  pen: [
    {
      type: "path",
      d: "m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z",
    },
  ],
  upload: [
    { type: "path", d: "M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4" },
  ],
  hand: [
    {
      type: "path",
      d: "M8 13V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 4-2.5 6-6 6h-3c-2 0-3-1-4-2l-4-5a2 2 0 0 1 3-3l2 2Z",
    },
  ],
  check: [{ type: "path", d: "m4 12 5 5L20 6" }],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof iconPaths;
