import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { useSettings } from '@/context/settings';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

const textVariants = cva(
  cn(
    'text-foreground text-base',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'text-center text-4xl font-extrabold tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' })
        ),
        h2: cn(
          'border-border border-b pb-2 text-3xl font-semibold tracking-tight',
          Platform.select({ web: 'scroll-m-20 first:mt-0' })
        ),
        h3: cn('text-2xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        h4: cn('text-xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        p: 'mt-3 leading-7 sm:mt-6',
        blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
        code: cn(
          'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
        ),
        lead: 'text-muted-foreground text-xl',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-none',
        muted: 'text-muted-foreground text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

/**
 * React Native needs a specific font *file* per weight (font-medium alone does nothing for custom fonts),
 * so map the weight utilities onto the loaded families: Inter for English, Noto Sans Arabic for Arabic.
 * Elements that already choose a family (font-quran, font-display, font-naskh) are left alone.
 */
const FAMILY_CLASSES = new Set([
  'font-quran', 'font-display', 'font-naskh',
  'font-arabic', 'font-arabic-medium', 'font-arabic-semibold',
  'font-sans', 'font-sans-medium', 'font-sans-semibold',
]);
const WEIGHT_CLASSES = new Set(['font-extrabold', 'font-bold', 'font-semibold', 'font-medium', 'font-normal']);

function withFontFamily(classes: string, isRTL: boolean) {
  const tokens = classes.split(/\s+/).filter(Boolean);
  const weights = tokens.filter(token => WEIGHT_CLASSES.has(token));
  const rest = tokens.filter(token => !WEIGHT_CLASSES.has(token));
  // Already picked a family (font-quran, font-display, ...): keep it and drop the weight utilities,
  // which do nothing for custom font files.
  if (rest.some(token => FAMILY_CLASSES.has(token))) return rest.join(' ');
  const semibold = weights.some(w => w === 'font-extrabold' || w === 'font-bold' || w === 'font-semibold');
  const base = isRTL ? 'font-arabic' : 'font-sans';
  return [...rest, semibold ? `${base}-semibold` : weights.includes('font-medium') ? `${base}-medium` : base].join(' ');
}

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const { isRTL } = useSettings();
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={withFontFamily(cn(textVariants({ variant }), textClass, className), isRTL)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext };
