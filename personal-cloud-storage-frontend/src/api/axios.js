import axios from "axios";

const api = axios.create({
  baseURL: "https://personal-cloud-storage-1-r52f.onrender.com/api",
});

export default api;