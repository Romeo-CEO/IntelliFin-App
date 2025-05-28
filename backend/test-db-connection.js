const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'intellifin-core',
    user: 'intellifin-core',
    password: 'Chizzy@1!',
  });

  try {
    console.log('🔌 Attempting to connect to PostgreSQL...');
    await client.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    
    await client.end();
    console.log('🔌 Connection closed.');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
  }
}

testConnection();
