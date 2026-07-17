import { jsPDF } from 'jspdf';

export interface PayStubData {
  // Employer
  employerName: string;
  employerAddress: string;
  // Employee
  employeeFirstName: string;
  employeeLastName: string;
  employeeSSN: string;
  // Pay period
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  // State
  state: string;
  stateName: string;
  // Amounts
  grossPay: number;
  regularPay: number;
  overtimePay: number;
  federalTax: number;
  socialSecurity: number;
  medicare: number;
  stateTax: number;
  netPay: number;
}

function fmtCurrency(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function generatePayStubPDF(data: PayStubData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = 612;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  // ---- Header ----
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 86, 219); // primary blue
  doc.text(data.employerName || 'Employer', margin, y);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(data.employerAddress || '', margin, y + 16);

  // PAY STUB label right-aligned
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('PAY STUB', pageWidth - margin, y, { align: 'right' });

  y += 40;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // ---- Employee Block ----
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);

  const col2 = margin + contentWidth / 2;

  // Left column
  doc.text('EMPLOYEE:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.employeeFirstName} ${data.employeeLastName}`.trim() || 'Employee Name', margin, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('SSN:', margin, y + 30);
  doc.setFont('helvetica', 'normal');
  const ssnDisplay = data.employeeSSN
    ? `XXX-XX-${data.employeeSSN.slice(-4)}`
    : 'XXX-XX-XXXX';
  doc.text(ssnDisplay, margin, y + 44);

  // Right column
  doc.setFont('helvetica', 'bold');
  doc.text('PAY PERIOD:', col2, y);
  doc.setFont('helvetica', 'normal');
  const periodStr = data.payPeriodStart && data.payPeriodEnd
    ? `${fmtDate(data.payPeriodStart)} – ${fmtDate(data.payPeriodEnd)}`
    : 'N/A';
  doc.text(periodStr, col2, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('PAY DATE:', col2, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(data.payDate ? fmtDate(data.payDate) : 'N/A', col2, y + 44);

  y += 70;

  // Divider
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // ---- Earnings Table ----
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 86, 219);
  doc.text('EARNINGS', margin, y);
  y += 14;

  // Table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('DESCRIPTION', margin, y);
  doc.text('CURRENT', pageWidth - margin - 60, y);
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);

  // Regular Pay
  doc.text('Regular Pay', margin, y);
  doc.text(fmtCurrency(data.regularPay), pageWidth - margin, y, { align: 'right' });
  y += 16;

  // Overtime (only if > 0)
  if (data.overtimePay > 0) {
    doc.text('Overtime Pay (1.5x)', margin, y);
    doc.text(fmtCurrency(data.overtimePay), pageWidth - margin, y, { align: 'right' });
    y += 16;
  }

  // Gross Pay total
  doc.setFont('helvetica', 'bold');
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  doc.text('Gross Pay', margin, y);
  doc.text(fmtCurrency(data.grossPay), pageWidth - margin, y, { align: 'right' });
  y += 24;

  // ---- Deductions Table ----
  doc.setFontSize(11);
  doc.setTextColor(26, 86, 219);
  doc.text('DEDUCTIONS', margin, y);
  y += 14;

  // Table header
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('DESCRIPTION', margin, y);
  doc.text('CURRENT', pageWidth - margin - 100, y, { align: 'right' });
  doc.text('YTD (EST.)', pageWidth - margin, y, { align: 'right' });
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);

  const deductions = [
    { label: 'Federal Income Tax', amount: data.federalTax },
    { label: 'Social Security (6.2%)', amount: data.socialSecurity },
    { label: 'Medicare (1.45%)', amount: data.medicare },
    { label: `${data.stateName} State Tax`, amount: data.stateTax },
  ];

  for (const d of deductions) {
    doc.text(d.label, margin, y);
    doc.text(fmtCurrency(d.amount), pageWidth - margin - 100, y, { align: 'right' });
    doc.text(fmtCurrency(d.amount * 6), pageWidth - margin, y, { align: 'right' }); // YTD estimate
    y += 16;
  }

  const totalDeductions = data.federalTax + data.socialSecurity + data.medicare + data.stateTax;
  doc.setFont('helvetica', 'bold');
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  doc.text('Total Deductions', margin, y);
  doc.text(fmtCurrency(totalDeductions), pageWidth - margin - 100, y, { align: 'right' });
  doc.text(fmtCurrency(totalDeductions * 6), pageWidth - margin, y, { align: 'right' });
  y += 24;

  // ---- Net Pay Box ----
  doc.setFillColor(26, 86, 219);
  doc.roundedRect(margin, y, contentWidth, 50, 6, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', margin + 20, y + 20);

  doc.setFontSize(22);
  doc.text(fmtCurrency(data.netPay), pageWidth - margin - 20, y + 30, { align: 'right' });

  y += 70;

  // ---- Footer note ----
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(150, 150, 150);
  doc.text(
    'This pay stub is for informational purposes only. Generated by IncomeRecord.com. Tax estimates based on 2024 federal and state rates.',
    margin,
    y,
    { maxWidth: contentWidth }
  );

  // Download
  const safeLast = (data.employeeLastName || 'employee').replace(/[^a-zA-Z0-9]/g, '-');
  const safeDate = (data.payDate || 'unknown').replace(/[^0-9-]/g, '');
  doc.save(`pay-stub-${safeLast}-${safeDate}.pdf`);
}
