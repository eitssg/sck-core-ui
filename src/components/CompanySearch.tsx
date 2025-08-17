import { useState, useEffect, useRef } from "react";
import { Building, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
}

interface CompanySearchProps {
  value: string;
  onChange: (value: string) => void;
  onCompanySelect?: (company: Company) => void;
}

export default function CompanySearch({ value, onChange, onCompanySelect }: CompanySearchProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        await searchCompanies(searchQuery.trim());
      } else {
        setCompanies([]);
        setIsDropdownOpen(false);
      }
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchCompanies = async (query: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('company-search', {
        body: { q: query }
      });

      if (error) {
        console.error('Error searching companies:', error);
        setCompanies([]);
      } else {
        setCompanies(data?.companies || []);
        setIsDropdownOpen(true);
      }
    } catch (error) {
      console.error('Error searching companies:', error);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
  };

  const handleCompanySelect = (company: Company) => {
    setSearchQuery(company.name);
    onChange(company.name);
    setIsDropdownOpen(false);
    onCompanySelect?.(company);
  };

  const handleInputFocus = () => {
    if (companies.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label htmlFor="company">Company</Label>
      <div className="relative">
        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          id="company"
          type="text"
          placeholder="Search for your company..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="pl-10 pr-10"
          required
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {!isLoading && companies.length > 0 && (
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {isDropdownOpen && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-card border shadow-lg">
          {companies.length === 0 && !isLoading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No Company Found
            </div>
          ) : (
            <div className="py-1">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleCompanySelect(company)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    {company.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}