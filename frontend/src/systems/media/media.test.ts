import {afterEach,expect,it,vi} from "vitest";
import {imageTypes,markdownImage,mediaId,mediaIdsInMarkdown,mediaUrl,uploadImage,validateImage} from "./media";
const id="123e4567-e89b-12d3-a456-426614174000";
afterEach(()=>vi.unstubAllGlobals());
it("accepts only canonical owned-media references",()=>{
 expect(mediaUrl(id)).toBe(`/api/media/${id}`);expect(mediaId(`/api/media/${id}`)).toBe(id);
 for(const value of ["https://example.com/image.png",`//example.com/${id}`,`/api/media/${id}?token=x`,`/api/media/${id}/extra`,"data:image/png;base64,eA=="])expect(mediaUrl(value)).toBe("");
});
it("validates file type and size in one place",()=>{
 imageTypes.forEach(type=>expect(()=>validateImage({type,size:10})).not.toThrow());
 for(const file of [{type:"image/svg+xml",size:10},{type:"image/png",size:0},{type:"image/png",size:8*1024*1024+1}])expect(()=>validateImage(file)).toThrow();
});
it("uploads privately and rejects mismatched server IDs and URLs",async()=>{
 const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({id,url:`/api/media/${id}`})});vi.stubGlobal("fetch",fetch);
 const file=new File(["png"],"private.png",{type:"image/png"});
 await expect(uploadImage(file)).resolves.toEqual({id,url:`/api/media/${id}`});
 expect(fetch).toHaveBeenCalledWith("/api/media",expect.objectContaining({method:"POST",credentials:"same-origin",body:file,headers:{"Content-Type":"image/png"}}));
 fetch.mockResolvedValue({ok:true,json:async()=>({id,url:"https://example.com/tracker"})});await expect(uploadImage(file)).rejects.toThrow();
});
it("extracts unique references and escapes uploaded filenames in Markdown",()=>{
 expect(mediaIdsInMarkdown(`![one](/api/media/${id}) ![two](/api/media/${id}) /api/media/not-an-id`)).toEqual([id]);
 expect(markdownImage("[picture]\\\n.png",`/api/media/${id}`)).toBe(`![picture.png](/api/media/${id})`);
});
