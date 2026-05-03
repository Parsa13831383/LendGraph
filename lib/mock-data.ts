export type LoanStatus = 'origination' | 'underwriting' | 'live' | 'defaulted';

export interface Loan {
  id: string;
  borrowerName: string;
  companyRegNumber: string;
  propertyValue: number;
  existingDebt: number;
  loanAmount: number;
  ltv: number;
  icr: number;
  status: LoanStatus;
  interestPaid: number;
  principalPaid: number;
  totalInterest: number;
  totalPrincipal: number;
  covenantStatus: 'compliant' | 'breach';
  startDate: string;
  maturityDate: string;
  interestRate: number;
}

export interface Investor {
  id: string;
  name: string;
  totalCommitment: number;
  drawnAmount: number;
  availableCapital: number;
  allocations: {
    loanId: string;
    loanName: string;
    amount: number;
    percentage: number;
  }[];
  drawdownHistory: {
    date: string;
    amount: number;
    type: 'drawdown' | 'distribution';
  }[];
}

export interface PortfolioMetrics {
  totalCapitalDeployed: number;
  weightedAverageLTV: number;
  portfolioIRR: number;
  totalLoans: number;
  activeLoans: number;
  defaultRate: number;
  averageLoanSize: number;
  monthlyDeployment: { month: string; amount: number }[];
  ltvDistribution: { range: string; count: number }[];
  statusDistribution: { status: string; count: number; amount: number }[];
}

export const mockLoans: Loan[] = [
  {
    id: 'L001',
    borrowerName: 'Meridian Property Holdings',
    companyRegNumber: '12345678',
    propertyValue: 5200000,
    existingDebt: 1800000,
    loanAmount: 3120000,
    ltv: 60,
    icr: 2.4,
    status: 'live',
    interestPaid: 156000,
    principalPaid: 520000,
    totalInterest: 312000,
    totalPrincipal: 3120000,
    covenantStatus: 'compliant',
    startDate: '2024-03-15',
    maturityDate: '2025-09-15',
    interestRate: 10.0,
  },
  {
    id: 'L002',
    borrowerName: 'Northern Developments Ltd',
    companyRegNumber: '87654321',
    propertyValue: 8500000,
    existingDebt: 2500000,
    loanAmount: 5100000,
    ltv: 60,
    icr: 1.8,
    status: 'live',
    interestPaid: 382500,
    principalPaid: 1275000,
    totalInterest: 510000,
    totalPrincipal: 5100000,
    covenantStatus: 'compliant',
    startDate: '2024-01-20',
    maturityDate: '2025-07-20',
    interestRate: 10.0,
  },
  {
    id: 'L003',
    borrowerName: 'City Core Investments',
    companyRegNumber: '11223344',
    propertyValue: 3200000,
    existingDebt: 1000000,
    loanAmount: 2080000,
    ltv: 65,
    icr: 1.2,
    status: 'underwriting',
    interestPaid: 0,
    principalPaid: 0,
    totalInterest: 208000,
    totalPrincipal: 2080000,
    covenantStatus: 'compliant',
    startDate: '2024-06-01',
    maturityDate: '2025-12-01',
    interestRate: 10.0,
  },
  {
    id: 'L004',
    borrowerName: 'Thames Gateway Properties',
    companyRegNumber: '55667788',
    propertyValue: 12000000,
    existingDebt: 4000000,
    loanAmount: 7200000,
    ltv: 60,
    icr: 2.1,
    status: 'live',
    interestPaid: 540000,
    principalPaid: 1800000,
    totalInterest: 720000,
    totalPrincipal: 7200000,
    covenantStatus: 'compliant',
    startDate: '2023-11-10',
    maturityDate: '2025-05-10',
    interestRate: 10.0,
  },
  {
    id: 'L005',
    borrowerName: 'Brighton Marina Ventures',
    companyRegNumber: '99887766',
    propertyValue: 2800000,
    existingDebt: 800000,
    loanAmount: 1960000,
    ltv: 70,
    icr: 0.9,
    status: 'defaulted',
    interestPaid: 98000,
    principalPaid: 196000,
    totalInterest: 196000,
    totalPrincipal: 1960000,
    covenantStatus: 'breach',
    startDate: '2024-02-28',
    maturityDate: '2025-08-28',
    interestRate: 10.0,
  },
  {
    id: 'L006',
    borrowerName: 'Manchester Industrial Park',
    companyRegNumber: '44556677',
    propertyValue: 6500000,
    existingDebt: 2000000,
    loanAmount: 3900000,
    ltv: 60,
    icr: 2.5,
    status: 'origination',
    interestPaid: 0,
    principalPaid: 0,
    totalInterest: 390000,
    totalPrincipal: 3900000,
    covenantStatus: 'compliant',
    startDate: '2024-06-15',
    maturityDate: '2026-06-15',
    interestRate: 10.0,
  },
  {
    id: 'L007',
    borrowerName: 'Edinburgh Residential Trust',
    companyRegNumber: '33221100',
    propertyValue: 4100000,
    existingDebt: 1200000,
    loanAmount: 2460000,
    ltv: 60,
    icr: 1.9,
    status: 'live',
    interestPaid: 184500,
    principalPaid: 615000,
    totalInterest: 246000,
    totalPrincipal: 2460000,
    covenantStatus: 'compliant',
    startDate: '2024-04-01',
    maturityDate: '2025-10-01',
    interestRate: 10.0,
  },
  {
    id: 'L008',
    borrowerName: 'Cardiff Bay Developments',
    companyRegNumber: '77889900',
    propertyValue: 7800000,
    existingDebt: 2600000,
    loanAmount: 4680000,
    ltv: 60,
    icr: 2.2,
    status: 'live',
    interestPaid: 351000,
    principalPaid: 1170000,
    totalInterest: 468000,
    totalPrincipal: 4680000,
    covenantStatus: 'compliant',
    startDate: '2024-02-15',
    maturityDate: '2025-08-15',
    interestRate: 10.0,
  },
];

