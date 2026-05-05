const API_URL = "http://localhost:3000/api/sightings";

const sightingForm = document.getElementById("sightingForm");
const sightingIdInput = document.getElementById("sightingId");
const titleInput = document.getElementById("title");
const categoryInput = document.getElementById("category");
const locationInput = document.getElementById("location");
const descriptionInput = document.getElementById("description");
const imageFileInput = document.getElementById("imageFile");

const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const sightingsList = document.getElementById("sightingsList");
const sightingCount = document.getElementById("sightingCount");

let sightings = [];

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadSightings() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Failed to load sightings");
    }

    sightings = await response.json();
    renderSightings();
  } catch (error) {
    sightingsList.innerHTML = `
      <p class="empty-message">
        Could not load sightings. Make sure the API is running at http://localhost:3000
      </p>
    `;
    console.error(error);
  }
}

function renderSightings() {
  sightingCount.textContent = sightings.length;

  if (sightings.length === 0) {
    sightingsList.innerHTML = `<p class="empty-message">No sightings added yet.</p>`;
    return;
  }

  sightingsList.innerHTML = sightings
    .map((sighting) => {
      const safeTitle = escapeHtml(sighting.title);
      const safeCategory = escapeHtml(sighting.category);
      const safeLocation = escapeHtml(sighting.location);
      const safeDescription = escapeHtml(sighting.description);
      const safeImageUrl = escapeHtml(sighting.imageUrl || "");

      const imageHtml = safeImageUrl
        ? `<img class="sighting-image" src="${safeImageUrl}" alt="${safeTitle}" />`
        : "";

      return `
        <article class="sighting-card">
          <h3>${safeTitle}</h3>

          <div class="sighting-meta">
            <span class="tag">${safeCategory}</span>
            <span class="tag">${safeLocation}</span>
          </div>

          <p>${safeDescription}</p>

          ${imageHtml}

          <div class="card-actions">
            <button type="button" onclick="startEdit('${sighting.id}')">Edit</button>
            <button type="button" class="delete-button" onclick="deleteSighting('${sighting.id}')">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function resetForm() {
  sightingForm.reset();
  sightingIdInput.value = "";
  submitButton.textContent = "Add Sighting";
  cancelEditButton.classList.add("hidden");
}

function buildFormData() {
  const formData = new FormData();

  formData.append("title", titleInput.value.trim());
  formData.append("category", categoryInput.value);
  formData.append("location", locationInput.value.trim());
  formData.append("description", descriptionInput.value.trim());

  if (imageFileInput.files.length > 0) {
    formData.append("image", imageFileInput.files[0]);
  }

  return formData;
}

async function createSighting(formData) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Failed to create sighting");
  }
}

async function updateSighting(id, formData) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Failed to update sighting");
  }
}

function startEdit(id) {
  const sighting = sightings.find((item) => item.id === id);

  if (!sighting) {
    return;
  }

  sightingIdInput.value = sighting.id;
  titleInput.value = sighting.title;
  categoryInput.value = sighting.category;
  locationInput.value = sighting.location;
  descriptionInput.value = sighting.description;

  submitButton.textContent = "Update Sighting";
  cancelEditButton.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function deleteSighting(id) {
  const confirmed = confirm("Are you sure you want to delete this sighting?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Failed to delete sighting");
    }

    resetForm();
    await loadSightings();
  } catch (error) {
    alert("Could not delete sighting. Check that the API is running.");
    console.error(error);
  }
}

sightingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = buildFormData();
  const editingId = sightingIdInput.value;

  try {
    if (editingId) {
      await updateSighting(editingId, formData);
    } else {
      await createSighting(formData);
    }

    resetForm();
    await loadSightings();
  } catch (error) {
    alert("Could not save sighting. Check that the API is running.");
    console.error(error);
  }
});

cancelEditButton.addEventListener("click", () => {
  resetForm();
});

loadSightings();