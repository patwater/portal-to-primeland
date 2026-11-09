// The only module that reads the content files. Bundled at build time; never fetched at runtime.
import soul from "../../../content/SOUL.md?raw";
import characters from "../../../content/characters.md?raw";
import locations from "../../../content/locations.md?raw";
import version from "../../generated/content-version.json";
export { soul, characters, locations, version };
