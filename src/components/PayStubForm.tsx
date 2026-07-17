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

  const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const errorClass = 'text-red-500 text-xs mt-1';
  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    color: '#111827',
    background: 'white',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };
  const labelStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: '14px',
    color: '#374151',
    marginBottom: '4px',
    display: 'block',
  };
  const [focusedField, setFocusedField] = React.useState<string | null>(null);
  const getFocusStyle = (field: string): React.CSSProperties => focusedField === field ? {
    ...inputStyle,
    borderColor: '#1a56db',
    boxShadow: '0 0 0 3px rgba(26,86,219,0.12)',
  } : inputStyle;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden" style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Form */}
      <div className="p-6 space-y-6">
        {/* Employer & Employee Info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', borderLeft: '3px solid #1a56db', paddingLeft: '0.75rem', marginBottom: '1.25rem', marginTop: '0.5rem' }}>Employer &amp; Employee Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Employer Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Acme Corp"
                style={getFocusStyle('employerName')}
                value={form.employerName}
                onChange={e => update('employerName', e.target.value)}
                onFocus={() => setFocusedField('employerName')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label style={labelStyle}>Employee Name</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Jane Smith"
                style={getFocusStyle('employeeName')}
                value={form.employeeName}
                onChange={e => update('employeeName', e.target.value)}
                onFocus={() => setFocusedField('employeeName')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label style={labelStyle}>Employee SSN (last 4 digits)</label>
              <input
                type="text"
                className={inputClass}
                placeholder="XXXX-XX-1234"
                maxLength={11}
                style={getFocusStyle('employeeSSN')}
                value={form.employeeSSN}
                onChange={e => update('employeeSSN', e.target.value)}
                onFocus={() => setFocusedField('employeeSSN')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <select
                className={inputClass}
                style={getFocusStyle('state')}
                value={form.state}
                onChange={e => update('state', e.target.value)}
                onFocus={() => setFocusedField('state')}
                onBlur={() => setFocusedField(null)}
              >
                {Object.entries(STATE_NAMES).map(([abbr, name]) => (
                  <option key={abbr} value={abbr}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pay Period */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', borderLeft: '3px solid #1a56db', paddingLeft: '0.75rem', marginBottom: '1.25rem', marginTop: '1.5rem' }}>Pay Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label style={labelStyle}>Pay Period Start</label>
              <input
                type="date"
                className={inputClass}
                placeholder="MM/DD/YYYY"
                style={getFocusStyle('payPeriodStart')}
                value={form.payPeriodStart}
                onChange={e => update('payPeriodStart', e.target.value)}
                onFocus={() => setFocusedField('payPeriodStart')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label style={labelStyle}>Pay Period End</label>
              <input
                type="date"
                className={inputClass}
                placeholder="MM/DD/YYYY"
                style={getFocusStyle('payPeriodEnd')}
                value={form.payPeriodEnd}
                onChange={e => update('payPeriodEnd', e.target.value)}
                onFocus={() => setFocusedField('payPeriodEnd')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label style={labelStyle}>Pay Date</label>
              <input
                type="date"
                className={inputClass}
                placeholder="MM/DD/YYYY"
                style={getFocusStyle('payDate')}
                value={form.payDate}
                onChange={e => update('payDate', e.target.value)}
                onFocus={() => setFocusedField('payDate')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
          </div>
          <div className="mt-4">
            <label style={labelStyle}>Pay Frequency</label>
            <select
              className={inputClass + ' md:w-1/2'}
              style={getFocusStyle('payFrequency')}
              value={form.payFrequency}
              onChange={e => update('payFrequency', e.target.value as keyof typeof PAY_PERIODS)}
              onFocus={() => setFocusedField('payFrequency')}
              onBlur={() => setFocusedField(null)}
            >
              {Object.entries(PAY_PERIOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Earnings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', borderLeft: '3px solid #1a56db', paddingLeft: '0.75rem', marginBottom: '1.25rem', marginTop: '1.5rem' }}>Earnings</h2>
          <div className="mb-4">
            <label style={labelStyle}>Pay Type</label>
            <div className="flex gap-4">
              {(['salary', 'hourly'] as const).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payType"
                    value={type}
                    checked={form.payType === type}
                    onChange={() => update('payType', type)}
                    className="text-primary-600"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {form.payType === 'salary' ? (
            <div className="md:w-1/2">
              <label style={labelStyle}>Gross Pay This Period ($)</label>
              <input
                type="number"
                className={inputClass}
                placeholder="3000.00"
                min="0"
                step="0.01"
                style={getFocusStyle('grossPay')}
                value={form.grossPay}
                onChange={e => update('grossPay', e.target.value)}
                onFocus={() => setFocusedField('grossPay')}
                onBlur={() => setFocusedField(null)}
              />
              {errors.grossPay && <p className={errorClass}>{errors.grossPay}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label style={labelStyle}>Hourly Rate ($)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="25.00"
                  min="0"
                  step="0.01"
                  style={getFocusStyle('hourlyRate')}
                  value={form.hourlyRate}
                  onChange={e => update('hourlyRate', e.target.value)}
                  onFocus={() => setFocusedField('hourlyRate')}
                  onBlur={() => setFocusedField(null)}
                />
                {errors.hourlyRate && <p className={errorClass}>{errors.hourlyRate}</p>}
              </div>
              <div>
                <label style={labelStyle}>Regular Hours</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="80"
                  min="0"
                  max="999"
                  step="0.5"
                  style={getFocusStyle('regularHours')}
                  value={form.regularHours}
                  onChange={e => update('regularHours', e.target.value)}
                  onFocus={() => setFocusedField('regularHours')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
              <div>
                <label style={labelStyle}>Overtime Hours</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="0"
                  min="0"
                  max="999"
                  step="0.5"
                  style={getFocusStyle('overtimeHours')}
                  value={form.overtimeHours}
                  onChange={e => update('overtimeHours', e.target.value)}
                  onFocus={() => setFocusedField('overtimeHours')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={calculate}
          className="w-full md:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          style={{ background: '#1a56db', color: 'white', fontSize: '17px', fontWeight: 700, padding: '14px 32px', borderRadius: '10px', border: 'none', cursor: 'pointer', width: '100%', marginTop: '16px', letterSpacing: '0.01em', transition: 'background 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1e40af')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1a56db')}
        >
          Calculate Pay Stub
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', borderLeft: '3px solid #1a56db', paddingLeft: '0.75rem', marginBottom: '1.25rem' }}>Pay Stub Summary</h2>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            {/* Earnings section */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Earnings</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-700">
                    {form.payType === 'salary' ? 'Salary' : 'Regular Pay'}
                    {form.payType === 'hourly' && (
                      <span className="text-gray-400 ml-1 text-xs">
                        ({form.regularHours} hrs @ {fmt(parseFloat(form.hourlyRate) || 0)}/hr)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">{fmt(results.gross)}</td>
                </tr>
                {form.payType === 'hourly' && parseFloat(form.overtimeHours) > 0 && (
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-3 text-gray-700">
                      Overtime Pay
                      <span className="text-gray-400 ml-1 text-xs">
                        ({form.overtimeHours} hrs @ {fmt((parseFloat(form.hourlyRate) || 0) * 1.5)}/hr)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">
                      {fmt((parseFloat(form.hourlyRate) || 0) * 1.5 * (parseFloat(form.overtimeHours) || 0))}
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-900">Gross Pay</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">{fmt(results.gross)}</td>
                </tr>
              </tbody>
            </table>

            {/* Deductions section */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 border-t">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deductions</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-700">Federal Income Tax</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">- {fmt(results.federalTax)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-700">Social Security (6.2%)</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">- {fmt(results.socialSecurity)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-700">Medicare (1.45%)</td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">- {fmt(results.medicare)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-700">
                    State Income Tax ({STATE_NAMES[form.state] || form.state})
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-red-600">- {fmt(results.stateTax)}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-900">Total Deductions</td>
                  <td className="px-4 py-3 text-right font-mono text-red-700">- {fmt(results.totalDeductions)}</td>
                </tr>
              </tbody>
            </table>

            {/* Net Pay */}
            <div className="px-4 py-4 bg-primary-600 text-white flex justify-between items-center" style={{ padding: '1rem', background: '#1a56db', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="font-bold text-lg">Net Pay</span>
              <span className="font-bold text-2xl font-mono">{fmt(results.net)}</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            * Estimates use 2024 federal tax brackets (single filer) and state effective rates. 
            Actual withholding may differ based on W-4 elections, filing status, and other factors. 
            Not tax advice.
          </p>

          <button
            onClick={downloadPDF}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#1a56db', color: 'white', fontWeight: 700, padding: '14px 32px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '17px', width: '100%', justifyContent: 'center', marginTop: '8px', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e40af')}
            onMouseLeave={e => (e.currentTarget.style.background = '#1a56db')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download PDF Pay Stub
          </button>
        </div>
      )}
    </div>
  );
}
