import React, { useState, useEffect, useRef } from 'react';
import { IconMapPin } from './Icons';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  name?: string;
}

export const LocationAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  className,
  required,
  name,
}) => {
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [show, setShow] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Create persistent services
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    // Initialize Google Services when the component mounts
    if (window.google && !autocompleteService.current) {
      autocompleteService.current = new google.maps.places.AutocompleteService();
      sessionToken.current = new google.maps.places.AutocompleteSessionToken();
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = (input: string) => {
    if (!input || !autocompleteService.current) {
      setSuggestions([]);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      {
        input,
        sessionToken: sessionToken.current!,
        componentRestrictions: { country: 'za' }, // Restrict to South Africa
        types: ['geocode'], // Focus on addresses/suburbs, not specific business names
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShow(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // Debounce or delay if needed, but Google API handles fast typing well
    if (val.length > 2) {
      fetchSuggestions(val);
    } else {
      setShow(false);
    }
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    // Use the full description (e.g., "Sandton, Johannesburg, South Africa")
    onChange(prediction.description);
    setShow(false);

    // Refresh session token for the next search (saves money on billing)
    sessionToken.current = new google.maps.places.AutocompleteSessionToken();
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        name={name}
        className={className}
        placeholder={placeholder || 'Start typing an address...'}
        value={value}
        onChange={handleInput}
        onFocus={() => value.length > 2 && setShow(true)}
        required={required}
        autoComplete="off"
      />

      {show && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 mt-1.5 rounded-lg shadow-xl max-h-60 overflow-auto ring-1 ring-black ring-opacity-5 focus:outline-none">
          {suggestions.map((prediction) => (
            <li
              key={prediction.place_id}
              className="px-4 py-3 hover:bg-teal-50 cursor-pointer text-sm text-gray-700 flex items-start transition-colors duration-150 border-b border-gray-50 last:border-0"
              onClick={() => handleSelect(prediction)}
            >
              <IconMapPin className="w-4 h-4 mr-3 text-teal-500 flex-shrink-0 mt-0.5 opacity-75" />
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold truncate">
                  {prediction.structured_formatting.main_text}
                </span>
                <span className="text-xs text-gray-400 truncate">
                  {prediction.structured_formatting.secondary_text}
                </span>
              </div>
            </li>
          ))}
          {/* Requirement for Google API to show the logo */}
          <li className="px-4 py-2 bg-gray-50 text-[10px] text-right text-gray-400">
            Powered by Google
          </li>
        </ul>
      )}
    </div>
  );
};
