const UI = {
  elements: {},

  init() {
    this.elements = {
      sectionButtons: document.querySelectorAll("[data-section]"),
      navLinks: document.querySelectorAll(".nav-link"),
      landingHero: document.getElementById("landingHero"),
      toastContainer: document.getElementById("toastContainer"),

      sections: {
        dashboard: document.getElementById("dashboardSection"),
        report: document.getElementById("reportSection"),
        myReports: document.getElementById("myReportsSection"),
        account: document.getElementById("accountSection")
      },

      authForms: document.getElementById("authForms"),
      loggedInPanel: document.getElementById("loggedInPanel"),
      currentUserDisplay: document.getElementById("currentUserDisplay"),
      currentUserEmail: document.getElementById("currentUserEmail"),
      navUserStatus: document.getElementById("navUserStatus"),
      authMessage: document.getElementById("authMessage"),

      sightingForm: document.getElementById("sightingForm"),
      sightingIdInput: document.getElementById("sightingId"),
      titleInput: document.getElementById("title"),
      categoryInput: document.getElementById("category"),
      statusInput: document.getElementById("status"),
      locationInput: document.getElementById("location"),
      descriptionInput: document.getElementById("description"),
      imageFileInput: document.getElementById("imageFile"),
      imagePreviewBox: document.getElementById("imagePreviewBox"),
      submitButton: document.getElementById("submitButton"),
      cancelEditButton: document.getElementById("cancelEditButton"),
      loginRequiredNotice: document.getElementById("loginRequiredNotice"),

      sightingsList: document.getElementById("sightingsList"),
      myReportsList: document.getElementById("myReportsList"),

      searchInput: document.getElementById("searchInput"),
      categoryFilter: document.getElementById("categoryFilter"),
      scopeFilter: document.getElementById("scopeFilter"),
      sortFilter: document.getElementById("sortFilter"),
      clearFiltersButton: document.getElementById("clearFiltersButton"),

      totalReportsStat: document.getElementById("totalReportsStat"),
      pollutionReportsStat: document.getElementById("pollutionReportsStat"),
      wildlifeReportsStat: document.getElementById("wildlifeReportsStat"),
      myReportsStat: document.getElementById("myReportsStat"),

      reportModal: document.getElementById("reportModal"),
      closeReportModalButton: document.getElementById("closeReportModalButton"),
      modalImageBox: document.getElementById("modalImageBox"),
      modalCategory: document.getElementById("modalCategory"),
      modalStatus: document.getElementById("modalStatus"),
      modalOwnerBadge: document.getElementById("modalOwnerBadge"),
      modalTitle: document.getElementById("modalTitle"),
      modalLocation: document.getElementById("modalLocation"),
      modalReporter: document.getElementById("modalReporter"),
      modalCreatedDate: document.getElementById("modalCreatedDate"),
      modalUpdatedDate: document.getElementById("modalUpdatedDate"),
      modalDescription: document.getElementById("modalDescription"),
      modalActions: document.getElementById("modalActions")
    };
  },

  getStatusClass(status) {
    if (status === "Resolved") {
      return "status-pill status-resolved";
    }

    if (status === "In Review") {
      return "status-pill status-review";
    }

    return "status-pill status-open";
  },

  showSection(sectionName) {
    Object.values(this.elements.sections).forEach((section) => {
      section.classList.remove("active-section");
    });

    this.elements.sections[sectionName].classList.add("active-section");

    this.elements.navLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.section === sectionName);
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  },

  updateAuthUI() {
    if (state.currentUser && state.token) {
      this.elements.authForms.classList.add("hidden");
      this.elements.loggedInPanel.classList.remove("hidden");

      this.elements.currentUserDisplay.textContent = state.currentUser.username;
      this.elements.currentUserEmail.textContent = state.currentUser.email;
      this.elements.navUserStatus.textContent = state.currentUser.username;

      this.elements.loginRequiredNotice.classList.add("hidden");
      this.elements.sightingForm.classList.remove("form-disabled");
      this.elements.landingHero.classList.add("hidden");
    } else {
      this.elements.authForms.classList.remove("hidden");
      this.elements.loggedInPanel.classList.add("hidden");

      this.elements.navUserStatus.textContent = "Guest";

      this.elements.loginRequiredNotice.classList.remove("hidden");
      this.elements.sightingForm.classList.add("form-disabled");
      this.elements.landingHero.classList.remove("hidden");
    }
  },

  showAuthMessage(message, type = "info") {
    this.elements.authMessage.textContent = message;
    this.elements.authMessage.className = `message ${type}`;
  },

  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-hide");
    }, 2600);

    setTimeout(() => {
      toast.remove();
    }, 3200);
  },

  clearDashboardFilters() {
    this.elements.searchInput.value = "";
    this.elements.categoryFilter.value = "All";
    this.elements.scopeFilter.value = "All";
    this.elements.sortFilter.value = "Newest";
  },

  formatDate(value) {
    if (!value) {
      return "Date unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  },

  escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  resetForm() {
    this.elements.sightingForm.reset();
    this.elements.sightingIdInput.value = "";

    if (this.elements.statusInput) {
      this.elements.statusInput.value = "Open";
    }

    this.elements.submitButton.textContent = "Submit Report";
    this.elements.cancelEditButton.classList.add("hidden");
    this.resetImagePreview();
  },

  resetImagePreview() {
    this.elements.imagePreviewBox.innerHTML = `<span>No image selected</span>`;
  },

  showImagePreview(file) {
    if (!file) {
      this.resetImagePreview();
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    this.elements.imagePreviewBox.innerHTML = `
      <img src="${imageUrl}" alt="Selected preview" />
    `;
  },

  openReportModal(sighting) {
    if (!sighting) {
      return;
    }

    const safeTitle = this.escapeHtml(sighting.title);
    const safeCategory = this.escapeHtml(sighting.category);
    const safeStatus = this.escapeHtml(sighting.status || "Open");
    const safeLocation = this.escapeHtml(sighting.location);
    const safeDescription = this.escapeHtml(sighting.description);
    const safeOwnerUsername = this.escapeHtml(sighting.ownerUsername || "Community user");
    const safeImageUrl = this.escapeHtml(sighting.imageUrl || "");

    const isOwner = state.currentUser && sighting.ownerId === state.currentUser.id;

    this.elements.modalTitle.textContent = safeTitle;
    this.elements.modalCategory.textContent = safeCategory;

    if (this.elements.modalStatus) {
      this.elements.modalStatus.textContent = safeStatus;
      this.elements.modalStatus.className = this.getStatusClass(safeStatus);
    }

    this.elements.modalLocation.textContent = safeLocation;
    this.elements.modalReporter.textContent = safeOwnerUsername;
    this.elements.modalCreatedDate.textContent = this.formatDate(sighting.createdAt);
    this.elements.modalUpdatedDate.textContent = sighting.updatedAt
      ? this.formatDate(sighting.updatedAt)
      : "Not updated";
    this.elements.modalDescription.textContent = safeDescription;

    this.elements.modalOwnerBadge.textContent = isOwner ? "Your report" : "Public";
    this.elements.modalOwnerBadge.className = isOwner ? "owner-pill" : "public-pill";

    this.elements.modalImageBox.innerHTML = safeImageUrl
      ? `<img src="${safeImageUrl}" alt="${safeTitle}" />`
      : `<span>No photo attached</span>`;

    this.elements.modalActions.innerHTML = isOwner
      ? `
        <button type="button" class="primary-button" onclick="Sightings.startEdit('${sighting.id}'); UI.closeReportModal();">
          Edit Report
        </button>
        <button type="button" class="delete-button modal-delete-button" onclick="Sightings.delete('${sighting.id}')">
          Delete Report
        </button>
      `
      : `
        <div class="locked-message">
          This is a public report. Only the uploader can edit or delete it.
        </div>
      `;

    this.elements.reportModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  },

  closeReportModal() {
    this.elements.reportModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  },

  confirmDelete(sighting) {
    return new Promise((resolve) => {
      const safeTitle = this.escapeHtml(sighting.title || "this report");
      const safeLocation = this.escapeHtml(sighting.location || "Unknown location");

      const overlay = document.createElement("div");

      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.zIndex = "9999";
      overlay.style.background = "rgba(13, 36, 23, 0.76)";
      overlay.style.backdropFilter = "blur(10px)";
      overlay.style.display = "grid";
      overlay.style.placeItems = "center";
      overlay.style.padding = "24px";

      overlay.innerHTML = `
        <div style="
          width: min(520px, 100%);
          background: #ffffff;
          border-radius: 28px;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.38);
          padding: 28px;
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 18px;
          font-family: Arial, Helvetica, sans-serif;
        ">
          <div style="
            width: 56px;
            height: 56px;
            border-radius: 18px;
            display: grid;
            place-items: center;
            background: #fee2e2;
            color: #b91c1c;
            font-size: 30px;
            font-weight: 900;
          ">!</div>

          <div>
            <p style="
              margin: 0 0 8px;
              color: #16a34a;
              text-transform: uppercase;
              letter-spacing: 1.6px;
              font-size: 12px;
              font-weight: 900;
            ">Delete report</p>

            <h2 style="
              margin: 0 0 10px;
              font-size: 30px;
              color: #0d2417;
            ">Are you sure?</h2>

            <p style="
              margin: 0;
              color: #374151;
              line-height: 1.7;
              font-size: 16px;
            ">
              You are about to permanently delete <strong>${safeTitle}</strong>
              from <strong>${safeLocation}</strong>. This action cannot be undone.
            </p>

            <div style="
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
              margin-top: 20px;
            ">
              <button type="button" data-action="cancel" style="
                border: 1px solid #dfe7dd;
                border-radius: 999px;
                padding: 13px 18px;
                font-weight: 900;
                background: #ffffff;
                color: #14532d;
                cursor: pointer;
              ">
                Cancel
              </button>

              <button type="button" data-action="confirm" style="
                border: none;
                border-radius: 999px;
                padding: 13px 18px;
                font-weight: 900;
                background: #dc2626;
                color: #ffffff;
                cursor: pointer;
              ">
                Delete Report
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";

      overlay.addEventListener("click", (event) => {
        const action = event.target.dataset.action;

        if (event.target === overlay || action === "cancel") {
          overlay.remove();
          document.body.style.overflow = "";
          resolve(false);
        }

        if (action === "confirm") {
          overlay.remove();
          document.body.style.overflow = "";
          resolve(true);
        }
      });
    });
  }
};