export const mockInvestor: Investor = {
  id: 'INV001',
  name: 'Apex Capital Partners',
  totalCommitment: 50000000,
  drawnAmount: 32500000,
  availableCapital: 17500000,
  allocations: [
    { loanId: 'L001', loanName: 'Meridian Property Holdings', amount: 6240000, percentage: 19.2 },
    { loanId: 'L002', loanName: 'Northern Developments Ltd', amount: 7650000, percentage: 23.5 },
    { loanId: 'L004', loanName: 'Thames Gateway Properties', amount: 10800000, percentage: 33.2 },
    { loanId: 'L007', loanName: 'Edinburgh Residential Trust', amount: 3690000, percentage: 11.4 },
    { loanId: 'L008', loanName: 'Cardiff Bay Developments', amount: 4120000, percentage: 12.7 },
  ],
  drawdownHistory: [
    { date: '2024-06-01', amount: 4500000, type: 'drawdown' },
    { date: '2024-05-15', amount: 1200000, type: 'distribution' },
    { date: '2024-05-01', amount: 6200000, type: 'drawdown' },
    { date: '2024-04-15', amount: 800000, type: 'distribution' },
    { date: '2024-04-01', amount: 3800000, type: 'drawdown' },
    { date: '2024-03-15', amount: 5100000, type: 'drawdown' },
    { date: '2024-03-01', amount: 2400000, type: 'distribution' },
    { date: '2024-02-15', amount: 7500000, type: 'drawdown' },
    { date: '2024-02-01', amount: 4200000, type: 'drawdown' },
    { date: '2024-01-15', amount: 600000, type: 'distribution' },
  ],
};

export const mockPortfolioMetrics: PortfolioMetrics = {
  totalCapitalDeployed: 30500000,
  weightedAverageLTV: 61.2,
  portfolioIRR: 14.8,
  totalLoans: 8,
  activeLoans: 5,
  defaultRate: 12.5,
  averageLoanSize: 3812500,
  monthlyDeployment: [
    { month: 'Jan', amount: 5100000 },
    { month: 'Feb', amount: 6640000 },
    { month: 'Mar', amount: 3120000 },
    { month: 'Apr', amount: 2460000 },
    { month: 'May', amount: 4680000 },
    { month: 'Jun', amount: 8500000 },
  ],
  ltvDistribution: [
    { range: '50-55%', count: 0 },
    { range: '55-60%', count: 5 },
    { range: '60-65%', count: 2 },
    { range: '65-70%', count: 0 },
    { range: '70-75%', count: 1 },
  ],
  statusDistribution: [
    { status: 'Origination', count: 1, amount: 3900000 },
    { status: 'Underwriting', count: 1, amount: 2080000 },
    { status: 'Live', count: 5, amount: 22560000 },
    { status: 'Defaulted', count: 1, amount: 1960000 },
  ],
};

export const integrationStatuses = [
  { name: 'Xero', status: 'connected', lastSync: '2 mins ago' },
  { name: 'Credit Safe', status: 'connected', lastSync: '5 mins ago' },
  { name: 'Companies House', status: 'connected', lastSync: '1 hour ago' },
  { name: 'Land Registry', status: 'pending', lastSync: null },
  { name: 'FCA Register', status: 'connected', lastSync: '30 mins ago' },
];
