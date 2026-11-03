import {expect,it} from "vitest";
import {navigationCatalog,navigationItems} from "./navigation";
import {iconCatalog} from "./catalog";
it("uses a different locally available Iconify icon for every sidebar destination",()=>{
 expect(new Set(navigationCatalog.map(item=>item.icon)).size).toBe(navigationCatalog.length);
 for(const item of navigationCatalog)expect(iconCatalog.some(icon=>icon.id===item.icon),item.to).toBe(true);
 const extras=["lifecycle:mark","tabler:menu","tabler:x","tabler:settings","tabler:logout"];
 for(const item of navigationCatalog)expect(extras).not.toContain(item.icon);
 expect(new Set(navigationItems(false).map(item=>item.icon)).size).toBe(navigationItems(false).length);
});
