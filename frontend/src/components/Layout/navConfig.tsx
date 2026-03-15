import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import ScienceIcon from '@mui/icons-material/Science';
import RateReviewIcon from '@mui/icons-material/RateReview';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import NotificationsIcon from '@mui/icons-material/Notifications';
import GroupIcon from '@mui/icons-material/Group';
import CategoryIcon from '@mui/icons-material/Category';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import ImageIcon from '@mui/icons-material/Image';
import React from 'react';

type NavItem = { path: string; label: string; labelKey?: string; icon: React.ReactNode };

const byRole: Record<string, { main: NavItem[]; admin: NavItem[] }> = {
  admin: {
    main: [
      { path: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
      { path: '/orders', label: 'Orders', labelKey: 'nav.orders', icon: <AssignmentIcon /> },
      { path: '/orders/create', label: 'Create order', labelKey: 'nav.createOrder', icon: <AddCircleOutlineIcon /> },
      { path: '/financial', label: 'Financial', labelKey: 'nav.financial', icon: <ReceiptIcon /> },
      { path: '/courier', label: 'Courier', labelKey: 'nav.courier', icon: <LocalShippingIcon /> },
      { path: '/receptionist/workflow', label: 'Receptionist workflow', labelKey: 'nav.receptionistWorkflow', icon: <PersonSearchIcon /> },
      { path: '/technician/workflow', label: 'Technician workflow', labelKey: 'nav.technicianWorkflow', icon: <ScienceIcon /> },
      { path: '/pathologist/workflow', label: 'Pathologist workflow', labelKey: 'nav.pathologistWorkflow', icon: <RateReviewIcon /> },
      { path: '/reports', label: 'Reports', labelKey: 'nav.reports', icon: <AssessmentIcon /> },
      { path: '/histology', label: 'Histology', icon: <ScienceIcon /> },
      { path: '/ihc', label: 'IHC', icon: <ScienceIcon /> },
      { path: '/cytology', label: 'Cytology', icon: <ScienceIcon /> },
      { path: '/digital-pathology', label: 'Digital pathology', icon: <ImageIcon /> },
      { path: '/inventory', label: 'Inventory', labelKey: 'nav.inventory', icon: <InventoryIcon /> },
      { path: '/workflow/select', label: 'Workflows', labelKey: 'nav.workflows', icon: <AccountTreeIcon /> },
      { path: '/notifications', label: 'Notifications', labelKey: 'nav.notifications', icon: <NotificationsIcon /> },
    ],
    admin: [
      { path: '/admin/users', label: 'Users', labelKey: 'nav.admin.users', icon: <GroupIcon /> },
      { path: '/admin/doctors', label: 'Doctors & referrers', icon: <PersonSearchIcon /> },
      { path: '/admin/test-types', label: 'Test types', labelKey: 'nav.admin.testTypes', icon: <CategoryIcon /> },
      { path: '/admin/workflow-templates', label: 'Workflow templates', labelKey: 'nav.admin.workflowTemplates', icon: <AccountTreeIcon /> },
      { path: '/admin/settings', label: 'System settings', labelKey: 'nav.admin.systemSettings', icon: <SettingsApplicationsIcon /> },
    ],
  },
  receptionist: {
    main: [
      { path: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
      { path: '/orders', label: 'Orders', labelKey: 'nav.orders', icon: <AssignmentIcon /> },
      { path: '/orders/create', label: 'Create order', labelKey: 'nav.createOrder', icon: <AddCircleOutlineIcon /> },
      { path: '/financial', label: 'Financial', labelKey: 'nav.financial', icon: <ReceiptIcon /> },
      { path: '/courier', label: 'Courier', labelKey: 'nav.courier', icon: <LocalShippingIcon /> },
      { path: '/receptionist/workflow', label: 'Receptionist workflow', labelKey: 'nav.receptionistWorkflow', icon: <PersonSearchIcon /> },
      { path: '/reports', label: 'Reports', labelKey: 'nav.reports', icon: <AssessmentIcon /> },
      { path: '/inventory', label: 'Inventory', labelKey: 'nav.inventory', icon: <InventoryIcon /> },
      { path: '/notifications', label: 'Notifications', labelKey: 'nav.notifications', icon: <NotificationsIcon /> },
    ],
    admin: [],
  },
  technician: {
    main: [
      { path: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
      { path: '/orders', label: 'Orders', labelKey: 'nav.orders', icon: <AssignmentIcon /> },
      { path: '/technician/workflow', label: 'Technician workflow', labelKey: 'nav.technicianWorkflow', icon: <ScienceIcon /> },
      { path: '/receiving', label: 'Receiving', icon: <PersonSearchIcon /> },
      { path: '/histology', label: 'Histology', icon: <ScienceIcon /> },
      { path: '/ihc', label: 'IHC', icon: <ScienceIcon /> },
      { path: '/cytology', label: 'Cytology', icon: <ScienceIcon /> },
      { path: '/digital-pathology', label: 'Digital pathology', icon: <ImageIcon /> },
      { path: '/inventory', label: 'Inventory', labelKey: 'nav.inventory', icon: <InventoryIcon /> },
      { path: '/workflow/select', label: 'Workflows', labelKey: 'nav.workflows', icon: <AccountTreeIcon /> },
      { path: '/notifications', label: 'Notifications', labelKey: 'nav.notifications', icon: <NotificationsIcon /> },
    ],
    admin: [],
  },
  pathologist: {
    main: [
      { path: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
      { path: '/orders', label: 'Orders', labelKey: 'nav.orders', icon: <AssignmentIcon /> },
      { path: '/pathologist/workflow', label: 'Pathologist workflow', labelKey: 'nav.pathologistWorkflow', icon: <RateReviewIcon /> },
      { path: '/pathologist-review', label: 'Pathologist review', icon: <RateReviewIcon /> },
      { path: '/reports', label: 'Reports', labelKey: 'nav.reports', icon: <AssessmentIcon /> },
      { path: '/notifications', label: 'Notifications', labelKey: 'nav.notifications', icon: <NotificationsIcon /> },
    ],
    admin: [],
  },
  finance: {
    main: [
      { path: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
      { path: '/orders', label: 'Orders', labelKey: 'nav.orders', icon: <AssignmentIcon /> },
      { path: '/financial', label: 'Financial', labelKey: 'nav.financial', icon: <ReceiptIcon /> },
      { path: '/reports', label: 'Reports', labelKey: 'nav.reports', icon: <AssessmentIcon /> },
    ],
    admin: [],
  },
  courier: {
    main: [
      { path: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
      { path: '/courier', label: 'Courier', labelKey: 'nav.courier', icon: <LocalShippingIcon /> },
    ],
    admin: [],
  },
  doctor: {
    main: [
      { path: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: <DashboardIcon /> },
      { path: '/doctor-portal', label: 'Referral statistics', icon: <AssessmentIcon /> },
    ],
    admin: [],
  },
};

export function navConfig(role?: string): { main: NavItem[]; admin: NavItem[] } {
  const r = role && byRole[role] ? role : 'receptionist';
  return byRole[r];
}
