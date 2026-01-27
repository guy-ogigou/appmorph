import Appmorph, { createStaticAuthAdapter } from '@appmorph/sdk';

export function initAppmorph() {
  // Create a simple auth adapter for demo purposes
  const authAdapter = createStaticAuthAdapter(
    {
      userId: 'demo-user',
      groupIds: ['demo-group'],
      tenantId: 'demo-tenant',
      roles: ['user'],
    },
    'demo-token'
  );

  // Initialize the SDK
  Appmorph.init({
    endpoint: 'http://localhost:3001',
    auth: authAdapter,
    position: 'bottom-right',
    theme: 'auto',
    buttonLabel: 'Customize',
  });
}
