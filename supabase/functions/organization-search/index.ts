import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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
        JSON.stringify({ organizations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching for organizations with query: ${query}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Search organizations in the database
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('name, client')
      .or(`name.ilike.%${query}%,client.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Database error', organizations: [] }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Found ${organizations?.length || 0} organizations`)

    // Transform to match expected format
    const results = organizations?.map(org => ({
      id: org.client, // Use client slug as ID
      name: org.name
    })) || []

    return new Response(
      JSON.stringify({ organizations: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in organization-search function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', organizations: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});