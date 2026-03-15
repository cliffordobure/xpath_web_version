export type Locale = 'en' | 'fr';

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    'app.title': 'Laboratory Information Management System',
    'nav.dashboard': 'Dashboard',
    'nav.orders': 'Orders',
    'nav.createOrder': 'Create order',
    'nav.financial': 'Financial',
    'nav.courier': 'Courier',
    'nav.receptionistWorkflow': 'Receptionist workflow',
    'nav.technicianWorkflow': 'Technician workflow',
    'nav.pathologistWorkflow': 'Pathologist workflow',
    'nav.reports': 'Reports',
    'nav.inventory': 'Inventory',
    'nav.workflows': 'Workflows',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign out',
    'nav.admin.users': 'Users',
    'nav.admin.testTypes': 'Test types',
    'nav.admin.workflowTemplates': 'Workflow templates',
    'nav.admin.systemSettings': 'System settings',
    'admin.administration': 'Administration',
    'systemSettings.title': 'System settings',
    'systemSettings.description': 'System-wide configuration: language, lab name, timezone, and test types.',
    'systemSettings.language': 'Language',
    'systemSettings.labName': 'Lab name',
    'systemSettings.timezone': 'Timezone',
    'systemSettings.save': 'Save changes',
    'systemSettings.saved': 'Settings saved.',
    'systemSettings.testTypes': 'Test types',
    'systemSettings.addTestType': 'Add test type',
    'systemSettings.manageTestTypes': 'Manage all test types',
    'systemSettings.code': 'Code',
    'systemSettings.name': 'Name',
    'systemSettings.price': 'Price',
    'systemSettings.category': 'Category',
    'systemSettings.add': 'Add',
    'systemSettings.english': 'English',
    'systemSettings.french': 'French',
  },
  fr: {
    'app.title': "Système d'information de gestion de laboratoire",
    'nav.dashboard': 'Tableau de bord',
    'nav.orders': 'Commandes',
    'nav.createOrder': 'Créer une commande',
    'nav.financial': 'Finances',
    'nav.courier': 'Courrier',
    'nav.receptionistWorkflow': 'Workflow réception',
    'nav.technicianWorkflow': 'Workflow technicien',
    'nav.pathologistWorkflow': 'Workflow pathologiste',
    'nav.reports': 'Rapports',
    'nav.inventory': 'Inventaire',
    'nav.workflows': 'Workflows',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Paramètres',
    'nav.signOut': 'Déconnexion',
    'nav.admin.users': 'Utilisateurs',
    'nav.admin.testTypes': "Types d'analyses",
    'nav.admin.workflowTemplates': 'Modèles de workflow',
    'nav.admin.systemSettings': 'Paramètres système',
    'admin.administration': 'Administration',
    'systemSettings.title': 'Paramètres système',
    'systemSettings.description': "Configuration globale : langue, nom du laboratoire, fuseau horaire et types d'analyses.",
    'systemSettings.language': 'Langue',
    'systemSettings.labName': 'Nom du laboratoire',
    'systemSettings.timezone': 'Fuseau horaire',
    'systemSettings.save': 'Enregistrer',
    'systemSettings.saved': 'Paramètres enregistrés.',
    'systemSettings.testTypes': "Types d'analyses",
    'systemSettings.addTestType': 'Ajouter un type d\'analyse',
    'systemSettings.manageTestTypes': 'Gérer tous les types d\'analyses',
    'systemSettings.code': 'Code',
    'systemSettings.name': 'Nom',
    'systemSettings.price': 'Prix',
    'systemSettings.category': 'Catégorie',
    'systemSettings.add': 'Ajouter',
    'systemSettings.english': 'Anglais',
    'systemSettings.french': 'Français',
  },
};

const STORAGE_KEY = 'lims_locale';

export function getStoredLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'fr' || v === 'en') return v;
  } catch {}
  return 'en';
}

export function setStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}

export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
