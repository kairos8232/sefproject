require('dotenv').config();
const supabase = require('../config/supabase');

async function checkRefreshTokenTable() {
  console.log('Checking refresh_tokens table...\n');
  
  try {
    // Try to query the table
    const { data, error, count } = await supabase
      .from('refresh_tokens')
      .select('*', { count: 'exact', head: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error querying refresh_tokens table:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      if (error.code === '42P01') {
        console.log('\n⚠️  Table does not exist! You need to run the schema.sql migration.');
      }
    } else {
      console.log('✅ refresh_tokens table exists!');
      console.log('Total rows:', count);
      console.log('Sample data:', JSON.stringify(data, null, 2));
    }
    
    // Try to insert a test record
    console.log('\n\nTrying to insert a test record...');
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Fake UUID
    const testHash = 'test_hash_' + Date.now();
    const { data: insertData, error: insertError } = await supabase
      .from('refresh_tokens')
      .insert([{
        user_id: testUserId,
        token_hash: testHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert failed:');
      console.error('Error code:', insertError.code);
      console.error('Error message:', insertError.message);
      
      if (insertError.code === '23503') {
        console.log('\n⚠️  Foreign key constraint failed (user does not exist)');
        console.log('This is expected for test data. The table structure is correct.');
      }
    } else {
      console.log('✅ Insert successful!');
      console.log('Inserted data:', insertData);
      
      // Clean up test data
      await supabase
        .from('refresh_tokens')
        .delete()
        .eq('id', insertData.id);
      console.log('Test data cleaned up.');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkRefreshTokenTable().then(() => {
  console.log('\nCheck complete.');
  process.exit(0);
});
