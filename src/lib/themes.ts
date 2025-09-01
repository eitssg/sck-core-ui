export type ThemeConfig = {
  name: string;
  displayName: string;
  description: string;
  colors: Record<string, string>;
  isDark: boolean;
};

export const themes: Record<string, ThemeConfig> = {
  // Light theme for Infrastructure Teams
  'vercel-light': {
    name: 'vercel-light',
    displayName: 'Vercel Light',
    description: 'Clean, minimal theme perfect for infrastructure monitoring',
    isDark: false,
    colors: {
      '--background': '0 0% 100%',
      '--foreground': '240 10% 3.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '240 10% 3.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '240 10% 3.9%',
      '--primary': '240 5.9% 10%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '240 4.8% 95.9%',
      '--secondary-foreground': '240 5.9% 10%',
      '--muted': '240 4.8% 95.9%',
      '--muted-foreground': '240 3.8% 46.1%',
      '--accent': '240 4.8% 95.9%',
      '--accent-foreground': '240 5.9% 10%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '240 5.9% 90%',
      '--input': '240 5.9% 90%',
      '--ring': '240 5.9% 10%',
      '--radius': '0.5rem',
      // Dashboard specific
      '--dashboard-bg': '0 0% 98%',
      '--dashboard-header': '0 0% 100%',
      '--dashboard-sidebar': '240 4.8% 95.9%',
      '--shadow-soft': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '--shadow-medium': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      '--shadow-large': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    }
  },

  // Dark theme for Developers
  'github-dark': {
    name: 'github-dark',
    displayName: 'GitHub Dark',
    description: 'Developer-friendly dark theme inspired by GitHub',
    isDark: true,
    colors: {
      '--background': '220 13% 9%',
      '--foreground': '220 14% 93%',
      '--card': '220 13% 9%',
      '--card-foreground': '220 14% 93%',
      '--popover': '220 13% 9%',
      '--popover-foreground': '220 14% 93%',
      '--primary': '210 100% 70%',
      '--primary-foreground': '220 13% 9%',
      '--secondary': '220 13% 14%',
      '--secondary-foreground': '220 14% 93%',
      '--muted': '220 13% 14%',
      '--muted-foreground': '220 9% 46%',
      '--accent': '220 13% 18%',
      '--accent-foreground': '220 14% 93%',
      '--destructive': '0 75% 65%',
      '--destructive-foreground': '220 14% 93%',
      '--border': '220 13% 18%',
      '--input': '220 13% 18%',
      '--ring': '210 100% 70%',
      '--radius': '0.5rem',
      // Dashboard specific
      '--dashboard-bg': '220 13% 9%',
      '--dashboard-header': '220 13% 11%',
      '--dashboard-sidebar': '220 13% 14%',
      '--shadow-soft': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
      '--shadow-medium': '0 4px 6px -1px rgb(0 0 0 / 0.4)',
      '--shadow-large': '0 20px 25px -5px rgb(0 0 0 / 0.5)',
    }
  },

  // Bonus: Tailwind Slate theme
  'tailwind-slate': {
    name: 'tailwind-slate',
    displayName: 'Tailwind Slate',
    description: 'Professional slate theme for enterprise dashboards',
    isDark: false,
    colors: {
      '--background': '210 20% 98%',
      '--foreground': '215 25% 27%',
      '--card': '0 0% 100%',
      '--card-foreground': '215 25% 27%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '215 25% 27%',
      '--primary': '215 28% 17%',
      '--primary-foreground': '210 20% 98%',
      '--secondary': '210 40% 95%',
      '--secondary-foreground': '215 25% 27%',
      '--muted': '210 40% 95%',
      '--muted-foreground': '215 16% 47%',
      '--accent': '210 40% 92%',
      '--accent-foreground': '215 25% 27%',
      '--destructive': '0 84% 60%',
      '--destructive-foreground': '210 20% 98%',
      '--border': '215 28% 88%',
      '--input': '215 28% 88%',
      '--ring': '215 28% 17%',
      '--radius': '0.375rem',
      // Dashboard specific
      '--dashboard-bg': '210 20% 98%',
      '--dashboard-header': '0 0% 100%',
      '--dashboard-sidebar': '210 40% 95%',
      '--shadow-soft': '0 1px 2px 0 rgb(15 23 42 / 0.05)',
      '--shadow-medium': '0 4px 6px -1px rgb(15 23 42 / 0.1)',
      '--shadow-large': '0 20px 25px -5px rgb(15 23 42 / 0.1)',
    }
  }
};

export const getThemeById = (themeId: string): ThemeConfig | null => {
  return themes[themeId] || null;
};

export const getThemesList = () => {
  return Object.values(themes);
};
