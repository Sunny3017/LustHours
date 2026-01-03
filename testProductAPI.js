const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testProductAPI() {
    try {
        console.log('🚀 Testing Product Catalog API...\n');
        
        // 1. Login as Admin
        console.log('1. Logging in as Admin...');
        const loginRes = await axios.post(`${API_URL}/auth/admin/login`, {
            email: 'sunnychaudhary3792@gmail.com',
            password: 'vns3017'
        });
        const token = loginRes.data.data.token;
        console.log('✅ Admin Login successful!');

        // 2. Create Category
        console.log('\n2. Creating Category...');
        const categoryName = `Electronics_${Date.now()}`;
        const categoryRes = await axios.post(`${API_URL}/categories`, {
            name: categoryName,
            description: 'All kinds of electronics'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const categoryId = categoryRes.data.data._id;
        console.log('✅ Category created:', categoryRes.data.data.name);

        // 3. Create Product
        console.log('\n3. Creating Product...');
        const productRes = await axios.post(`${API_URL}/products`, {
            name: `iPhone 15 Pro ${Date.now()}`,
            description: 'The latest iPhone',
            price: 999,
            category: categoryId,
            brand: 'Apple',
            stock: 100,
            sku: `IP15-${Date.now()}`
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const productId = productRes.data.data._id;
        console.log('✅ Product created:', productRes.data.data.name);

        // 4. Get Products (Public)
        console.log('\n4. Getting Products (Public)...');
        const productsRes = await axios.get(`${API_URL}/products`);
        console.log('✅ Products retrieved:', productsRes.data.count);

        // 5. Get Single Product
        console.log('\n5. Getting Single Product...');
        const productRes2 = await axios.get(`${API_URL}/products/${productId}`);
        console.log('✅ Product retrieved:', productRes2.data.data.name);

        // 6. Update Product (Admin)
        console.log('\n6. Updating Product (Admin)...');
        const updateRes = await axios.put(`${API_URL}/products/${productId}`, {
            price: 1099,
            stock: 90
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Product updated. New Price:', updateRes.data.data.price);

        // 7. Delete Product (Admin)
        console.log('\n7. Deleting Product (Admin)...');
        await axios.delete(`${API_URL}/products/${productId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Product deleted');

        // 8. Delete Category (Admin)
        console.log('\n8. Deleting Category (Admin)...');
        await axios.delete(`${API_URL}/categories/${categoryId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Category deleted');

        console.log('\n🎉 All Product Catalog tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testProductAPI();
