/**
 * @file run-all.ts
 * @description user-interface alt projesine ait tüm birim testlerini (Theme, ApiClient, ChatService)
 * sırayla içe aktarıp çalıştıran yerel test koşucusu.
 */

console.log('--- [Nexus Precision Test Suite] ---');

await import('#tests/theme.spec');
await import('#tests/apiClient.spec');
await import('#tests/chatService.spec');

console.log('--- [All Tests Executed Successfully] ---');

export {};

