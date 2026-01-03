const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1/auth/admin';

async function testAPI() {
    try {
        console.log('🚀 Testing Admin System API...\n');
        
        // 1. Test login
        console.log('1. Testing Login...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: 'sunnychaudhary3792@gmail.com',
            password: 'vns3017'
        });
        
        console.log('✅ Login successful!');
        console.log('Token:', loginRes.data.data.token.substring(0, 50) + '...');
        const token = loginRes.data.data.token;
        
        // 2. Test get current admin
        console.log('\n2. Testing Get Current Admin...');
        const meRes = await axios.get(`${API_URL}/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log('✅ Current admin retrieved!');
        console.log('Admin:', meRes.data.data.email);
        console.log('Role:', meRes.data.data.role);
        
        // 3. Test get all admins (superadmin only)
        console.log('\n3. Testing Get All Admins...');
        const adminsRes = await axios.get(`${API_URL}/admins`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        console.log('✅ Admins retrieved!');
        console.log('Total admins:', adminsRes.data.count);
        
        console.log('\n🎉 All tests passed! Your API is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testAPI();