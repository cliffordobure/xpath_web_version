import api from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post<{ token: string; user: User }>('/auth/register', data),
  me: () => api.get<User>('/auth/me'),
};

export interface OrderCounts {
  total: number;
  byStatus: Record<string, number>;
}

export const ordersApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number; courierStatus?: string; assignedToMe?: boolean; assignedToMePathologist?: boolean; assignedToMeCourier?: boolean; pickupRequests?: boolean; workflow?: 'technician' | 'pathologist' }) =>
    api.get<{ data: Order[]; total: number; page: number; limit: number }>('/orders', { params }),
  /** Admin only: total and counts by status so dashboard numbers agree */
  getCounts: () => api.get<OrderCounts>('/orders/counts'),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  getByNumber: (orderNumber: string) => api.get<Order>(`/orders/by-number/${encodeURIComponent(orderNumber)}`),
  create: (data: CreateOrderPayload) => api.post<Order>('/orders', data),
  update: (id: string, data: Partial<Order>) => api.patch<Order>(`/orders/${id}`, data),
};

export interface Accession {
  _id: string;
  accessionId: string;
  order: Order | string;
  receivedAt?: string;
  receivedBy?: string;
  grossDescription?: string;
  numberOfBlocks?: number;
  grossedAt?: string;
  grossedBy?: string;
}

export const accessionsApi = {
  list: (params?: { orderId?: string; accessionId?: string }) =>
    api.get<Accession[]>('/accessions', { params }).then((r) => r.data),
  getByOrder: (orderId: string) => api.get<Accession>(`/accessions/by-order/${orderId}`).then((r) => r.data),
  create: (orderId: string) => api.post<Accession>('/accessions', { orderId }).then((r) => r.data),
  /** Create Sample records for existing accessions so they appear in Inventory. Call once to backfill. */
  backfillSamples: () =>
    api.post<{ message: string; created: number }>('/accessions/backfill-samples').then((r) => r.data),
};

export const histologyApi = {
  getAccession: (accessionId: string) =>
    api.get<{ accession: Accession; blocks: Block[]; slides: Slide[] }>(`/histology/accession/${encodeURIComponent(accessionId)}`).then((r) => r.data),
  getBlocks: (accessionId: string) => api.get<Block[]>(`/histology/blocks/${encodeURIComponent(accessionId)}`).then((r) => r.data),
  saveGrossing: (data: { accessionId: string; grossDescription: string; numberOfBlocks?: number }) =>
    api.post('/histology/grossing', data).then((r) => r.data),
  saveProcessing: (data: { accessionId: string; processorId?: string; programName?: string; reagentLots?: string }) =>
    api.post('/histology/processing', data).then((r) => r.data),
  recordEmbedding: (blockId: string) => api.post('/histology/embedding', { blockId }).then((r) => r.data),
  recordSectioning: (data: { blockId: string; numberOfSlides?: number; thickness?: string; microtomeId?: string }) =>
    api.post('/histology/sectioning', data).then((r) => r.data),
  saveStaining: (data: { slideId: string; stainType?: string; qcStatus?: string }) =>
    api.post('/histology/staining', data).then((r) => r.data),
};

export interface Block {
  _id: string;
  blockId: string;
  accession: string;
  blockNumber: number;
  embeddingDate?: string;
  embeddedBy?: string;
}

export interface Slide {
  _id: string;
  slideId: string;
  block: string | Block;
  slideNumber: number;
  thickness?: string;
  microtomeId?: string;
  sectionedAt?: string;
  sectionedBy?: string;
}

export interface SlideImage {
  _id: string;
  order: string;
  slideId: string;
  imageUrl: string;
  scannerId?: string;
  label?: string;
  uploadedAt?: string;
}

export const slideImagesApi = {
  getByOrder: (orderId: string) =>
    api.get<SlideImage[]>('/slide-images/by-order/' + orderId).then((r) => r.data),
  create: (data: { orderId: string; slideId: string; imageUrl: string; scannerId?: string; label?: string }) =>
    api.post<SlideImage>('/slide-images', data).then((r) => r.data),
};

