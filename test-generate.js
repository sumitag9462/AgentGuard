const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:4000/api/agents/A-124/generate-scenarios', {count: 2}, {
      headers: { 'x-api-key': 'default-dev-key' }
    });
    console.log("Success:", res.data);
  } catch(e) {
    console.error("Error:", e.response?.data || e.message);
  }
}
test();
