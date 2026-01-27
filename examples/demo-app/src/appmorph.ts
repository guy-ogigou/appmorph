import Appmorph, { createStaticAuthAdapter } from '@appmorph/sdk';

console.log('Appmorph module loaded:', Appmorph);

export function initAppmorph() {
  console.log('initAppmorph called');

  try {
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

    console.log('Auth adapter created:', authAdapter);

    // Initialize the SDK
    // Use empty string for endpoint to use relative URLs (proxied via vite in dev)
    console.log('Calling Appmorph.init...');

    Appmorph.init({
      endpoint: '',
      auth: authAdapter,
      position: 'bottom-right',
      theme: 'auto',
      buttonLabel: 'Customize',
    });

    console.log('Appmorph SDK initialized successfully');
    console.log('Check for #appmorph-container:', document.getElementById('appmorph-container'));
  } catch (error) {
    console.error('Failed to initialize Appmorph SDK:', error);
  }
}