export interface IHCStainRecord {
  _id: string;
  slide: string | Slide;
  antibody: string;
  clone?: string;
  dilution?: string;
  antigenRetrieval?: string;
  detectionMethod?: string;
  counterstain?: string;
  stainedAt?: string;
  stainedBy?: string;
  qcStatus: 'pending' | 'passed' | 'failed' | 'rejected';
  notes?: string;
}

export const ihcApi = {
  getAccession: (accessionId: string) =>
    api.get<{ accession: Accession; blocks: Block[]; slides: Slide[] }>(`/ihc/accession/${encodeURIComponent(accessionId)}`).then((r) => r.data),
  getStainsForSlide: (slideId: string) =>
    api.get<IHCStainRecord[]>(`/ihc/slides/${encodeURIComponent(slideId)}/stains`).then((r) => r.data),
  recordStain: (data: {
    slideId: string;
    antibody: string;
    clone?: string;
    dilution?: string;
    antigenRetrieval?: string;
    detectionMethod?: string;
    counterstain?: string;
    qcStatus?: string;
    notes?: string;
  }) => api.post<IHCStainRecord>('/ihc/stain', data).then((r) => r.data),
};

export interface CytologyCase {
  _id: string;
  order: Order | string;
  caseId: string;
  specimenType?: string;
  receivedAt?: string;
  receivedBy?: string;
  processingMethod?: string;
  processingAt?: string;
  processedBy?: string;
  stainType?: string;
  stainedAt?: string;
  stainedBy?: string;
  screeningStatus: 'pending' | 'screened' | 'in_review' | 'completed';
  screenedBy?: string;
  screenedAt?: string;
  notes?: string;
}

export const cytologyApi = {
  listCases: (params?: { orderId?: string; screeningStatus?: string; limit?: number }) =>
    api.get<CytologyCase[]>('/cytology/cases', { params }).then((r) => r.data),
  getCase: (id: string) => api.get<CytologyCase>(`/cytology/cases/${encodeURIComponent(id)}`).then((r) => r.data),
  createCase: (orderId: string) => api.post<CytologyCase>('/cytology/cases', { orderId }).then((r) => r.data),
  updateCase: (id: string, data: Partial<{ specimenType: string; processingMethod: string; stainType: string; screeningStatus: string; notes: string; received: boolean }>) =>
    api.patch<CytologyCase>(`/cytology/cases/${id}`, data).then((r) => r.data),
};

export const patientsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<{ data: Patient[]; total: number }>('/patients', { params }),
  get: (id: string) => api.get<Patient>(`/patients/${id}`),
  create: (data: Partial<Patient>) => api.post<Patient>('/patients', data),
  update: (id: string, data: Partial<Patient>) => api.patch<Patient>(`/patients/${id}`, data),
};

export const paymentsApi = {
  list: (params?: { orderId?: string; status?: string; page?: number; limit?: number }) =>
    api.get<{ data: Payment[]; total: number }>('/payments', { params }),
  getSummary: () =>
    api.get<{ totalPaid: number; paidCount: number }>('/payments/summary').then((r) => r.data),
  create: (data: { order: string; amount: number; method?: string; reference?: string }) =>
    api.post<Payment>('/payments', data),
  update: (id: string, data: { status?: string; patientConfirmed?: boolean }) =>
    api.patch<Payment>(`/payments/${id}`, data),
};

export const samplesApi = {
  list: (params?: { orderId?: string; status?: string; limit?: number; page?: number }) =>
    api.get<{ data: Sample[]; total: number }>('/samples', { params }),
  get: (id: string) => api.get<Sample>(`/samples/${id}`),
  create: (data: { order: string; label: string; type?: string; status?: string }) =>
    api.post<Sample>('/samples', data),
  update: (id: string, data: Partial<Sample>) => api.patch<Sample>(`/samples/${id}`, data),
};

export const testTypesApi = {
  list: (params?: { active?: string; search?: string }) => api.get<TestType[]>('/test-types', { params }),
  get: (id: string) => api.get<TestType>(`/test-types/${id}`),
  create: (data: Partial<TestType>) => api.post<TestType>('/test-types', data),
  update: (id: string, data: Partial<TestType>) => api.patch<TestType>(`/test-types/${id}`, data),
};

