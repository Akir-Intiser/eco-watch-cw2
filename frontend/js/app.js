document.addEventListener("DOMContentLoaded", () => {
  UI.init();
  UI.updateAuthUI();

  UI.elements.sectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      UI.showSection(button.dataset.section);
    });
  });

  document.getElementById("registerForm").addEventListener("submit", Auth.register);
  document.getElementById("loginForm").addEventListener("submit", Auth.login);
  document.getElementById("logoutButton").addEventListener("click", Auth.logout);

  UI.elements.sightingForm.addEventListener("submit", (event) => {
    Sightings.submit(event);
  });

  UI.elements.cancelEditButton.addEventListener("click", () => {
    UI.resetForm();
  });

  UI.elements.searchInput.addEventListener("input", () => {
    Sightings.renderDashboard();
  });

  UI.elements.categoryFilter.addEventListener("change", () => {
    Sightings.renderDashboard();
  });

  UI.elements.scopeFilter.addEventListener("change", () => {
    Sightings.renderDashboard();
  });

  UI.elements.sortFilter.addEventListener("change", () => {
    Sightings.renderDashboard();
  });

  UI.elements.clearFiltersButton.addEventListener("click", () => {
    UI.clearDashboardFilters();
    Sightings.renderDashboard();
    UI.showToast("Filters cleared.", "info");
  });

  UI.elements.imageFileInput.addEventListener("change", () => {
    const file = UI.elements.imageFileInput.files[0];
    UI.showImagePreview(file);
  });

  document.addEventListener("click", (event) => {
    if (event.target.id === "closeReportModalButton") {
      UI.closeReportModal();
    }

    if (event.target.id === "reportModal") {
      UI.closeReportModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      UI.closeReportModal();
    }
  });

  Sightings.load();
});