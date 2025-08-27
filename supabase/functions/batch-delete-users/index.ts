import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userIds } = await req.json()

    if (!userIds || !Array.isArray(userIds)) {
      throw new Error('userIds array is required')
    }

    console.log(`Starting deletion of ${userIds.length} users`)

    const deletionResults = []

    // Delete each user from auth.users
    for (const userId of userIds) {
      try {
        const { data, error } = await supabase.auth.admin.deleteUser(userId)
        
        if (error) {
          console.error(`Error deleting user ${userId}:`, error)
          deletionResults.push({
            userId,
            success: false,
            error: error.message
          })
        } else {
          console.log(`Successfully deleted user ${userId}`)
          deletionResults.push({
            userId,
            success: true
          })
        }
      } catch (userError) {
        console.error(`Exception deleting user ${userId}:`, userError)
        deletionResults.push({
          userId,
          success: false,
          error: userError.message
        })
      }
    }

    const successCount = deletionResults.filter(r => r.success).length
    const failureCount = deletionResults.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: failureCount === 0,
        message: `User deletion completed: ${successCount} successful, ${failureCount} failed`,
        results: deletionResults,
        summary: {
          total: userIds.length,
          successful: successCount,
          failed: failureCount
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Batch user deletion error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})