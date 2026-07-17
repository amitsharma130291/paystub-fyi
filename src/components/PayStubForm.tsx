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

const SS_WAGE_BASE = 168600;

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

// ── Shared style tokens ──────────────────────────────────────
const INPUT_BASE: React.CSSProperties = {
  width: '100%',
  height: '48px',
  padding: '0 0.875rem',
  border: '1.5px solid #d1d5db',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  fontFamily: 'inherit',
  color: '#111827',
  background: 'white',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
};
const INPUT_FOCUS: React.CSSProperties = {
  ...INPUT_BASE,
  borderColor: '#1a56db',
  boxShadow: '0 0 0 4px rgba(26,86,219,0.12)',
};
const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '0.375rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
const SECTION_DIVIDER: React.CSSProperties = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: '1.75rem',
  marginTop: '0.25rem',
};

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
  const [focused, setFocused] = React.useState<string | null>(null);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const iStyle = (field: string) => focused === field ? INPUT_FOCUS : INPUT_BASE;

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
      gross = rate * reg + rate * 1.5 * ot;
    }
    const annualized = gross * periodsPerYear;
    const annualFed = calculateFederalTax(annualized);
    const federalTax = annualFed / periodsPerYear;
    const annualSS = Math.min(annualized * 0.062, SS_WAGE_BASE * 0.062);
    const socialSecurity = annualSS / periodsPerYear;
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

  return (
    <div style={{
      background: 'white',
      borderRadius: '1.25rem',
      boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      {/* ── Form ── */}
      <div style={{ padding: '2rem' }}>

        {/* Section: Employer & Employee */}
        <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ display: 'inline-block', width: '3px', height: '1rem', background: '#1a56db', borderRadius: '2px' }} />
          Employer &amp; Employee
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={LABEL_STYLE}>Employer Name</label>
            <input type="text" placeholder="Acme Corp" style={iStyle('employerName')} value={form.employerName}
              onChange={e => update('employerName', e.target.value)}
              onFocus={() => setFocused('employerName')} onBlur={() => setFocused(null)} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Employee Name</label>
            <input type="text" placeholder="Jane Smith" style={iStyle('employeeName')} value={form.employeeName}
              onChange={e => update('employeeName', e.target.value)}
              onFocus={() => setFocused('employeeName')} onBlur={() => setFocused(null)} />
          </div>
          <div>
            <label style={LABEL_STYLE}>SSN (last 4 digits)</label>
            <input type="text" placeholder="XXXX-XX-1234" maxLength={11} style={iStyle('employeeSSN')} value={form.employeeSSN}
              onChange={e => update('employeeSSN', e.target.value)}
              onFocus={() => setFocused('employeeSSN')} onBlur={() => setFocused(null)} />
          </div>
          <div>
            <label style={LABEL_STYLE}>State</label>
            <select style={iStyle('state')} value={form.state}
              onChange={e => update('state', e.target.value)}
              onFocus={() => setFocused('state')} onBlur={() => setFocused(null)}>
              {Object.entries(STATE_NAMES).map(([abbr, name]) => (
                <option key={abbr} value={abbr}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section: Pay Period */}
        <div style={SECTION_DIVIDER}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ display: 'inline-block', width: '3px', height: '1rem', background: '#1a56db', borderRadius: '2px' }} />
            Pay Period
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={LABEL_STYLE}>Period Start</label>
              <input type="date" style={iStyle('payPeriodStart')} value={form.payPeriodStart}
                onChange={e => update('payPeriodStart', e.target.value)}
                onFocus={() => setFocused('payPeriodStart')} onBlur={() => setFocused(null)} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Period End</label>
              <input type="date" style={iStyle('payPeriodEnd')} value={form.payPeriodEnd}
                onChange={e => update('payPeriodEnd', e.target.value)}
                onFocus={() => setFocused('payPeriodEnd')} onBlur={() => setFocused(null)} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Pay Date</label>
              <input type="date" style={iStyle('payDate')} value={form.payDate}
                onChange={e => update('payDate', e.target.value)}
                onFocus={() => setFocused('payDate')} onBlur={() => setFocused(null)} />
            </div>
          </div>
          <div style={{ maxWidth: '50%' }}>
            <label style={LABEL_STYLE}>Pay Frequency</label>
            <select style={iStyle('payFrequency')} value={form.payFrequency}
              onChange={e => update('payFrequency', e.target.value as keyof typeof PAY_PERIODS)}
              onFocus={() => setFocused('payFrequency')} onBlur={() => setFocused(null)}>
              {Object.entries(PAY_PERIOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Section: Earnings */}
        <div style={SECTION_DIVIDER}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ display: 'inline-block', width: '3px', height: '1rem', background: '#1a56db', borderRadius: '2px' }} />
            Earnings
          </h2>

          <div style={{ marginBottom: '1rem' }}>
            <label style={LABEL_STYLE}>Pay Type</label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {(['salary', 'hourly'] as const).map(type => (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 500, color: '#374151', textTransform: 'none', letterSpacing: 0 }}>
                  <input type="radio" name="payType" value={type} checked={form.payType === type}
                    onChange={() => update('payType', type)}
                    style={{ width: 'auto', height: 'auto', accentColor: '#1a56db' }} />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {form.payType === 'salary' ? (
            <div style={{ maxWidth: '50%' }}>
              <label style={LABEL_STYLE}>Gross Pay This Period ($)</label>
              <input type="number" placeholder="3000.00" min="0" step="0.01"
                style={iStyle('grossPay')} value={form.grossPay}
                onChange={e => update('grossPay', e.target.value)}
                onFocus={() => setFocused('grossPay')} onBlur={() => setFocused(null)} />
              {errors.grossPay && <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.375rem', marginBottom: 0 }}>{errors.grossPay}</p>}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={LABEL_STYLE}>Hourly Rate ($)</label>
                <input type="number" placeholder="25.00" min="0" step="0.01"
                  style={iStyle('hourlyRate')} value={form.hourlyRate}
                  onChange={e => update('hourlyRate', e.target.value)}
                  onFocus={() => setFocused('hourlyRate')} onBlur={() => setFocused(null)} />
                {errors.hourlyRate && <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.375rem', marginBottom: 0 }}>{errors.hourlyRate}</p>}
              </div>
              <div>
                <label style={LABEL_STYLE}>Regular Hours</label>
                <input type="number" placeholder="80" min="0" max="999" step="0.5"
                  style={iStyle('regularHours')} value={form.regularHours}
                  onChange={e => update('regularHours', e.target.value)}
                  onFocus={() => setFocused('regularHours')} onBlur={() => setFocused(null)} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Overtime Hours</label>
                <input type="number" placeholder="0" min="0" max="999" step="0.5"
                  style={iStyle('overtimeHours')} value={form.overtimeHours}
                  onChange={e => update('overtimeHours', e.target.value)}
                  onFocus={() => setFocused('overtimeHours')} onBlur={() => setFocused(null)} />
              </div>
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={calculate}
          style={{
            display: 'block',
            width: '100%',
            height: '56px',
            background: '#1a56db',
            color: 'white',
            fontSize: '1.125rem',
            fontWeight: 700,
            borderRadius: '0.75rem',
            border: 'none',
            cursor: 'pointer',
            marginTop: '1.75rem',
            letterSpacing: '0.01em',
            transition: 'background 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 14px rgba(26,86,219,0.35)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1e3a8a';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(26,86,219,0.45)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1a56db';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(26,86,219,0.35)';
          }}
        >
          Generate PDF Pay Stub &rarr;
        </button>
      </div>

      {/* ── Results ── */}
      {results && (
        <div style={{ borderTop: '1px solid #e5e7eb', background: '#f9fafb', padding: '2rem' }}>
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ display: 'inline-block', width: '3px', height: '1rem', background: '#1a56db', borderRadius: '2px' }} />
            Pay Stub Summary
          </h2>

          <div style={{ background: 'white', borderRadius: '0.875rem', border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: '1.5rem' }}>
            {/* Earnings */}
            <div style={{ background: '#f9fafb', padding: '0.625rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Earnings</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                    {form.payType === 'salary' ? 'Salary' : 'Regular Pay'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{fmt(results.gross)}</td>
                </tr>
                <tr style={{ background: '#f9fafb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#111827' }}>Gross Pay</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{fmt(results.gross)}</td>
                </tr>
              </tbody>
            </table>

            {/* Deductions */}
            <div style={{ background: '#f9fafb', padding: '0.625rem 1rem', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Deductions</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9375rem' }}>
              <tbody>
                {[
                  ['Federal Income Tax', results.federalTax],
                  ['Social Security (6.2%)', results.socialSecurity],
                  ['Medicare (1.45%)', results.medicare],
                  [`State Tax (${STATE_NAMES[form.state] || form.state})`, results.stateTax],
                ].map(([label, val]) => (
                  <tr key={label as string} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{label as string}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>- {fmt(val as number)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f9fafb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#111827' }}>Total Deductions</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>- {fmt(results.totalDeductions)}</td>
                </tr>
              </tbody>
            </table>

            {/* Net Pay */}
            <div style={{ background: '#111827', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'white' }}>Net Pay</span>
              <span style={{ fontSize: '1.375rem', fontWeight: 800, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{fmt(results.net)}</span>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Estimates use 2024 federal brackets (single filer) and state effective rates. Actual withholding may differ. Not tax advice.
          </p>

          <button
            onClick={downloadPDF}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              height: '56px',
              background: '#1a56db',
              color: 'white',
              fontSize: '1.125rem',
              fontWeight: 700,
              borderRadius: '0.75rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 14px rgba(26,86,219,0.35)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#1e3a8a';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = '#1a56db';
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF Pay Stub
          </button>
        </div>
      )}
    </div>
  );
}
