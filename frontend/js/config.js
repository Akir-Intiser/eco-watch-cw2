const CONFIG = {
  LOCAL_API_BASE_URL: "http://localhost:3000",
  PRODUCTION_API_BASE_URL: "https://eco-watch-api-50373.azurewebsites.net",

  get API_BASE_URL() {
    const isLocalFile = window.location.protocol === "file:";
    const isLocalHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalFile || isLocalHost) {
      return this.LOCAL_API_BASE_URL;
    }

    return this.PRODUCTION_API_BASE_URL;
  }
};