import React, { useState, useEffect, useRef } from 'react';
import { IconMapPin } from './Icons';

const SA_LOCATIONS = [
  "Cape Town City Centre", "Sea Point, Cape Town", "Green Point, Cape Town", "Camps Bay, Cape Town", "Clifton, Cape Town", 
  "Gardens, Cape Town", "Vredehoek, Cape Town", "Woodstock, Cape Town", "Observatory, Cape Town", "Claremont, Cape Town", 
  "Newlands, Cape Town", "Rondebosch, Cape Town", "Constantia, Cape Town", "Wynberg, Cape Town", "Hout Bay, Cape Town", "Bloubergstrand, Cape Town", "Durbanville, Cape Town",
  "Johannesburg Central", "Sandton, Johannesburg", "Rosebank, Johannesburg", "Bryanston, Johannesburg", "Fourways, Johannesburg", 
  "Randburg, Johannesburg", "Midrand, Johannesburg", "Soweto, Johannesburg", "Melville, Johannesburg", "Parkhurst, Johannesburg", "Bedfordview, Johannesburg",
  "Pretoria Central", "Centurion, Pretoria", "Hatfield, Pretoria", "Menlyn, Pretoria", "Lynnwood, Pretoria",
  "Durban Central", "Umhlanga, Durban", "Ballito, Durban", "Morningside, Durban", "Berea, Durban",
  "Port Elizabeth", "East London", "Bloemfontein", "Stellenbosch", "Somerset West", "George", "Knysna", "Plettenberg Bay"
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  name?: string;
}

export const LocationAutocomplete: React.FC<Props> = ({ value, onChange, placeholder, className, required, name }) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (val.length > 0) {
      const filtered = SA_LOCATIONS.filter(loc => loc.toLowerCase().includes(val.toLowerCase()));
      setSuggestions(filtered);
      setShow(true);
    } else {
      setShow(false);
    }
  };

  const handleSelect = (loc: string) => {
    onChange(loc);
    setShow(false);
  };

  const handleFocus = () => {
    if (value.length > 0) {
      const filtered = SA_LOCATIONS.filter(loc => loc.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered);
      setShow(true);
    }
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        name={name}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={handleInput}
        onFocus={handleFocus}
        required={required}
        autoComplete="off"
      />
      {show && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1.5 rounded-lg shadow-xl max-h-60 overflow-auto ring-1 ring-black ring-opacity-5 focus:outline-none transform transition-all ease-out duration-100 origin-top">
          {suggestions.map((loc) => (
            <li
              key={loc}
              className="px-4 py-3 hover:bg-teal-50 cursor-pointer text-sm text-gray-700 flex items-center transition-colors duration-150 border-b border-gray-50 last:border-0"
              onClick={() => handleSelect(loc)}
            >
              <IconMapPin className="w-4 h-4 mr-3 text-teal-500 flex-shrink-0 opacity-75" />
              <span className="truncate font-medium">{loc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};