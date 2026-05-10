import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const CATEGORY_COLORS = {
  words: "#D66D45",
  proverbs: "#2E4A35",
  idioms: "#34597F",
  plants: "#4E7049",
  animals: "#A86237",
  places: "#755C48",
  people: "#DFA42D",
  customs: "#8C4A57",
  folklore: "#503D63",
};

export const CATEGORIES = [
  "words", "proverbs", "idioms", "plants", "animals",
  "places", "people", "customs", "folklore",
];

// Translation key for a category, looked up via t() in components
export const categoryLabelKey = (c) =>
  c === "all" ? "category_all" : `category_${c}`;
