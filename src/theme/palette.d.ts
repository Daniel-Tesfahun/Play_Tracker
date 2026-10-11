export type ColorScheme = 'light' | 'dark';

export interface Palette {
  readonly canvas: string;
  readonly surface: string;
  readonly elevated: string;
  readonly line: string;
  readonly lineStrong: string;
  readonly ink: string;
  readonly muted: string;
  readonly faint: string;
  readonly brand: string;
  readonly brandInk: string;
  readonly brandDim: string;
  readonly scoot: string;
  readonly scootDim: string;
  readonly neon: string;
  readonly neonDim: string;
  readonly amber: string;
  readonly amberDim: string;
  readonly danger: string;
  readonly dangerDim: string;
  readonly idle: string;
  readonly onAccent: string;
}

export type GradientStops = readonly [string, string];

export declare const themes: Record<ColorScheme, Palette>;
export declare const gradients: Record<ColorScheme, { zones: GradientStops; scooters: GradientStops }>;
export declare const playerColors: Record<ColorScheme, readonly string[]>;
export declare const tokens: (keyof Palette)[];
export declare function hexToChannels(hex: string): string;
export declare function cssVariables(scheme: ColorScheme): Record<`--color-${string}`, string>;
export declare const tailwindColors: Record<keyof Palette, string>;
