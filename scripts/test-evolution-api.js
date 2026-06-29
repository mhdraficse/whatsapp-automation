/**
 * Test Evolution API Connection
 * 
 * Usage:
 *   node scripts/test-evolution-api.js
 * 
 * This script tests your Evolution API configuration by:
 * 1. Checking if the API is reachable
 * 2. Listing all instances
 * 3. Getting connection status for client1
 * 4. Attempting to generate a QR code
 */

require('dotenv').config({ path: '.env.local' });

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'https://rafproj1-api.sitesv2.alburujits.com';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

if (!EVOLUTION_API_KEY) {
  console.error('❌ EVOLUTION_API_KEY not found in .env.local');
  console.error('Please set EVOLUTION_API_KEY in your .env.local file');
  process.exit(1);
}

console.log('🔍 Testing Evolution API Connection\n');
console.log(`Base URL: ${EVOLUTION_BASE_URL}`);
console.log(`API Key: ${EVOLUTION_API_KEY.substring(0, 8)}...${EVOLUTION_API_KEY.substring(EVOLUTION_API_KEY.length - 4)}\n`);

async function testAPI() {
  try {
    // Test 1: List all instances
    console.log('📋 Test 1: Fetching all instances...');
    const instancesResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!instancesResponse.ok) {
      console.error(`❌ Failed to fetch instances: ${instancesResponse.status} ${instancesResponse.statusText}`);
      const text = await instancesResponse.text();
      console.error(`Response: ${text}`);
      return;
    }

    const instances = await instancesResponse.json();
    console.log('✅ Successfully connected to Evolution API');
    console.log(`Found ${instances.length || 0} instance(s):`);
    
    if (Array.isArray(instances)) {
      instances.forEach((inst, i) => {
        console.log(`  ${i + 1}. ${inst.instanceName || inst.instance?.instanceName || JSON.stringify(inst)}`);
      });
    } else {
      console.log(JSON.stringify(instances, null, 2));
    }

    // Check if client1 exists
    const hasClient1 = Array.isArray(instances) && instances.some(
      inst => (inst.instanceName || inst.instance?.instanceName) === 'client1'
    );
    
    if (!hasClient1) {
      console.warn('\n⚠️  Warning: Instance "client1" not found in the list');
      console.warn('You may need to create it or update the instance name in the code');
      return;
    }

    console.log('\n✅ Instance "client1" found\n');

    // Test 2: Get connection status for client1
    console.log('📱 Test 2: Checking client1 connection status...');
    const statusResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/client1`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!statusResponse.ok) {
      console.error(`❌ Failed to get status: ${statusResponse.status} ${statusResponse.statusText}`);
      const text = await statusResponse.text();
      console.error(`Response: ${text}`);
      return;
    }

    const status = await statusResponse.json();
    console.log('✅ Connection status retrieved:');
    console.log(JSON.stringify(status, null, 2));

    const isConnected = status.instance?.state === 'open' || status.connectionStatus === 'open';
    
    if (isConnected) {
      console.log('\n✅ WhatsApp is CONNECTED');
      if (status.profileName) {
        console.log(`   Profile: ${status.profileName}`);
      }
      if (status.ownerJid) {
        const phone = status.ownerJid.split('@')[0];
        console.log(`   Phone: ${phone}`);
      }
    } else {
      console.log('\n⚠️  WhatsApp is DISCONNECTED');
      console.log('You can test QR code generation...\n');

      // Test 3: Generate QR code (only if disconnected)
      console.log('📷 Test 3: Attempting to generate QR code...');
      const qrResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/connect/client1`, {
        headers: {
          'apikey': EVOLUTION_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!qrResponse.ok) {
        console.error(`❌ Failed to generate QR: ${qrResponse.status} ${qrResponse.statusText}`);
        const text = await qrResponse.text();
        console.error(`Response: ${text}`);
        return;
      }

      const qrData = await qrResponse.json();
      console.log('✅ QR code generated successfully');
      
      if (qrData.pairingCode) {
        console.log(`   Pairing code: ${qrData.pairingCode}`);
      }
      if (qrData.base64 || qrData.qrcode?.base64) {
        console.log('   QR code image data received (base64)');
      }
    }

    console.log('\n✅ All tests passed! Your Evolution API is configured correctly.\n');

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testAPI();
