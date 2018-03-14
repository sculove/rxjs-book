import AutoComplete from "./autocomplete.js";
import Map from "./map.js";
import Sidebar from "./sidebar.js";

const search = new AutoComplete(
    document.querySelector(".autocomplete")
);

const map = new Map(
    document.querySelector(".map")
);

const sidebar = new Sidebar(
    document.querySelector(".stations"),
    map
)
