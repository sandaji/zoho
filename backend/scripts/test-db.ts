import 'dotenv/config'; // Make sure you have dotenv installed
import pg from 'pg';

const { Pool } = pg;

async function testConnection() {
  const url = process.env.DATABASE_URL;
  
  if (!url) {
    console.error("❌ DATABASE_URL is missing from .env");
    return;
  }

  // Mask password for safe logging
  const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
  console.log(`🔌 Attempting to connect to: ${maskedUrl}`);
  console.log(`💻 Detected as Localhost: ${url.includes('localhost') || url.includes('127.0.0.1')}`);

  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');

  const pool = new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false }, // Same logic as your app
    connectionTimeoutMillis: 5000, // Fail fast (5 seconds)
  });

  try {
    const client = await pool.connect();
    console.log("✅ SUCCESS! Connected to database via pg driver.");
    
    const res = await client.query('SELECT 1 as health_check');
    console.log("📝 Query Result:", res.rows[0]);
    
    client.release();
  } catch (error: any) {
    console.error("\n❌ CONNECTION FAILED");
    console.error("---------------------");
    console.error("Error Code:", error.code);
    console.error("Message:", error.message);
    
    if (error.message.includes('ETIMEDOUT')) {
        console.log("\n💡 TIP: The server is not responding. Check Host/IP and Port.");
        if (isLocal) console.log("👉 Check if Postgres service is running.");
        else console.log("👉 Check if Cloud DB is paused or Firewall is blocking port 5432.");
    }
    if (error.message.includes('password authentication failed')) {
        console.log("\n💡 TIP: Your username or password in .env is incorrect.");
    }
  } finally {
    await pool.end();
  }
}

testConnection();