export const workflowsApi = {
  templates: () => api.get<{ id: string; name: string; steps: string[] }[]>('/workflows/templates'),
  history: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: Order[]; total: number }>('/workflows/history', { params }),
};

export const usersApi = {
  list: () => api.get<User[]>('/users'),
  get: (id: string) => api.get<User>(`/users/${id}`),
  getMe: () => api.get<User>('/users/me').then((r) => r.data),
  /** Update current user's name and/or password (currentPassword required when setting newPassword). */
  updateMe: (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
    api.patch<User>('/users/me', data).then((r) => r.data),
  create: (data: { email: string; password: string; name: string; role: User['role']; active?: boolean }) =>
    api.post<User>('/users', data),
  update: (id: string, data: { name?: string; role?: User['role']; active?: boolean; password?: string }) =>
    api.patch<User>(`/users/${id}`, data),
};

export const reportsApi = {
  list: (params?: { from?: string; to?: string; status?: string }) =>
    api.get<Order[]>('/reports', { params }),
  /** Download report PDF for an order (for receptionist to give or send to patient) */
  downloadPdf: (orderId: string) =>
    api.get<Blob>(`/reports/${orderId}/pdf`, { responseType: 'blob' }),
  /** Email report PDF to client. Optional body: { email?: string }; defaults to patient email. */
  emailReport: (orderId: string, body?: { email?: string }) =>
    api.post<{ message: string }>(`/reports/${orderId}/email`, body ?? {}),
};

export interface NotificationItem {
  _id: string;
  forRole: string;
  type: string;
  title: string;
  body: string;
  orderId?: string;
  readAt?: string;
  createdAt: string;
}

export const notificationsApi = {
  list: (params?: { limit?: number }) =>
    api.get<NotificationItem[]>('/notifications', { params }).then((r) => r.data),
  markRead: (id: string) =>
    api.patch<NotificationItem>(`/notifications/${id}/read`).then((r) => r.data),
};

/** Supported system currencies (XAF, USD, EUR). Ksh is not supported. */
export const SUPPORTED_CURRENCIES = ['XAF', 'USD', 'EUR'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export interface SystemSettingsPayload {
  labName?: string;
  tagline?: string;
  aboutText?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  businessHours?: string;
  accreditations?: string[];
  privacyPolicyUrl?: string;
  termsUrl?: string;
  timezone?: string;
  dateFormat?: string;
  currency?: Currency;
  receptionistWorkflowSteps?: string[];
}

export const settingsApi = {
  get: () => api.get<SystemSettingsPayload & { receptionistWorkflowSteps?: string[] }>('/settings'),
  update: (data: SystemSettingsPayload) => api.put('/settings', data),
};

/** Order with payments (patient portal order detail) */
export type PatientPortalOrder = Order & { payments?: Payment[] };

/** Public patient portal (no auth) */
export const patientPortalApi = {
  listOrders: (params: { lastName: string; dateOfBirth: string }) =>
    api.get<Order[]>('/patient-portal/orders', { params }).then((r) => r.data),
  getOrder: (orderId: string, params: { lastName: string; dateOfBirth: string }) =>
    api.get<PatientPortalOrder>(`/patient-portal/order/${orderId}`, { params }).then((r) => r.data),
  lookup: (params: { orderNumber: string; lastName: string; dateOfBirth: string }) =>
    api.get<Order>('/patient-portal/lookup', { params }).then((r) => r.data),
  /** Submit payment request (e.g. MTN Mobile Money). Creates pending payment; lab confirms when received. */
  submitPaymentRequest: (
    orderId: string,
    params: { lastName: string; dateOfBirth: string },
    data: { amount: number; method: string; reference?: string }
  ) =>
    api.post<Payment>(`/patient-portal/order/${orderId}/payment-request`, data, { params }).then((r) => r.data),
};

/** Public config for landing page — lab branding, contact, accreditations (no auth) */
export interface PublicConfig {
  currency: Currency;
  labName: string;
  tagline?: string;
  aboutText?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  businessHours?: string;
  accreditations?: string[];
  privacyPolicyUrl?: string | null;
  termsUrl?: string | null;
}

/** Public landing page: list of active services with prices (no auth) */
export const publicApi = {
  getConfig: () => api.get<PublicConfig>('/public/config').then((r) => r.data),
  getServices: () => api.get<TestType[]>('/public/services').then((r) => r.data),
  /** Place an order online (patient/hospital). No auth. Creates order with ready_for_pickup so couriers see it. */
  submitOrderRequest: (data: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    phone?: string;
    email?: string;
    address?: string;
    pickupAddress?: string;
    pickupPlaceName?: string;
    pickupLat?: number;
    pickupLng?: number;
    testTypes: string[];
    referringDoctor?: string;
    notes?: string;
  }) => api.post<{ order: Order; orderNumber: string }>('/public/order-request', data).then((r) => r.data),
};

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'receptionist' | 'technician' | 'pathologist' | 'admin' | 'finance' | 'courier' | 'doctor';
  active?: boolean;
}

