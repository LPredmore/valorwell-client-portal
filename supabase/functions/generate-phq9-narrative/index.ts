
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY");
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentData } = await req.json();
    
    // Validate the input data
    if (!assessmentData) {
      throw new Error("Assessment data is required");
    }

    // Extract relevant information from the assessment data
    const {
      question_1, question_2, question_3, question_4, question_5,
      question_6, question_7, question_8, question_9, total_score
    } = assessmentData;

    // Get interpretation based on total score
    const interpretation = getScoreInterpretation(total_score);

    // Create a prompt for the AI to generate a narrative
    const prompt = `
    Generate a concise clinical narrative for a PHQ-9 depression assessment based on the following scores (0-3 scale where 0 is "Not at all" and 3 is "Nearly every day"):

    1. Little interest or pleasure in doing things: ${question_1}
    2. Feeling down, depressed, or hopeless: ${question_2}
    3. Trouble falling or staying asleep, or sleeping too much: ${question_3}
    4. Feeling tired or having little energy: ${question_4}
    5. Poor appetite or overeating: ${question_5}
    6. Feeling bad about yourself or that you are a failure: ${question_6}
    7. Trouble concentrating: ${question_7}
    8. Moving or speaking slowly or being fidgety/restless: ${question_8}
    9. Thoughts of being better off dead or hurting yourself: ${question_9}

    Total Score: ${total_score} (${interpretation})

    The narrative should be in the third person, professionally written for a clinician's notes, and include:
    1. A brief summary of the most significant symptoms
    2. An analysis of the depression severity based on the total score
    3. Any particular areas of concern (especially note if Question 9 > 0)
    4. Use clinical language appropriate for a medical record
    
    Keep the narrative between 3-5 sentences and maintain a professional tone.
    `;

    // Call the DeepSeek API to generate the narrative
    console.log("Calling DeepSeek API to generate PHQ-9 narrative");
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are a clinical assistant that helps mental health professionals analyze PHQ-9 depression assessments."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent, clinical responses
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("DeepSeek API error:", errorData);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("DeepSeek API response received");
    
    // Extract the generated narrative from the API response
    const rawNarrative = data.choices[0]?.message?.content?.trim() || 
      `Patient scored ${total_score} on the PHQ-9 assessment, indicating ${interpretation}.`;
    
    // Clean the narrative to remove unwanted formatting
    const narrative = cleanNarrative(rawNarrative);

    // Return the generated narrative
    return new Response(
      JSON.stringify({ 
        success: true, 
        narrative,
        interpretation
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-phq9-narrative function:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        fallbackNarrative: "PHQ-9 assessment completed. Narrative generation failed."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to clean AI-generated narrative text
function cleanNarrative(text: string): string {
  if (!text) return text;
  
  let cleaned = text;
  
  // Remove common prefixes (case-insensitive)
  const prefixPatterns = [
    /^\*\*Clinical Narrative:\*\*\s*/i,
    /^\*\*Clinical Assessment:\*\*\s*/i,
    /^Clinical Narrative:\s*/i,
    /^Clinical Assessment:\s*/i,
    /^\*\*Assessment:\*\*\s*/i,
    /^Assessment:\s*/i
  ];
  
  for (const pattern of prefixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove word count suffixes
  const suffixPatterns = [
    /\s*\*\(Word count:.*?\)\*\s*$/i,
    /\s*\(Word count:.*?\)\s*$/i,
    /\s*\*\(.*?sentences\)\*\s*$/i,
    /\s*\(.*?sentences\)\s*$/i
  ];
  
  for (const pattern of suffixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove excessive markdown formatting
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold formatting
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1'); // Remove italic formatting
  
  // Clean up extra whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Helper function to interpret PHQ-9 scores
function getScoreInterpretation(score: number): string {
  if (score >= 0 && score <= 4) return "none-minimal depression";
  if (score >= 5 && score <= 9) return "mild depression";
  if (score >= 10 && score <= 14) return "moderate depression";
  if (score >= 15 && score <= 19) return "moderately severe depression";
  if (score >= 20) return "severe depression";
  return "unknown severity";
}
