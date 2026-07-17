import React, { useState } from 'react';

interface PayStubFormProps {
  defaultState?: string;
}

// 2024 Federal income tax brackets (annualized, single filer)
const FEDERAL_BRACKETS = [
  { min: 0, max: 11600, rate: 0.10 },
  { min: 11600, max: 47150, rate: 0.12 },
  { min: 47150, max: 100525, rate: 0.22 },
  { min: 100525, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

// State effective tax rates
const STATE_RATES: Record<string, number> = {
  CA: 0.093, TX: 0, FL: 0, NY: 0.0685, IL: 0.0495, PA: 0.0307,
  OH: 0.035, GA: 0.0549, NC: 0.045, MI: 0.0425, AZ: 0.025, WA: 0,
  CO: 0.044, NV: 0, TN: 0, VA: 0.0575, NJ: 0.0637, MA: 0.05,
  MN: 0.0785, OR: 0.0875, UT: 0.0465, IN: 0.0305, WI: 0.053, MO: 0.048, MD: 0.0575,
  AL: 0.05, SC: 0.065, LA: 0.0425,
  OTHER: 0,
};

const STATE_NAMES: Record<string, string> = {
  CA: 'California', TX: 'Texas', FL: 'Florida', NY: 'New York', IL: 'Illinois',
  PA: 'Pennsylvania', OH: 'Ohio', GA: 'Georgia', NC: 'North Carolina', MI: 'Michigan',
  AZ: 'Arizona', WA: 'Washington', CO: 'Colorado', NV: 'Nevada', TN: 'Tennessee',
  VA: 'Virginia', NJ: 'New Jersey', MA: 'Massachusetts', MN: 'Minnesota', OR: 'Oregon',
  UT: 'Utah', IN: 'Indiana', WI: 'Wisconsin', MO: 'Missouri', MD: 'Maryland',
  OTHER: 'Other',
};

// Social Security wage base 2024
const SS_WAGE_BASE = 168600;

// Pay periods per year
const PAY_PERIODS: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

const PAY_PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly (Every 2 Weeks)',
  semimonthly: 'Semi-Monthly (Twice/Month)',
  monthly: 'Monthly',
};

function calculateFederalTax(annualizedGross: number): number {
  let tax = 0;
  for (const bracket of FEDERAL_BRACKETS) {
    if (annualizedGross <= bracket.min) break;
    const taxable = Math.min(annualizedGross, bracket.max) - bracket.min;
    tax += taxable * bracket.rate;
  }
  return tax;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

interface Results {
  gross: number;
  federalTax: number;
  socialSecurity: number;
  medicare: number;
  stateTax: number;
  totalDeductions: number;
  net: number;
}

export default function PayStubForm({ defaultState = 'CA' }: PayStubFormProps) {
  const [form, setForm] = useState({
    employerName: '',
    employeeName: '',
    employeeSSN: '',
    state: defaultState,
    payPeriodStart: '',
    payPeriodEnd: '',
    payDate: '',
    payType: 'salary' as 'salary' | 'hourly',
    payFrequency: 'biweekly' as keyof typeof PAY_PERIODS,
    grossPay: '',
    hourlyRate: '',
    regularHours: '80',
    overtimeHours: '0',
  });

  const [results, setResults] = useState<Results | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (form.payType === 'salary') {
      const gross = parseFloat(form.grossPay);
      if (!form.grossPay || isNaN(gross) || gross <= 0) {
        newErrors.grossPay = 'Please enter a valid gross pay amount.';
      }
    } else {
      const rate = parseFloat(form.hourlyRate);
      if (!form.hourlyRate || isNaN(rate) || rate <= 0) {
        newErrors.hourlyRate = 'Please enter a valid hourly rate.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculate = () => {
    if (!validate()) return;

    const periodsPerYear = PAY_PERIODS[form.payFrequency];
    let gross = 0;

    if (form.payType === 'salary') {
      gross = parseFloat(form.grossPay) || 0;
    } else {
      const rate = parseFloat(form.hourlyRate) || 0;
      const reg = parseFloat(form.regularHours) || 0;
      const ot = parseFloat(form.overtimeHours) || 0;
      gross = (rate * reg) + (rate * 1.5 * ot);
    }

    const annualized = gross * periodsPerYear;
    const annualFed = calculateFederalTax(annualized);
    const federalTax = annualFed / periodsPerYear;

    // Social Security: 6.2% up to wage base
    const annualSS = Math.min(annualized * 0.062, SS_WAGE_BASE * 0.062);
    const socialSecurity = annualSS / periodsPerYear;

    // Medicare: 1.45% (additional 0.9% over $200k not modeled at pay period level)
    const medicare = gross * 0.0145;

    const stateTax = gross * (STATE_RATES[form.state] ?? 0);
    const totalDeductions = federalTax + socialSecurity + medicare + stateTax;
    const net = gross - totalDeductions;

    setResults({ gross, federalTax, socialSecurity, medicare, stateTax, totalDeductions, net });
  };

  const downloadPDF = async () => {
    if (!results) return;
    const { generatePayStubPDF } = await import('./PDFGenerator');
    generatePayStubPDF({
      employerName: form.employerName || 'Employer',
      employeeName: form.employeeName || 'Employee',
      employeeSSN: form.employeeSSN,
      state: STATE_NAMES[form.state] || form.state,
      payPeriodStart: form.payPeriodStart,
      payPeriodEnd: form.payPeriodEnd,
      payDate: form.payDate,
      payType: form.payType,
      payFrequency: form.payFrequency,
      grossPay: results.gross,
      federalTax: results.federalTax,
      socialSecurity: results.socialSecurity,
      medicare: results.medicare,
      stateTax: results.stateTax,
      netPay: results.net,
    });
  };

  const errorClass = 'text-red-500 text-xs mt-1';

  return (
    <div className="form-card">

      {/* EMPLOYER INFORMATION */}
      <div className="form-section-header">Employer Information</div>
      <div className="form-body">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employer Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Acme Corp"
              value={form.employerName}
              onChange={e => update('employerName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Employer Address (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="123 Main St, Austin TX"
              value={''}
              onChange={() => {}}
            />
          </div>
        </div>
      </div>

      {/* EMPLOYEE INFORMATION */}
      <div className="form-section-header">Employee Information</div>
      <div className="form-body">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Employee Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Jane Smith"
              value={form.employeeName}
              onChange={e => update('employeeName', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">SSN (last 4 digits)</label>
            <input
              type="text"
              className="form-input"
              placeholder="XXXX-XX-1234"
              maxLength={11}
              value={form.employeeSSN}
              onChange={e => update('employeeSSN', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">State</label>
          <select
            className="form-select"
            value={form.state}
            onChange={e => update('state', e.target.value)}
            style={{ maxWidth: '320px' }}
          >
            {Object.entries(STATE_NAMES).map(([abbr, name]) => (
              <option key={abbr} value={abbr}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* PAY DETAILS */}
      <div className="form-section-header">Pay Details</div>
      <div className="form-body">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Pay Period Start</label>
            <input
              type="date"
              className="form-input"
              value={form.payPeriodStart}
              onChange={e => update('payPeriodStart', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Pay Period End</label>
            <input
              type="date"
              className="form-input"
              value={form.payPeriodEnd}
              onChange={e => update('payPeriodEnd', e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Pay Date</label>
            <input
              type="date"
              className="form-input"
              value={form.payDate}
              onChange={e => update('payDate', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Pay Frequency</label>
            <select
              className="form-select"
              value={form.payFrequency}
              onChange={e => update('payFrequency', e.target.value as keyof typeof PAY_PERIODS)}
            >
              {Object.entries(PAY_PERIOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Pay Type</label>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
            {(['salary', 'hourly'] as const).map(type => (
              <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
                <input
                  type="radio"
                  name="payType"
                  value={type}
                  checked={form.payType === type}
                  onChange={() => update('payType', type)}
                />
                <span style={{ textTransform: 'capitalize' }}>{type}</span>
              </label>
            ))}
          </div>
        </div>

        {form.payType === 'salary' ? (
          <div className="form-group">
            <label className="form-label">Gross Pay This Period ($)</label>
            <input
              type="number"
              className="form-input"
              placeholder="3000.00"
              min="0"
              step="0.01"
              value={form.grossPay}
              onChange={e => update('grossPay', e.target.value)}
              style={{ maxWidth: '240px' }}
            />
            {errors.grossPay && <p className={errorClass}>{errors.grossPay}</p>}
          </div>
        ) : (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hourly Rate ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="25.00"
                min="0"
                step="0.01"
                value={form.hourlyRate}
                onChange={e => update('hourlyRate', e.target.value)}
              />
              {errors.hourlyRate && <p className={errorClass}>{errors.hourlyRate}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Regular Hours</label>
              <input
                type="number"
                className="form-input"
                placeholder="80"
                min="0"
                max="999"
                step="0.5"
                value={form.regularHours}
                onChange={e => update('regularHours', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Overtime Hours</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                min="0"
                max="999"
                step="0.5"
                value={form.overtimeHours}
                onChange={e => update('overtimeHours', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* DEDUCTIONS */}
      <div className="form-section-header">Deductions</div>
      <div className="form-body">
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Federal, state, Social Security (6.2%), and Medicare (1.45%) deductions are calculated automatically based on 2024 rates.
        </p>
        <button
          onClick={calculate}
          style={{ width: '100%', height: '56px', fontSize: '1.125rem', fontWeight: 700, background: '#1a56db', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', transition: 'background 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1e3a8a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1a56db')}
        >
          Calculate Pay Stub
        </button>
      </div>

      {/* RESULTS */}
      {results && (
        <>
          <div className="net-pay-card">
            <div className="net-pay-label">Your Net Pay This Period</div>
            <div className="net-pay-amount">{fmt(results.net)}</div>
            <div className="deductions-grid">
              <div className="deduction-item">
                <span className="deduction-label">Gross Pay</span>
                <span className="deduction-value">{fmt(results.gross)}</span>
              </div>
              <div className="deduction-item">
                <span className="deduction-label">Federal Tax</span>
                <span className="deduction-value">-{fmt(results.federalTax)}</span>
              </div>
              <div className="deduction-item">
                <span className="deduction-label">Social Security</span>
                <span className="deduction-value">-{fmt(results.socialSecurity)}</span>
              </div>
              <div className="deduction-item">
                <span className="deduction-label">Medicare</span>
                <span className="deduction-value">-{fmt(results.medicare)}</span>
              </div>
              {results.stateTax > 0 && (
                <div className="deduction-item">
                  <span className="deduction-label">State Tax</span>
                  <span className="deduction-value">-{fmt(results.stateTax)}</span>
                </div>
              )}
              <div className="deduction-item">
                <span className="deduction-label">Total Deductions</span>
                <span className="deduction-value">-{fmt(results.totalDeductions)}</span>
              </div>
            </div>
          </div>

          <div className="form-body">
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
              * Estimates use 2024 federal tax brackets (single filer) and state effective rates.
              Actual withholding may differ based on W-4 elections, filing status, and other factors.
              Not tax advice.
            </p>
            <button
              onClick={downloadPDF}
              style={{ width: '100%', height: '56px', fontSize: '1.125rem', fontWeight: 700, background: '#111827', color: 'white', border: 'none', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a56db')}
              onMouseLeave={e => (e.currentTarget.style.background = '#111827')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF Pay Stub
            </button>
          </div>
        </>
      )}
    </div>
  );
}
