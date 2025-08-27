// Temporary script to execute user cleanup
// This will call our edge functions to complete the deletion process

const userIds = [
  '188fe3d5-ad53-4e93-bec5-c59a16870f55', // predmoreluke+bob@gmail.com
  '756eca03-c080-49e2-823b-a289544e014f', // test@gmail.com
  'fa5d2150-b8be-4c7a-be58-ee78599c7126', // info+deeds@gmail.com
  '60aa0db2-e5df-4ae5-b86a-54401a5cb344', // predmoreluke+zzzz@gmail.com
  '610c5604-97ac-421b-9258-5ac9ad526c17', // predmoreluke+testi@gmail.com
  '1d733149-a1a3-400c-a1f5-9a206de82daa', // predmoreluke+zzz@gmail.com
  '3983cb36-1c72-4bbf-83c6-3b6686a89ae7', // info+boucher@valorwell.org
  '43d09a05-9e60-43df-ac4b-554807bec44e', // predmoreluke@gmail.com
  'b7b9ad5d-dd3a-4c95-b3d0-6112dedcdc48', // predmoreluke+fake@gmail.com
  '8cc72d77-c510-4ca3-86fd-5e710661f18a', // predmoreluke+bobby@gmail.com
  '87fd6908-3ce7-46be-abe1-d5fc2aa2eab3'  // predmore+bobby@gmail.com
];

// Step 1: Clean up storage files
async function cleanupStorage() {
  try {
    const response = await fetch('https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/cleanup-user-storage', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_SERVICE_ROLE_KEY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userIds })
    });
    
    const result = await response.json();
    console.log('Storage cleanup result:', result);
    return result;
  } catch (error) {
    console.error('Storage cleanup failed:', error);
    return { success: false, error: error.message };
  }
}

// Step 2: Delete auth users
async function deleteAuthUsers() {
  try {
    const response = await fetch('https://gqlkritspnhjxfejvgfg.supabase.co/functions/v1/batch-delete-users', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_SERVICE_ROLE_KEY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userIds })
    });
    
    const result = await response.json();
    console.log('Auth user deletion result:', result);
    return result;
  } catch (error) {
    console.error('Auth user deletion failed:', error);
    return { success: false, error: error.message };
  }
}

// Execute cleanup
async function executeCleanup() {
  console.log('Starting complete user cleanup process...');
  
  console.log('Step 1: Cleaning up storage files...');
  const storageResult = await cleanupStorage();
  
  console.log('Step 2: Deleting auth users...');
  const authResult = await deleteAuthUsers();
  
  console.log('Cleanup process completed.');
  console.log('Storage cleanup success:', storageResult.success);
  console.log('Auth deletion success:', authResult.success);
  
  if (storageResult.success && authResult.success) {
    console.log('✅ All test users and their data have been completely removed!');
  } else {
    console.log('⚠️ Some operations failed. Check the results above for details.');
  }
}

// Note: Replace YOUR_SERVICE_ROLE_KEY with the actual service role key
// This script should be run manually after updating the authorization header