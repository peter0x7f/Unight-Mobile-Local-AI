// Test script for Agent endpoints
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_URL = 'http://127.0.0.1:8000';
let authToken = '';
let agentId = '';
let conversationId = '';

async function test() {
    try {
        console.log('🔐 Testing Authentication...\n');

        // 1. Login
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'mal',
                password: 'password' // Update this with the actual password
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.statusText}`);
        }

        const loginData = await loginRes.json();
        authToken = loginData.token;
        console.log('✅ Login successful');
        console.log('   Token:', authToken.substring(0, 20) + '...');
        console.log('   User:', loginData.user.username);
        console.log();

        // 2. Create an Agent
        console.log('🤖 Testing POST /api/agents...\n');
        const createAgentRes = await fetch(`${BASE_URL}/api/agents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: 'Rowan Orchestrator',
                type: 'orchestrator'
            })
        });

        if (!createAgentRes.ok) {
            throw new Error(`Create agent failed: ${createAgentRes.statusText}`);
        }

        const agentData = await createAgentRes.json();
        agentId = agentData.id;
        console.log('✅ Agent created successfully');
        console.log('   ID:', agentData.id);
        console.log('   Name:', agentData.name);
        console.log('   Type:', agentData.type);
        console.log('   Created:', agentData.created_at);
        console.log();

        // 3. Get all agents
        console.log('📋 Testing GET /api/agents...\n');
        const getAgentsRes = await fetch(`${BASE_URL}/api/agents`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!getAgentsRes.ok) {
            throw new Error(`Get agents failed: ${getAgentsRes.statusText}`);
        }

        const agentsData = await getAgentsRes.json();
        console.log('✅ Agents retrieved successfully');
        console.log('   Total agents:', agentsData.length);
        agentsData.forEach((agent, i) => {
            console.log(`   ${i + 1}. ${agent.name} (${agent.type}) - ID: ${agent.id}`);
        });
        console.log();

        // 4. Get specific agent
        console.log('🔍 Testing GET /api/agents/:id...\n');
        const getAgentRes = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!getAgentRes.ok) {
            throw new Error(`Get agent failed: ${getAgentRes.statusText}`);
        }

        const singleAgentData = await getAgentRes.json();
        console.log('✅ Agent retrieved successfully');
        console.log('   Name:', singleAgentData.name);
        console.log('   Type:', singleAgentData.type);
        console.log('   ID:', singleAgentData.id);
        console.log();

        // 5. Create a conversation with agent_id
        console.log('💬 Testing POST /api/conversations with agent_id...\n');
        const createConvRes = await fetch(`${BASE_URL}/api/conversations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                title: 'Test Conversation with Agent',
                agent_id: agentId
            })
        });

        if (!createConvRes.ok) {
            throw new Error(`Create conversation failed: ${createConvRes.statusText}`);
        }

        const convData = await createConvRes.json();
        conversationId = convData.id;
        console.log('✅ Conversation created successfully');
        console.log('   ID:', convData.id);
        console.log('   Title:', convData.title);
        console.log('   Agent ID:', convData.agent_id);
        console.log('   Created:', convData.created_at);
        console.log();

        // 6. Get all conversations (should include agent_id)
        console.log('📚 Testing GET /api/conversations...\n');
        const getConvsRes = await fetch(`${BASE_URL}/api/conversations`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!getConvsRes.ok) {
            throw new Error(`Get conversations failed: ${getConvsRes.statusText}`);
        }

        const convsData = await getConvsRes.json();
        console.log('✅ Conversations retrieved successfully');
        console.log('   Total conversations:', convsData.length);
        convsData.slice(0, 3).forEach((conv, i) => {
            console.log(`   ${i + 1}. ${conv.title || '(no title)'} - Agent: ${conv.agent_id || 'none'}`);
        });
        console.log();

        console.log('🎉 All tests passed successfully!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

test();
