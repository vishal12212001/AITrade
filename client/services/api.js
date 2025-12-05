// client/services/api.js

const API_BASE = "https://ai-trade-backend-3j8e.onrender.com"; // Correct Render Backend URL

// Helper function to get JWT token
function getToken() {
  return localStorage.getItem("token") || "";
}

export const api = {
  // POST Request
  post: async (url, data) => {
    try {
      const res = await fetch(API_BASE + url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getToken() ? `Bearer ${getToken()}` : ""
        },
        body: JSON.stringify(data)
      });

      return await res.json();
    } catch (error) {
      console.error("API POST Error:", error);
      return { error: "Request failed" };
    }
  },

  // GET Request
  get: async (url) => {
    try {
      const res = await fetch(API_BASE + url, {
        headers: {
          Authorization: getToken() ? `Bearer ${getToken()}` : ""
        }
      });

      return await res.json();
    } catch (error) {
      console.error("API GET Error:", error);
      return { error: "Request failed" };
    }
  }
};
