import { getMockNearbyUsers } from './src/utils/mockNearbyUsers';

// Simple Test Runner Log
console.log('--- Running Tests for Mock Nearby Users ---');

console.log('1. User1 joins at (12.0, 77.0)');
const res1 = getMockNearbyUsers(12.0, 77.0, 10, 'user1');
console.log('Result length (fake users might be added):', res1.length);
console.log('User1 is NOT contained in their own nearby list:', !res1.some(u => u.id === 'user1') ? '✅ PASS' : '❌ FAIL');

console.log('\n2. User2 joins at (12.01, 77.01) [Nearby User1]');
const res2 = getMockNearbyUsers(12.01, 77.01, 10, 'user2');
console.log('User2 sees User1:', res2.some(u => u.id === 'user1') ? '✅ PASS' : '❌ FAIL');

console.log('\n3. User3 joins at (15.0, 80.0) [Far Away]');
const res3 = getMockNearbyUsers(15.0, 80.0, 10, 'user3');
console.log('User3 sees User1?:', res3.some(u => u.id === 'user1') ? '❌ FAIL' : '✅ PASS');

console.log('\n4. Active tracking ensures fake active users are added to simulate the demo network.');
console.log('Total mock data visible to User1 now:', getMockNearbyUsers(12.0, 77.0, 50, 'user1').length, 'users');

console.log('\n--- All Tests Execution Finished ---');