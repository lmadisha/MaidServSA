import React from 'react';
import { IconChevronDown } from '../Icons';
import { INPUT_CLASS, LABEL_CLASS } from './formStyles';

const FormSelect: React.FC<{
  label?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string | number; label: string }[];
  name?: string;
  required?: boolean;
  className?: string;
}> = ({ label, value, onChange, options, name, required, className }) => (
  <div className="relative">
    {label && <label className={LABEL_CLASS}>{label}</label>}
    <select
      name={name}
      required={required}
      value={value}
      onChange={onChange}
      className={`${INPUT_CLASS} appearance-none pr-10 cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 top-6">
      <IconChevronDown className="h-4 w-4" />
    </div>
  </div>
);

export default FormSelect;
