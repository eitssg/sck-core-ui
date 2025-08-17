import { corsHeaders } from '../_shared/cors.ts'

interface CompanySearchResult {
  id: string;
  name: string;
  // Add other fields as needed based on API response
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ companies: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for companies with query: ${query}`);

    // Call the external API
    const apiUrl = `https://monster-jj.jvj28.com/core/api/client/names?q=${encodeURIComponent(query)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch companies', companies: [] }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log(`Found ${Array.isArray(data) ? data.length : 0} companies`);

    return new Response(
      JSON.stringify({ companies: data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in company-search function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', companies: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});