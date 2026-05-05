const Auth = {
  async register(event) {
    event.preventDefault();

    const usernameInput = document.getElementById("registerUsername");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");

    try {
      const data = await API.register(
        usernameInput.value.trim(),
        emailInput.value.trim(),
        passwordInput.value
      );

      setAuth(data);

      event.target.reset();
      UI.updateAuthUI();
      UI.showAuthMessage("Account created successfully.", "success");
      UI.showToast("Account created successfully.", "success");

      await Sightings.load();
      UI.showSection("dashboard");
    } catch (error) {
      UI.showAuthMessage(error.message, "error");
      UI.showToast(error.message, "error");
    }
  },

  async login(event) {
    event.preventDefault();

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    try {
      const data = await API.login(
        emailInput.value.trim(),
        passwordInput.value
      );

      setAuth(data);

      event.target.reset();
      UI.updateAuthUI();
      UI.showAuthMessage("Login successful.", "success");
      UI.showToast("Welcome back.", "success");

      await Sightings.load();
      UI.showSection("dashboard");
    } catch (error) {
      UI.showAuthMessage(error.message, "error");
      UI.showToast(error.message, "error");
    }
  },

  logout() {
    clearAuthState();

    UI.resetForm();
    UI.updateAuthUI();
    UI.showAuthMessage("Logged out successfully.", "info");
    UI.showToast("Logged out successfully.", "info");

    Sightings.renderAll();
    UI.showSection("dashboard");
  }
};