// The real root layout (<html>, <body>, fonts, header, footer) is
// app/[locale]/layout.tsx. This pass-through only exists so that
// app/not-found.tsx has a layout above it.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return children;
}
