const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1/auth/user';

async function testUserAPI() {
    try {
        console.log('🚀 Testing User Management API...\n');
        
        const timestamp = Date.now();
        const testUser = {
            username: `user_${timestamp}`,
            email: `user_${timestamp}@example.com`,
            password: 'password123'
        };

        // 1. Test Register
        console.log('1. Testing Register...');
        const registerRes = await axios.post(`${API_URL}/register`, testUser);
        console.log('✅ Register successful!');
        console.log('Token:', registerRes.data.token.substring(0, 20) + '...');
        let token = registerRes.data.token;
        
        // 2. Test Login
        console.log('\n2. Testing Login...');
        const loginRes = await axios.post(`${API_URL}/login`, {
            email: testUser.email,
            password: testUser.password
        });
        console.log('✅ Login successful!');
        token = loginRes.data.token; // Update token just in case

        // 3. Test Get Me
        console.log('\n3. Testing Get Me...');
        const meRes = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Get Me successful!');
        console.log('User:', meRes.data.data.email);

        // 4. Test Update Details
        console.log('\n4. Testing Update Details...');
        const updateRes = await axios.put(`${API_URL}/updatedetails`, {
            username: `updated_${timestamp}`,
            phoneNumber: '1234567890'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Update Details successful!');
        console.log('New Username:', updateRes.data.data.username);

        // 5. Test Add Address
        console.log('\n5. Testing Add Address...');
        const address = {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA',
            isDefault: true
        };
        const addressRes = await axios.post(`${API_URL}/address`, address, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Add Address successful!');
        const addressId = addressRes.data.data.addresses[0]._id;
        console.log('Address ID:', addressId);

        // 6. Test Update Address
        console.log('\n6. Testing Update Address...');
        const updateAddressRes = await axios.put(`${API_URL}/address/${addressId}`, {
            street: '456 Broadway'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Update Address successful!');
        console.log('New Street:', updateAddressRes.data.data.addresses.find(a => a._id == addressId).street);

        // 7. Test Delete Address
        console.log('\n7. Testing Delete Address...');
        const deleteAddressRes = await axios.delete(`${API_URL}/address/${addressId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Delete Address successful!');
        const hasAddress = deleteAddressRes.data.data.addresses.find(a => a._id == addressId);
        if (!hasAddress) {
            console.log('Address successfully removed from array');
        } else {
            console.log('❌ Address still exists!');
        }

        console.log('\n🎉 All User tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testUserAPI();
