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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userIds } = await req.json()

    if (!userIds || !Array.isArray(userIds)) {
      throw new Error('userIds array is required')
    }

    console.log(`Starting storage cleanup for ${userIds.length} users`)

    const buckets = ['clinical-documents', 'treatment-plans', 'session-notes', 'clinician-images']
    const deletionResults = []

    for (const bucket of buckets) {
      try {
        // List all files in the bucket
        const { data: files, error: listError } = await supabaseClient.storage
          .from(bucket)
          .list('', { limit: 1000 })

        if (listError) {
          console.warn(`Error listing files in bucket ${bucket}:`, listError)
          continue
        }

        if (!files || files.length === 0) {
          console.log(`No files found in bucket ${bucket}`)
          continue
        }

        // Filter files that belong to the users we're deleting
        const filesToDelete = []
        
        for (const file of files) {
          // Check if file path contains any of the user IDs
          const belongsToDeletedUser = userIds.some(userId => 
            file.name.includes(userId) || file.name.startsWith(userId)
          )
          
          if (belongsToDeletedUser) {
            filesToDelete.push(file.name)
          }
        }

        if (filesToDelete.length > 0) {
          console.log(`Deleting ${filesToDelete.length} files from bucket ${bucket}`)
          
          const { data: deleteResult, error: deleteError } = await supabaseClient.storage
            .from(bucket)
            .remove(filesToDelete)

          if (deleteError) {
            console.error(`Error deleting files from bucket ${bucket}:`, deleteError)
          } else {
            console.log(`Successfully deleted ${filesToDelete.length} files from bucket ${bucket}`)
            deletionResults.push({
              bucket,
              deletedFiles: filesToDelete.length,
              success: true
            })
          }
        } else {
          console.log(`No files to delete in bucket ${bucket}`)
          deletionResults.push({
            bucket,
            deletedFiles: 0,
            success: true
          })
        }

      } catch (bucketError) {
        console.error(`Error processing bucket ${bucket}:`, bucketError)
        deletionResults.push({
          bucket,
          error: bucketError.message,
          success: false
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Storage cleanup completed for ${userIds.length} users`,
        results: deletionResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Storage cleanup error:', error)
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