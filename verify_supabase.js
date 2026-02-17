import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually since we don't want to rely on dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value.trim();
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = value.trim();
        }
    });
}

console.log('Checking Supabase connection...');
console.log(`URL: ${supabaseUrl}`);
// Mask key for safety in logs
console.log(`Key: ${supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'Not found'}`);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key.');
    process.exit(1);
}

const client = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
    try {
        const { data, error } = await client.from('games').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('Connection failed:', error.message);
        } else {
            console.log('Connection successful! Supabase is reachable.');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkConnection();
