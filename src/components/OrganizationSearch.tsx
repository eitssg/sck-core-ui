import { useState, useEffect, useRef } from "react";
import { Building, ChevronDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Organization {
  id: string;
  name: string;
}

interface OrganizationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onOrganizationSelect?: (organization: Organization) => void;
}

export default function OrganizationSearch({ value, onChange, onOrganizationSelect }: OrganizationSearchProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
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
        await searchOrganizations(searchQuery.trim());
      } else {
        setOrganizations([]);
        setIsDropdownOpen(false);
      }
    }, 300);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchOrganizations = async (query: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('organization-search', {
        body: { q: query }
      });

      if (error) {
        console.error('Error searching organizations:', error);
        setOrganizations([]);
      } else {
        setOrganizations(data?.organizations || []);
        setIsDropdownOpen(true);
      }
    } catch (error) {
      console.error('Error searching organizations:', error);
      setOrganizations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
  };

  const handleOrganizationSelect = (organization: Organization) => {
    setSearchQuery(organization.name);
    onChange(organization.name);
    setIsDropdownOpen(false);
    onOrganizationSelect?.(organization);
  };

  const handleInputFocus = () => {
    if (organizations.length > 0) {
      setIsDropdownOpen(true);
    }
  };

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <Label htmlFor="organization">Organization</Label>
      <div className="relative">
        <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          id="organization"
          type="text"
          placeholder="Search for your organization..."
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="pl-10 pr-10"
          required
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {!isLoading && organizations.length > 0 && (
          <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Results dropdown */}
      {isDropdownOpen && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-card border shadow-lg">
          {organizations.length === 0 && !isLoading ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No Organization Found
            </div>
          ) : (
            <div className="py-1">
              {organizations.map((organization) => (
                <button
                  key={organization.id}
                  onClick={() => handleOrganizationSelect(organization)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    {organization.name}
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