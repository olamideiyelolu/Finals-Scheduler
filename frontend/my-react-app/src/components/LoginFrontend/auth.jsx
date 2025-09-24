export function signOut() {
    // Clear tokens and any user-related info
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("resource_owner");
    // Optionally clear in-memory variables if needed
    window.access_token = null;
    // You may also redirect to the login page or update state
  }

  