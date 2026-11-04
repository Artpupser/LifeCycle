// The manifest is the public catalog. Regenerate bundled SVG data after updating icon packs.
import {readFile,writeFile} from "node:fs/promises";
import {URL} from "node:url";
const root=new URL("../",import.meta.url);
const read=async path=>JSON.parse(await readFile(new URL(path,root),"utf8"));
const manifest=await read("src/systems/icons/manifest.json");
for(const [pack,names] of Object.entries(manifest)){
  const source=await read(`node_modules/@iconify-json/${pack}/icons.json`);
  const icons=Object.fromEntries(names.map(name=>{const icon=source.icons[name]??source.icons[source.aliases?.[name]?.parent];if(!icon)throw new Error(`Missing icon ${pack}:${name}`);return [name,icon];}));
  const filename=pack==="tabler"?"ui-data.json":pack==="circle-flags"?"flag-data.json":pack==="twemoji"?"emoji-data.json":"brand-data.json";
  await writeFile(new URL(`src/systems/icons/${filename}`,root),JSON.stringify({width:source.width??24,height:source.height??24,icons}));
}
