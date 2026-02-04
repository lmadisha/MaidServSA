import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconMapPin } from './Icons';
import { loadGoogleMaps } from '../services/googleMaps.ts';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  name?: string;
}

type UiSuggestion = {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export const LocationAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  className,
  required,
  name,
}) => {
  const [suggestions, setSuggestions] = useState<UiSuggestion[]>([]);
  const [show, setShow] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Legacy services (only used if available / allowed)
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const listboxId = useMemo(() => `loc-listbox-${Math.random().toString(36).slice(2)}`, []);

  const ensurePlacesReady = async () => {
    await loadGoogleMaps();
    if (google.maps.importLibrary) {
      await google.maps.importLibrary('places');
    }

    if (!sessionToken.current) {
      sessionToken.current = new google.maps.places.AutocompleteSessionToken();
    }

    // Only init legacy if it exists in this account/build
    if (!autocompleteService.current && (google.maps.places as any)?.AutocompleteService) {
      try {
        autocompleteService.current = new google.maps.places.AutocompleteService();
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    void ensurePlacesReady();

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShow(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (input: string) => {
    if (!input || input.trim().length < 3) {
      setSuggestions([]);
      setShow(false);
      setActiveIndex(-1);
      return;
    }

    await ensurePlacesReady();

    const AnyPlaces = google.maps.places as any;

    // ✅ New API (recommended)
    if (AnyPlaces?.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
      const res = await AnyPlaces.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionToken.current!,
      });

      const mapped: UiSuggestion[] = (res?.suggestions ?? [])
        .map((s: any) => s?.placePrediction)
        .filter(Boolean)
        .map((p: any) => {
          const description = p.text?.toString?.() ?? String(p.text ?? '');
          const mainText = p.structuredFormat?.mainText?.toString?.() ?? '';
          const secondaryText = p.structuredFormat?.secondaryText?.toString?.() ?? '';
          return {
            id: p.placeId ?? description,
            description,
            mainText,
            secondaryText,
          };
        });

      setSuggestions(mapped);
      setShow(mapped.length > 0);
      setActiveIndex(mapped.length > 0 ? 0 : -1);
      return;
    }

    // ✅ Legacy fallback (older customers)
    if (autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionToken.current!,
          componentRestrictions: { country: 'za' },
          types: ['geocode'],
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const mapped: UiSuggestion[] = predictions.map((p) => ({
              id: p.place_id,
              description: p.description,
              mainText: p.structured_formatting?.main_text ?? '',
              secondaryText: p.structured_formatting?.secondary_text ?? '',
            }));
            setSuggestions(mapped);
            setShow(mapped.length > 0);
            setActiveIndex(mapped.length > 0 ? 0 : -1);
          } else {
            setSuggestions([]);
            setShow(false);
            setActiveIndex(-1);
          }
        }
      );
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void fetchSuggestions(val);
    }, 180);
  };

  const handleSelect = (s: UiSuggestion) => {
    onChange(s.description);
    setShow(false);
    setActiveIndex(-1);
    // Refresh session token (billing best practice)
    sessionToken.current = new google.maps.places.AutocompleteSessionToken();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && suggestions.length > 0) {
      setShow(true);
      setActiveIndex(0);
      return;
    }

    if (!show) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShow(false);
      setActiveIndex(-1);
    }
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
        onKeyDown={handleKeyDown}
        onFocus={() => value.trim().length >= 3 && suggestions.length > 0 && setShow(true)}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
      />

      {show && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-[9999] w-full mt-1.5 rounded-lg shadow-xl max-h-60 overflow-auto
                     bg-white border border-gray-200 ring-1 ring-black/5
                     dark:bg-slate-900 dark:border-slate-700"
        >
          {suggestions.map((s, idx) => {
            const active = idx === activeIndex;
            const title = s.mainText?.trim() ? s.mainText : s.description; // ✅ fallback so text never “disappears”
            return (
              <li
                id={`${listboxId}-opt-${idx}`}
                key={s.id}
                role="option"
                aria-selected={active}
                className={[
                  'px-4 py-3 cursor-pointer text-sm flex items-start border-b last:border-0',
                  'border-gray-50 dark:border-slate-800',
                  active
                    ? 'bg-teal-50 dark:bg-slate-800'
                    : 'hover:bg-teal-50/70 dark:hover:bg-slate-800',
                ].join(' ')}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => e.preventDefault()} // keeps focus on input
                onClick={() => handleSelect(s)}
              >
                <IconMapPin className="w-4 h-4 mr-3 text-teal-500 flex-shrink-0 mt-0.5 opacity-75" />
                <div className="flex flex-col overflow-hidden">
                  <span className="font-semibold truncate text-slate-900 dark:text-slate-100">
                    {title}
                  </span>
                  {s.secondaryText?.trim() ? (
                    <span className="text-xs truncate text-slate-500 dark:text-slate-400">
                      {s.secondaryText}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
          <li className="px-4 py-2 bg-gray-50 text-[10px] text-right text-gray-400 dark:bg-slate-950 dark:text-slate-500">
            Powered by Google
          </li>
        </ul>
      )}
    </div>
  );
};
