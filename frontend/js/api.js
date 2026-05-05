const API = {
  sightingsUrl: `${CONFIG.API_BASE_URL}/api/sightings`,

  async getSightings() {
    const response = await fetch(this.sightingsUrl);

    if (!response.ok) {
      throw new Error("Failed to load reports");
    }

    return response.json();
  },

  async register(username, email, password) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    return data;
  },

  async login(email, password) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    return data;
  },

  async createSighting(formData) {
    const response = await fetch(this.sightingsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.token}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create report");
    }

    return data;
  },

  async updateSighting(id, formData) {
    const response = await fetch(`${this.sightingsUrl}/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${state.token}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update report");
    }

    return data;
  },

  async deleteSighting(id) {
    const response = await fetch(`${this.sightingsUrl}/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${state.token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete report");
    }

    return data;
  }
};