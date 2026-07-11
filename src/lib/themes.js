// Each theme is a flat set of CSS custom properties applied to :root.
export const THEMES = [
  {
    id: 'ember-study',
    name: 'Ember Study',
    dark: true,
    vars: {
      '--bg': '#1c1917', '--bg-2': '#232020', '--bg-3': '#2c2827',
      '--line': '#3b3533', '--line-2': '#4a4240',
      '--ink': '#ece5dc', '--ink-2': '#a89e93', '--ink-3': '#756c63',
      '--clay': '#d8a48f', '--sage': '#a3b18a', '--wheat': '#e3c391',
      '--blue': '#7fb3e3', '--brick': '#c98d84',
      '--on-clay': '#241a15', '--on-sage': '#1e2418',
      '--scrollbar': '#e8e4de',
    },
  },
  {
    id: 'midnight-oil',
    name: 'Midnight Oil',
    dark: true,
    vars: {
      '--bg': '#0f1621', '--bg-2': '#151d2b', '--bg-3': '#1d2738',
      '--line': '#2b3a4a', '--line-2': '#3a4a63',
      '--ink': '#e2e9f3', '--ink-2': '#94a3b8', '--ink-3': '#64748b',
      '--clay': '#7dd3fc', '--sage': '#5eead4', '--wheat': '#fcd34d',
      '--blue': '#818cf8', '--brick': '#fb7185',
      '--on-clay': '#0b1620', '--on-sage': '#04201c',
      '--scrollbar': '#cbd5e1',
    },
  },
  {
    id: 'moss-cathedral',
    name: 'Moss Cathedral',
    dark: true,
    vars: {
      '--bg': '#141a15', '--bg-2': '#1a221b', '--bg-3': '#232d24',
      '--line': '#31402f', '--line-2': '#41533e',
      '--ink': '#e6ece0', '--ink-2': '#a3b09b', '--ink-3': '#71806c',
      '--clay': '#b5d99c', '--sage': '#d9c58c', '--wheat': '#e0b07c',
      '--blue': '#8fc8c0', '--brick': '#d99a8f',
      '--on-clay': '#16210f', '--on-sage': '#211b0c',
      '--scrollbar': '#dfe7d8',
    },
  },
  {
    // Deliberately mid-tone: warm grey chassis, not dark, not white.
    id: 'foggy-desk',
    name: 'Foggy Desk',
    dark: false,
    vars: {
      '--bg': '#8f8a84', '--bg-2': '#9d9892', '--bg-3': '#aaa59f',
      '--line': '#7d7871', '--line-2': '#6b665f',
      '--ink': '#1f1d1a', '--ink-2': '#403c37', '--ink-3': '#5d5850',
      '--clay': '#7c3f22', '--sage': '#3d5c33', '--wheat': '#8a6412',
      '--blue': '#27496d', '--brick': '#8e2f26',
      '--on-clay': '#f6ece6', '--on-sage': '#eef3ea',
      '--scrollbar': '#5d5850',
    },
  },
  {
    id: 'paper-cut',
    name: 'Paper Cut',
    dark: false,
    vars: {
      '--bg': '#faf9f6', '--bg-2': '#f2f0ea', '--bg-3': '#e8e5dc',
      '--line': '#d8d3c7', '--line-2': '#bfb8a8',
      '--ink': '#2a2723', '--ink-2': '#5f584e', '--ink-3': '#8d857a',
      '--clay': '#b5603f', '--sage': '#5c7a4a', '--wheat': '#a97d2c',
      '--blue': '#37628f', '--brick': '#a8443c',
      '--on-clay': '#fdf6f2', '--on-sage': '#f4f8f0',
      '--scrollbar': '#9a9184',
    },
  },
  {
    // The "fully official" one: corporate, neutral, no personality by design.
    id: 'letterhead',
    name: 'Letterhead',
    dark: false,
    vars: {
      '--bg': '#ffffff', '--bg-2': '#f7f8f9', '--bg-3': '#eef0f2',
      '--line': '#dcdfe3', '--line-2': '#c2c7cd',
      '--ink': '#1a1d21', '--ink-2': '#565c63', '--ink-3': '#8a9199',
      '--clay': '#1f4e79', '--sage': '#2e6b4f', '--wheat': '#8a6d1f',
      '--blue': '#2b5fa8', '--brick': '#a32b2b',
      '--on-clay': '#ffffff', '--on-sage': '#ffffff',
      '--scrollbar': '#a8aeb5',
    },
  },
]

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Yellow', css: 'rgba(250, 204, 21, .42)' },
  { id: 'blue',   name: 'Blue',   css: 'rgba(90, 150, 230, .36)' },
  { id: 'green',  name: 'Green',  css: 'rgba(74, 200, 140, .36)' },
  { id: 'pink',   name: 'Pink',   css: 'rgba(240, 120, 180, .36)' },
  { id: 'orange', name: 'Orange', css: 'rgba(250, 140, 60, .38)' },
]

export function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0]
  const r = document.documentElement
  for (const [k, v] of Object.entries(t.vars)) r.style.setProperty(k, v)
  r.dataset.theme = t.id
  r.dataset.mode = t.dark ? 'dark' : 'light'
  return t
}
