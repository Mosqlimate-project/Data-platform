"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";

interface City {
  geocode: string;
  name: string;
  adm1: string;
  country: string;
}

interface CitySearchProps {
  value: number | undefined;
  onChange: (geocode: number) => void;
}

export default function CitySearch({ value, onChange }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const isSelectionRef = useRef(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSelectionRef.current) {
      isSelectionRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      if (!query || query.length < 3) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const isNumeric = /^\d+$/.test(query);
        const param = isNumeric ? "geocode" : "name";

        const res = await fetch(`/api/datastore/cities?${param}=${query}`);

        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (city: City) => {
    isSelectionRef.current = true;
    onChange(Number(city.geocode));
    setQuery(`${city.name} - ${city.adm1}`);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label className="text-sm font-medium mb-1 block"> City </label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          placeholder="Search by name or geocode"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        {loading && (
          <div className="absolute right-3 top-2.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="bg-bg absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <ul className="max-h-60 overflow-auto p-1">
            {results.map((city) => (
              <li
                key={city.geocode}
                onClick={() => handleSelect(city)}
                className="relative cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-white hover:text-accent-foreground"
              >
                <div className="font-medium">{city.name}</div>
                <div className="text-xs text-muted-foreground">
                  {city.adm1}, {city.country} • {city.geocode}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 3 && !loading && (
        <div className="bg-bg absolute z-50 mt-1 w-full p-2 text-sm text-muted-foreground bg-popover border rounded-md shadow-md text-center">
          No cities found.
        </div>
      )}
    </div>
  );
}
