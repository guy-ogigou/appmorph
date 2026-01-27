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
  // Use empty string for endpoint to use relative URLs (proxied via vite in dev)
  Appmorph.init({
    endpoint: '',
    auth: authAdapter,
    position: 'bottom-right',
    theme: 'auto',
    buttonLabel: 'Customize',
  });
}
