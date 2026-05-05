const state = {
  sightings: [],
  currentUser: getStoredUser(),
  token: localStorage.getItem("ecoWatchToken")
};

function getStoredUser() {
  const storedUser = localStorage.getItem("ecoWatchUser");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return null;
  }
}

function setAuth(authData) {
  state.token = authData.token;
  state.currentUser = authData.user;

  localStorage.setItem("ecoWatchToken", state.token);
  localStorage.setItem("ecoWatchUser", JSON.stringify(state.currentUser));
}

function clearAuthState() {
  state.token = null;
  state.currentUser = null;

  localStorage.removeItem("ecoWatchToken");
  localStorage.removeItem("ecoWatchUser");
}