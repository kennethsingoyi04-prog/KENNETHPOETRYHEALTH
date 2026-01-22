
export type UserRole = 'USER' | 'ADMIN';

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum PaymentMethod {
  AIRTEL_MONEY = 'Airtel Money',
  TNM_MPAMBA = 'TNM Mpamba'
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  referralCode: string;
  referredBy?: string; // ID of the person who referred this user
  role: UserRole;
  balance: number;
  totalEarnings: number;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  phone: string;
  whatsapp: string;
  paymentMethod: PaymentMethod;
  proofUrl?: string;
  status: WithdrawalStatus;
  createdAt: string;
  adminNote?: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  level: 1 | 2;
  commission: number;
  timestamp: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  withdrawals: WithdrawalRequest[];
  referrals: Referral[];
}
