import React from 'react';
import { IconChevronDown } from '../Icons';

const INPUT_CLASS =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm px-4 py-2.5 bg-white text-gray-900 placeholder-gray-400 transition-colors duration-200 border';
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1';

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
