#!/usr/bin/env node

/**
 * Supabase Real-time Subscriptions Test Script
 * Tests real-time functionality for all tables and event types
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('⚡ ACE CRM Real-time Subscriptions Test');
console.log('======================================\n');

const tables = [
  'users', 'companies', 'contacts', 'leads', 'deals',
  'projects', 'tasks', 'activities', 'invoices'
];

const eventTypes = ['INSERT', 'UPDATE', 'DELETE'];

let testResults = {
  connections: {},
  subscriptions: {},
  events: {},
  errors: []
};

let testData = {};

async function createTestClients() {
  console.log('🔌 Creating test clients...\n');
  
  const clients = {
    publisher: createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }),
    subscriber: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 20
        }
      }
    })
  };
  
  console.log('   ✅ Publisher client created (service role)');
  console.log('   ✅ Subscriber client created (anonymous)');
  
  return clients;
}

async function testBasicRealtimeConnection(client) {
  console.log('\n1. Testing Basic Real-time Connection...');
  
  return new Promise((resolve) => {
    const channel = client
      .channel('test-connection', {
        config: {
          broadcast: { self: true }
        }
      })
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('   ✅ Real-time broadcast working');
        testResults.connections.broadcast = true;
        resolve(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Real-time connection established');
          testResults.connections.websocket = true;
          
          // Test broadcast
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'test',
              payload: { message: 'Hello Real-time!' }
            });
          }, 1000);
          
          // Cleanup after test
          setTimeout(() => {
            client.removeChannel(channel);
            if (!testResults.connections.broadcast) {
              console.log('   ⚠️  Real-time broadcast not working');
              resolve(false);
            }
          }, 3000);
        } else if (status === 'CHANNEL_ERROR') {
          console.log('   ❌ Real-time connection failed');
          testResults.errors.push('Real-time connection failed');
          resolve(false);
        } else if (status === 'TIMED_OUT') {
          console.log('   ❌ Real-time connection timed out');
          testResults.errors.push('Real-time connection timed out');
          resolve(false);
        }
      });
  });
}

async function subscribeToTableChanges(client, tableName) {
  console.log(`\n📡 Setting up subscription for table: ${tableName}`);
  
  const eventsReceived = {
    INSERT: false,
    UPDATE: false,
    DELETE: false
  };
  
  return new Promise((resolve) => {
    const channel = client
      .channel(`${tableName}-changes`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: tableName 
        }, 
        (payload) => {
          console.log(`   📨 ${tableName}: ${payload.eventType} event received`);
          eventsReceived[payload.eventType] = true;
          
          // Store event details
          if (!testResults.events[tableName]) {
            testResults.events[tableName] = [];
          }
          testResults.events[tableName].push({
            eventType: payload.eventType,
            timestamp: new Date().toISOString(),
            payload: payload
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`   ✅ Subscribed to ${tableName} changes`);
          testResults.subscriptions[tableName] = {
            status: 'subscribed',
            events: eventsReceived,
            channel: channel
          };
          resolve(channel);
        } else if (status === 'CHANNEL_ERROR') {
          console.log(`   ❌ Failed to subscribe to ${tableName}`);
          testResults.subscriptions[tableName] = {
            status: 'error',
            events: eventsReceived,
            channel: null
          };
          testResults.errors.push(`Failed to subscribe to ${tableName}`);
          resolve(null);
        }
      });
  });
}

function getTestDataForTable(tableName) {
  const timestamp = Date.now();
  const baseData = {
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  switch (tableName) {
    case 'companies':
      return {
        ...baseData,
        name: `Realtime Test Company ${timestamp}`,
        status: 'active'
      };
      
    case 'contacts':
      return {
        ...baseData,
        first_name: 'Realtime',
        last_name: `Test ${timestamp}`,
        email: `realtime.test.${timestamp}@example.com`,
        status: 'active'
      };
      
    case 'leads':
      return {
        ...baseData,
        title: `Realtime Test Lead ${timestamp}`,
        status: 'new',
        priority: 'medium',
        probability: 0
      };
      
    case 'deals':
      return {
        ...baseData,
        title: `Realtime Test Deal ${timestamp}`,
        stage: 'discovery',
        value: 1000,
        currency: 'USD',
        probability: 25
      };
      
    case 'projects':
      return {
        ...baseData,
        name: `Realtime Test Project ${timestamp}`,
        status: 'planned',
        priority: 'medium'
      };
      
    case 'tasks':
      return {
        ...baseData,
        title: `Realtime Test Task ${timestamp}`,
        status: 'todo',
        priority: 'medium'
      };
      
    case 'activities':
      return {
        ...baseData,
        subject: `Realtime Test Activity ${timestamp}`,
        body: 'Test activity for real-time validation',
        activity_date: new Date().toISOString(),
        related_to_type: 'contact',
        related_to_id: '00000000-0000-0000-0000-000000000000'
      };
      
    case 'invoices':
      return {
        ...baseData,
        invoice_number: `RT-${timestamp}`,
        status: 'draft',
        subtotal: 1000,
        tax_amount: 0,
        total_amount: 1000,
        issue_date: new Date().toISOString().split('T')[0]
      };
      
    default:
      return baseData;
  }
}

async function testInsertEvent(publisherClient, tableName) {
  console.log(`   ✏️  Testing INSERT event for ${tableName}...`);
  
  try {
    const testRecord = getTestDataForTable(tableName);
    
    const { data, error } = await publisherClient
      .from(tableName)
      .insert(testRecord)
      .select();
    
    if (error) {
      console.log(`   ❌ INSERT failed: ${error.message}`);
      return null;
    }
    
    console.log(`   ✅ INSERT successful`);
    return data[0];
    
  } catch (error) {
    console.log(`   ❌ INSERT exception: ${error.message}`);
    return null;
  }
}

async function testUpdateEvent(publisherClient, tableName, recordId) {
  console.log(`   ✏️  Testing UPDATE event for ${tableName}...`);
  
  try {
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Add table-specific update data
    switch (tableName) {
      case 'companies':
        updateData.description = 'Updated by real-time test';
        break;
      case 'contacts':
        updateData.notes = 'Updated by real-time test';
        break;
      case 'leads':
      case 'deals':
        updateData.priority = 'high';
        break;
      case 'projects':
        updateData.status = 'active';
        break;
      case 'tasks':
        updateData.status = 'in_progress';
        break;
      case 'activities':
        updateData.body = 'Updated by real-time test';
        break;
      case 'invoices':
        updateData.notes = 'Updated by real-time test';
        break;
    }
    
    const { data, error } = await publisherClient
      .from(tableName)
      .update(updateData)
      .eq('id', recordId)
      .select();
    
    if (error) {
      console.log(`   ❌ UPDATE failed: ${error.message}`);
      return false;
    }
    
    console.log(`   ✅ UPDATE successful`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ UPDATE exception: ${error.message}`);
    return false;
  }
}

async function testDeleteEvent(publisherClient, tableName, recordId) {
  console.log(`   ✏️  Testing DELETE event for ${tableName}...`);
  
  try {
    const { error } = await publisherClient
      .from(tableName)
      .delete()
      .eq('id', recordId);
    
    if (error) {
      console.log(`   ❌ DELETE failed: ${error.message}`);
      return false;
    }
    
    console.log(`   ✅ DELETE successful`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ DELETE exception: ${error.message}`);
    return false;
  }
}

async function testTableRealtimeEvents(publisherClient, subscriberClient, tableName) {
  console.log(`\n🔄 Testing real-time events for: ${tableName}`);
  
  // Set up subscription
  const channel = await subscribeToTableChanges(subscriberClient, tableName);
  
  if (!channel) {
    console.log(`   ⚠️  Skipping ${tableName} - subscription failed`);
    return;
  }
  
  // Wait for subscription to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Test INSERT
    const insertedRecord = await testInsertEvent(publisherClient, tableName);
    
    if (insertedRecord) {
      testData[tableName] = insertedRecord;
      
      // Wait for real-time event
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test UPDATE
      await testUpdateEvent(publisherClient, tableName, insertedRecord.id);
      
      // Wait for real-time event
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Test DELETE
      await testDeleteEvent(publisherClient, tableName, insertedRecord.id);
      
      // Wait for real-time event
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
  } catch (error) {
    console.log(`   ❌ Real-time testing failed for ${tableName}: ${error.message}`);
    testResults.errors.push(`Real-time testing failed for ${tableName}: ${error.message}`);
  }
  
  // Clean up subscription
  subscriberClient.removeChannel(channel);
}

async function testCustomChannels(client) {
  console.log('\n📻 Testing Custom Channels...');
  
  return new Promise((resolve) => {
    let messagesReceived = 0;
    const expectedMessages = 3;
    
    const channel = client
      .channel('custom-test-channel')
      .on('broadcast', { event: 'custom-event' }, (payload) => {
        messagesReceived++;
        console.log(`   📨 Custom message ${messagesReceived}: ${payload.message}`);
        
        if (messagesReceived >= expectedMessages) {
          console.log('   ✅ Custom channels working correctly');
          testResults.connections.customChannels = true;
          client.removeChannel(channel);
          resolve(true);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Custom channel subscribed');
          
          // Send test messages
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'custom-event',
              payload: { message: 'Test message 1' }
            });
          }, 1000);
          
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'custom-event',
              payload: { message: 'Test message 2' }
            });
          }, 2000);
          
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'custom-event',
              payload: { message: 'Test message 3' }
            });
          }, 3000);
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (messagesReceived < expectedMessages) {
              console.log('   ❌ Custom channel test timed out');
              testResults.errors.push('Custom channel test timed out');
              client.removeChannel(channel);
              resolve(false);
            }
          }, 10000);
          
        } else if (status === 'CHANNEL_ERROR') {
          console.log('   ❌ Custom channel subscription failed');
          testResults.errors.push('Custom channel subscription failed');
          resolve(false);
        }
      });
  });
}

async function generateRealtimeReport() {
  console.log('\n======================================');
  console.log('📊 Real-time Testing Summary Report');
  console.log('======================================\n');
  
  // Connection summary
  console.log('🔌 Connection Tests:');
  console.log(`   WebSocket: ${testResults.connections.websocket ? '✅' : '❌'}`);
  console.log(`   Broadcast: ${testResults.connections.broadcast ? '✅' : '❌'}`);
  console.log(`   Custom Channels: ${testResults.connections.customChannels ? '✅' : '❌'}\n`);
  
  // Subscription summary
  console.log('📡 Table Subscriptions:');
  const subscribedTables = Object.keys(testResults.subscriptions)
    .filter(table => testResults.subscriptions[table].status === 'subscribed').length;
  const totalTables = Object.keys(testResults.subscriptions).length;
  
  console.log(`   Successful: ${subscribedTables}/${totalTables} tables\n`);
  
  Object.keys(testResults.subscriptions).forEach(table => {
    const sub = testResults.subscriptions[table];
    const status = sub.status === 'subscribed' ? '✅' : '❌';
    console.log(`   ${table}: ${status}`);
  });
  
  // Event summary
  console.log('\n⚡ Real-time Events:');
  const totalEvents = Object.keys(testResults.events).reduce((sum, table) => {
    return sum + (testResults.events[table] ? testResults.events[table].length : 0);
  }, 0);
  
  console.log(`   Total events received: ${totalEvents}\n`);
  
  Object.keys(testResults.events).forEach(table => {
    const events = testResults.events[table] || [];
    const eventTypes = events.map(e => e.eventType);
    const insertCount = eventTypes.filter(e => e === 'INSERT').length;
    const updateCount = eventTypes.filter(e => e === 'UPDATE').length;
    const deleteCount = eventTypes.filter(e => e === 'DELETE').length;
    
    console.log(`   ${table}: INSERT(${insertCount}) UPDATE(${updateCount}) DELETE(${deleteCount})`);
  });
  
  // Error summary
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // Performance insights
  console.log('\n📈 Performance Insights:');
  const avgEventsPerTable = totalEvents / Math.max(Object.keys(testResults.events).length, 1);
  console.log(`   Average events per table: ${avgEventsPerTable.toFixed(1)}`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (!testResults.connections.websocket) {
    console.log('   ⚠️  WebSocket connection failed - check firewall/proxy settings');
  }
  
  if (subscribedTables < totalTables) {
    console.log('   ⚠️  Some table subscriptions failed - check RLS policies');
  }
  
  if (totalEvents === 0) {
    console.log('   ⚠️  No real-time events received - check database triggers');
  }
  
  if (testResults.errors.length === 0 && totalEvents > 0) {
    console.log('   🎉 Real-time system is working perfectly!');
  }
}

async function runRealtimeTests() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  console.log('Starting comprehensive real-time testing...\n');
  
  try {
    // Create test clients
    const clients = await createTestClients();
    
    // Test basic connection
    const connectionWorking = await testBasicRealtimeConnection(clients.subscriber);
    
    if (!connectionWorking) {
      console.log('❌ Basic real-time connection failed. Aborting further tests.');
      return;
    }
    
    // Test custom channels
    await testCustomChannels(clients.subscriber);
    
    // Test database table subscriptions and events
    console.log('\n2. Testing Database Table Subscriptions...');
    
    for (const tableName of tables) {
      await testTableRealtimeEvents(clients.publisher, clients.subscriber, tableName);
    }
    
    // Wait for final events to be processed
    console.log('\n⏳ Waiting for final events to be processed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Generate comprehensive report
    await generateRealtimeReport();
    
    console.log('\n🏁 Real-time testing completed!');
    
    // Exit process since we have active WebSocket connections
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Real-time testing failed:', error);
    testResults.errors.push(`Testing failed: ${error.message}`);
    process.exit(1);
  }
}

runRealtimeTests();