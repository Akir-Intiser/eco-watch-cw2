const Sightings = {
  async load() {
    try {
      UI.elements.sightingsList.innerHTML = `<p class="empty-message">Loading reports...</p>`;

      state.sightings = await API.getSightings();

      this.renderAll();
    } catch (error) {
      UI.elements.sightingsList.innerHTML = `
        <p class="empty-message">
          Could not load reports. Please check the API connection.
        </p>
      `;
      UI.showToast("Could not load reports.", "error");
      console.error(error);
    }
  },

  renderAll() {
    this.renderStats();
    this.renderDashboard();
    this.renderMyReports();
  },

  renderStats() {
    const myReports = state.currentUser
      ? state.sightings.filter((sighting) => sighting.ownerId === state.currentUser.id).length
      : 0;

    UI.elements.totalReportsStat.textContent = state.sightings.length;
    UI.elements.pollutionReportsStat.textContent = state.sightings.filter((sighting) => sighting.category === "Pollution").length;
    UI.elements.wildlifeReportsStat.textContent = state.sightings.filter((sighting) => sighting.category === "Wildlife").length;
    UI.elements.myReportsStat.textContent = myReports;
  },

  getFilteredSightings() {
    const searchValue = UI.elements.searchInput.value.trim().toLowerCase();
    const categoryValue = UI.elements.categoryFilter.value;
    const scopeValue = UI.elements.scopeFilter.value;
    const sortValue = UI.elements.sortFilter.value;

    const filtered = state.sightings.filter((sighting) => {
      const title = String(sighting.title || "").toLowerCase();
      const location = String(sighting.location || "").toLowerCase();
      const description = String(sighting.description || "").toLowerCase();
      const status = String(sighting.status || "Open").toLowerCase();

      const matchesSearch =
        !searchValue ||
        title.includes(searchValue) ||
        location.includes(searchValue) ||
        description.includes(searchValue) ||
        status.includes(searchValue);

      const matchesCategory =
        categoryValue === "All" || sighting.category === categoryValue;

      const matchesScope =
        scopeValue === "All" ||
        (scopeValue === "Mine" && state.currentUser && sighting.ownerId === state.currentUser.id);

      return matchesSearch && matchesCategory && matchesScope;
    });

    return filtered.sort((a, b) => {
      if (sortValue === "Oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }

      if (sortValue === "Category") {
        return String(a.category || "").localeCompare(String(b.category || ""));
      }

      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  },

  renderDashboard() {
    const filteredSightings = this.getFilteredSightings();

    if (filteredSightings.length === 0) {
      UI.elements.sightingsList.innerHTML = `<p class="empty-message">No reports match your search or filters.</p>`;
      return;
    }

    UI.elements.sightingsList.innerHTML = filteredSightings
      .map((sighting) => this.createCardHtml(sighting))
      .join("");
  },

  renderMyReports() {
    if (!state.currentUser) {
      UI.elements.myReportsList.innerHTML = `<p class="empty-message">Login to view reports uploaded by your account.</p>`;
      return;
    }

    const myReports = state.sightings
      .filter((sighting) => sighting.ownerId === state.currentUser.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (myReports.length === 0) {
      UI.elements.myReportsList.innerHTML = `<p class="empty-message">You have not uploaded any reports yet.</p>`;
      return;
    }

    UI.elements.myReportsList.innerHTML = myReports
      .map((sighting) => this.createCardHtml(sighting))
      .join("");
  },

  createCardHtml(sighting) {
    const safeTitle = UI.escapeHtml(sighting.title);
    const safeCategory = UI.escapeHtml(sighting.category);
    const safeStatus = UI.escapeHtml(sighting.status || "Open");
    const safeLocation = UI.escapeHtml(sighting.location);
    const safeDescription = UI.escapeHtml(sighting.description);
    const safeImageUrl = UI.escapeHtml(sighting.imageUrl || "");
    const safeOwnerUsername = UI.escapeHtml(sighting.ownerUsername || "Community user");
    const safeCreatedDate = UI.formatDate(sighting.createdAt);
    const safeUpdatedDate = sighting.updatedAt ? UI.formatDate(sighting.updatedAt) : "";

    const isOwner = state.currentUser && sighting.ownerId === state.currentUser.id;

    const imageHtml = safeImageUrl
      ? `<img class="report-image" src="${safeImageUrl}" alt="${safeTitle}" />`
      : `<div class="image-placeholder">No photo attached</div>`;

    const dateLine = safeUpdatedDate
      ? `Created ${safeCreatedDate} · Updated ${safeUpdatedDate}`
      : `Created ${safeCreatedDate}`;

    const ownerActionsHtml = isOwner
      ? `
        <button type="button" onclick="Sightings.startEdit('${sighting.id}')">Edit</button>
        <button type="button" class="delete-button" onclick="Sightings.delete('${sighting.id}')">Delete</button>
      `
      : "";

    return `
      <article class="report-card">
        ${imageHtml}

        <div class="report-body">
          <div class="report-topline">
            <span class="category-pill">${safeCategory}</span>
            <span class="${UI.getStatusClass(safeStatus)}">${safeStatus}</span>
            ${isOwner ? `<span class="owner-pill">Your report</span>` : `<span class="public-pill">Public</span>`}
          </div>

          <h3>${safeTitle}</h3>
          <p class="location-line">📍 ${safeLocation}</p>
          <p class="date-line">🗓️ ${dateLine}</p>
          <p class="description-line">${safeDescription}</p>
          <p class="owner-line">Reported by ${safeOwnerUsername}</p>

          <div class="card-actions">
            <button type="button" class="secondary-button" onclick="Sightings.openDetails('${sighting.id}')">
              View Details
            </button>
            ${ownerActionsHtml}
          </div>
        </div>
      </article>
    `;
  },

  openDetails(id) {
    const sighting = state.sightings.find((item) => item.id === id);

    if (!sighting) {
      UI.showToast("Report not found.", "error");
      return;
    }

    UI.openReportModal(sighting);
  },

  buildFormData() {
    const formData = new FormData();

    formData.append("title", UI.elements.titleInput.value.trim());
    formData.append("category", UI.elements.categoryInput.value);
    formData.append("status", UI.elements.statusInput.value);
    formData.append("location", UI.elements.locationInput.value.trim());
    formData.append("description", UI.elements.descriptionInput.value.trim());

    if (UI.elements.imageFileInput.files.length > 0) {
      formData.append("image", UI.elements.imageFileInput.files[0]);
    }

    return formData;
  },

  async submit(event) {
    event.preventDefault();

    if (!state.currentUser || !state.token) {
      UI.showToast("Please login before uploading a report.", "error");
      UI.showSection("account");
      return;
    }

    const formData = this.buildFormData();
    const editingId = UI.elements.sightingIdInput.value;

    try {
      UI.elements.submitButton.disabled = true;
      UI.elements.submitButton.textContent = editingId ? "Updating..." : "Submitting...";

      if (editingId) {
        await API.updateSighting(editingId, formData);
        UI.showToast("Report updated successfully.", "success");
      } else {
        await API.createSighting(formData);
        UI.showToast("Report submitted successfully.", "success");
      }

      UI.resetForm();
      await this.load();
      UI.showSection("dashboard");
    } catch (error) {
      UI.showToast(error.message, "error");
      console.error(error);
    } finally {
      UI.elements.submitButton.disabled = false;
      UI.elements.submitButton.textContent = "Submit Report";
    }
  },

  startEdit(id) {
    const sighting = state.sightings.find((item) => item.id === id);

    if (!sighting) {
      return;
    }

    if (!state.currentUser || sighting.ownerId !== state.currentUser.id) {
      UI.showToast("You can only edit reports that you uploaded.", "error");
      return;
    }

    UI.elements.sightingIdInput.value = sighting.id;
    UI.elements.titleInput.value = sighting.title;
    UI.elements.categoryInput.value = sighting.category;
    UI.elements.statusInput.value = sighting.status || "Open";
    UI.elements.locationInput.value = sighting.location;
    UI.elements.descriptionInput.value = sighting.description;

    UI.elements.submitButton.textContent = "Update Report";
    UI.elements.cancelEditButton.classList.remove("hidden");

    UI.closeReportModal();
    UI.showSection("report");
  },

  async delete(id) {
    const sighting = state.sightings.find((item) => item.id === id);

    if (!sighting) {
      UI.showToast("Report not found.", "error");
      return;
    }

    if (!state.currentUser || sighting.ownerId !== state.currentUser.id) {
      UI.showToast("You can only delete reports that you uploaded.", "error");
      return;
    }

    const confirmed = await UI.confirmDelete(sighting);

    if (!confirmed) {
      return;
    }

    try {
      await API.deleteSighting(id);

      UI.closeReportModal();
      UI.resetForm();
      await this.load();
      UI.showToast("Report deleted successfully.", "success");
    } catch (error) {
      UI.showToast(error.message, "error");
      console.error(error);
    }
  }
};