export interface Doctor {
  _id: string;
  name: string;
  code?: string;
  type: 'doctor' | 'clinic';
  email?: string;
  phone?: string;
  address?: string;
  user?: User | string;
  active?: boolean;
}

export const doctorsApi = {
  list: () => api.get<Doctor[]>('/doctors').then((r) => r.data),
  get: (id: string) => api.get<Doctor>(`/doctors/${id}`).then((r) => r.data),
  getMyProfile: () => api.get<Doctor>('/doctors/me/profile').then((r) => r.data),
  getMyStats: () =>
    api.get<{
      doctor: { _id: string; name: string; type: string };
      totalReferrals: number;
      totalRevenue: number;
      byMonth: { month: string; count: number }[];
      recentOrders: Order[];
    }>('/doctors/me/stats').then((r) => r.data),
  create: (data: {
    name: string;
    code?: string;
    type?: 'doctor' | 'clinic';
    email?: string;
    phone?: string;
    address?: string;
    createUser?: boolean;
    userEmail?: string;
    userPassword?: string;
  }) => api.post<Doctor>('/doctors', data).then((r) => r.data),
  update: (id: string, data: Partial<Pick<Doctor, 'name' | 'code' | 'type' | 'email' | 'phone' | 'address' | 'active'>>) =>
    api.patch<Doctor>(`/doctors/${id}`, data).then((r) => r.data),
  linkUser: (doctorId: string, userId: string) =>
    api.post<Doctor>(`/doctors/${doctorId}/link-user`, { userId }).then((r) => r.data),
};

export interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  nationalId?: string;
  referringDoctor?: string;
  notes?: string;
}

export interface TestType {
  _id: string;
  code: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  /** Typical turnaround in hours (e.g. 24, 48). Shown on public pricing. */
  turnaroundHours?: number;
  active?: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  patient: Patient | string;
  testTypes: (TestType | string)[];
  status: string;
  priority: string;
  referringDoctor?: string;
  referringDoctorId?: Doctor | string;
  assignedTechnician?: User | string;
  assignedPathologist?: User | string;
  assignedReceptionist?: User | string;
  receivedAt?: string;
  completedAt?: string;
  notes?: string;
  reportSummary?: string;
  pathologistDiagnosis?: string;
  reportLockedAt?: string;
  courierStatus?: string;
  courierCheckedInAt?: string;
  courierReceivedAt?: string;
  assignedCourier?: User | string;
  orderSource?: string;
  pickupAddress?: string;
  pickupPlaceName?: string;
  pickupLat?: number;
  pickupLng?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderPayload {
  patient: string;
  testTypes?: string[];
  priority?: string;
  referringDoctorId?: string;
  referringDoctor?: string;
  notes?: string;
}

export interface Payment {
  _id: string;
  order: Order | string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  paidAt?: string;
  patientConfirmedAt?: string;
}

export interface Sample {
  _id: string;
  order: Order | string;
  label: string;
  type?: string;
  status: string;
  receivedAt?: string;
  location?: string;
  notes?: string;
}
