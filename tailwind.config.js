module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './modules/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: Object.fromEntries(['background', 'foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive', 'destructive-foreground', 'border', 'input', 'ring'].map(name => [name, `hsl(var(--${name}) / <alpha-value>)`])) } },
  plugins: [],
}
