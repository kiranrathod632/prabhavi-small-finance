// scripts/testVobizAuth.js
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const testAuth = async () => {
  const authId = process.env.VOBIZ_AUTH_ID;
  const authToken = process.env.VOBIZ_AUTH_TOKEN;
  const apiBase = process.env.VOBIZ_API_BASE || 'https://api.vobiz.ai/api/v1';

  try {
    // Test account info API (doesn't need a number)
    const response = await axios.get(`${apiBase}/Account/${authId}`, {
      headers: {
        'X-Auth-ID': authId,
        'X-Auth-Token': authToken,
      }
    });
    console.log('✅ Auth working!', response.data);
  } catch (error) {
    console.log('❌ Auth failed:', error.response?.data || error.message);
  }
};

testAuth();