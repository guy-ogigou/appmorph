import Appmorph, { createStaticAuthAdapter } from "@appmorph/sdk";

console.log("Appmorph module loaded:", Appmorph);

/**
 * Determine the API endpoint based on the current environment.
 * - In Vite dev mode (port 3000), use empty string (proxy handles it)
 * - When served from deploy server (port 3003), use the API server URL
 */
function getApiEndpoint(): string {
  const port = window.location.port;
  // If running on port 3003 (deploy server), point to API server
  if (port === "3003") {
    return "http://localhost:3002";
  }
  // Otherwise use relative URLs (Vite proxy or same origin)
  return "";
}

export function initAppmorph() {
  console.log("initAppmorph called");

  try {
    // Create a simple auth adapter for demo purposes
    const authAdapter = createStaticAuthAdapter(
      {
        userId: "demo-user",
        groupIds: ["demo-group"],
        tenantId: "demo-tenant",
        roles: ["user"],
      },
      "demo-token",
    );

    console.log("Auth adapter created:", authAdapter);

    // Initialize the SDK
    const endpoint = getApiEndpoint();
    console.log("Calling Appmorph.init with endpoint:", endpoint);

    Appmorph.init({
      endpoint,
      auth: authAdapter,
      position: "bottom-right",
      theme: "dark",
      buttonLabel: "Customize",
    });

    console.log("Appmorph SDK initialized successfully");
    console.log("Check for #appmorph-container:", document.getElementById("appmorph-container"));
  } catch (error) {
    console.error("Failed to initialize Appmorph SDK:", error);
  }
}
